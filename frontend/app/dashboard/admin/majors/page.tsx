"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, GraduationCap, Plus, Pencil, Trash2 } from "lucide-react"
import type { Major, Subject } from "@/lib/types"

interface DepartmentRef {
  id: string
  name: string
}

export default function AdminMajorsPage() {
  const router = useRouter()
  const { token } = useAuth()
  const [majors, setMajors] = useState<Major[]>([])
  const [departmentsById, setDepartmentsById] = useState<Record<string, DepartmentRef>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return

    const loadData = async () => {
      try {
        setLoading(true)
        const majorsData = await apiClient.getAllMajors(token)
        setMajors(Array.isArray(majorsData) ? majorsData : [])

        const departmentIds = new Set<string>()
        ;(Array.isArray(majorsData) ? majorsData : []).forEach((m: Major) => {
          if (m.department_id) departmentIds.add(m.department_id)
        })

        const departmentList = await Promise.all(
          Array.from(departmentIds).map((id) =>
            apiClient.getDepartmentById(id, token).catch(() => ({ id, name: "Unknown" }))
          )
        )
        setDepartmentsById(
          Object.fromEntries(departmentList.map((d: DepartmentRef) => [d.id, d]))
        )
      } catch (err) {
        console.error("Failed to load majors data", err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [token])

  const getDepartmentName = (id?: string) =>
    id && departmentsById[id] ? departmentsById[id].name : "Not assigned"

  const getSubjectNames = (major: Major) => {
    const list = major.courses ?? (major as { subjects?: Subject[] }).subjects ?? []
    if (!list.length) return "No subjects"
    return list.map((s) => s.name ?? "Unknown").join(", ")
  }

  async function handleDeleteMajor(major: Major) {
    if (!token) return
    if (!confirm(`Delete major "${major.name}"? This cannot be undone.`)) return
    try {
      await apiClient.deleteMajor(major.id, token)
      setMajors((prev) => prev.filter((m) => m.id !== major.id))
    } catch (err) {
      console.error("Failed to delete major:", err)
    }
  }

  return (
    <DashboardLayout title="Major Management">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Major Management</h1>
            <p className="text-muted-foreground">View and manage college majors</p>
          </div>
          <Button onClick={() => router.push("/dashboard/admin/majors/create/")}>
            <Plus className="mr-2 h-4 w-4" />
            Add Major
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          </div>
        ) : (majors?.length ?? 0) === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No majors found
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {majors.map((major) => (
              <Card key={major.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5" />
                      {major.name}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          router.push(`/dashboard/admin/majors/edit/${major.id}`)
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDeleteMajor(major)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="font-medium">Department</p>
                      <p className="text-muted-foreground">
                        {getDepartmentName(major.department_id)}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Subjects</p>
                      <p className="text-muted-foreground">
                        {getSubjectNames(major)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
