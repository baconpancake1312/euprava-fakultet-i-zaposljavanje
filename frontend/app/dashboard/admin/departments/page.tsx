"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter, useParams } from "next/navigation"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Building2, Plus, Pencil } from "lucide-react"
import { Major, Professor } from "@/lib/types"

interface Department {
  id: string
  name: string
  head?: string
  majors?: Major[]
  staff?: string[]
}

export default function AdminDepartmentsPage() {
  const router = useRouter()

  const { token } = useAuth()
  const [departments, setDepartments] = useState<Department[]>([])
  const [professorsById, setProfessorsById] = useState<Record<string, Professor>>({})
  const [majorsById, setMajorsById] = useState<Record<string, Major>>({})
  const [loading, setLoading] = useState(true)




  useEffect(() => {
    if (!token) return

    const loadData = async () => {
      try {
        setLoading(true)

        const departments = await apiClient.getAllDepartments(token)
        setDepartments(departments)

        const professorIds = new Set<string>()
        const majorIds = new Set<string>()

        departments.forEach((d: Department) => {
          if (d.head) professorIds.add(d.head)
          d.staff?.forEach((id: string) => professorIds.add(id))
          d.majors?.forEach((m: Major) => majorIds.add(m.id))
        })

        const professors = await Promise.all(
          Array.from(professorIds).map((id) =>
            apiClient.getProfessorById(id, token)
          )
        )

        setProfessorsById(
          Object.fromEntries(professors.map((p) => [p.id, p]))
        )

        const majors = await Promise.all(
          Array.from(majorIds).map((id) =>
            apiClient.getMajorById(id, token)
          )
        )

        setMajorsById(
          Object.fromEntries(majors.map((m) => [m.id, m]))
        )
      } catch (err) {
        console.error("Failed to load departments data", err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [token])

  const getProfessorName = (id?: string) =>
    id && professorsById[id]
      ? `${professorsById[id].first_name} ${professorsById[id].last_name}`
      : "Not assigned"

  const getMajorName = (id: string) =>
    majorsById[id]?.name ?? "Unknown major"



  return (
    <DashboardLayout title="Department Management">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Department Management</h1>
            <p className="text-muted-foreground">View and manage university departments</p>
          </div>
          <div className="grid md:grid-cols-1 gap-1">
            <Button onClick={() => router.push("/dashboard/admin/departments/create/")}>
              <Plus className="mr-2 h-4 w-4" />
              Add Department
            </Button>
          </div>

        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          </div>
        ) : (departments?.length ?? 0) === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">No departments found</CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {departments.map((department) => (
              <Card key={department.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      {department.name}
                    </CardTitle>

                    <Button
                      onClick={() =>
                        router.push(`/dashboard/admin/departments/edit/${department.id}`)
                      }
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-2 text-sm">
                    {/* Head */}
                    <div>
                      <p className="font-medium">Department Head</p>
                      <p className="text-muted-foreground">
                        {getProfessorName(department.head)}
                      </p>
                    </div>

                    {/* Majors */}
                    <div>
                      <p className="font-medium">Majors</p>
                      <p className="text-muted-foreground">
                        {department.majors?.length
                          ? department.majors
                            .map((m) => getMajorName(m.id))
                            .join(", ")
                          : "No majors"}
                      </p>
                    </div>

                    {/* Staff */}
                    <div>
                      <p className="font-medium">Staff</p>
                      <p className="text-muted-foreground">
                        {department.staff?.length
                          ? department.staff
                            .map((id) => getProfessorName(id))
                            .join(", ")
                          : "No staff"}
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
