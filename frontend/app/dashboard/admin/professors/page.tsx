"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, UserCheck, Mail, Phone, Plus, Pencil, Trash2, Building2, BookOpen } from "lucide-react"
import type { Professor, Subject } from "@/lib/types"

interface DepartmentRef {
  id: string
  name: string
  staff?: string[]
}

export default function AdminProfessorsPage() {
  const router = useRouter()
  const { token } = useAuth()
  const [professors, setProfessors] = useState<Professor[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [departments, setDepartments] = useState<DepartmentRef[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      loadProfessors()
    }
  }, [token])

  const loadProfessors = async () => {
    try {
      const authToken: string = token!
      const [professorsData, subjectsData, departmentsData] = await Promise.all([
        apiClient.getAllProfessors(authToken),
        apiClient.getAllSubjects(authToken),
        apiClient.getAllDepartments(authToken),
      ])
      
      setProfessors(Array.isArray(professorsData) ? professorsData : [])
      setSubjects(Array.isArray(subjectsData) ? subjectsData : [])
      setDepartments(
        Array.isArray(departmentsData)
          ? departmentsData.map((d: { id: string; name: string; staff?: string[] }) => ({
              id: d.id,
              name: d.name,
              staff: Array.isArray(d.staff) ? d.staff : [],
            }))
          : []
      )
    } catch (error) {
      console.error("Failed to load professors:", error)
    } finally {
      setLoading(false)
    }
  }

  const getProfessorSubjects = (professorId: string): Subject[] => {
    return subjects.filter((s) => s.professor_id === professorId)
  }

  const getProfessorDepartments = (professorId: string): DepartmentRef[] => {
    return departments.filter((d) => d.staff?.includes(professorId))
  }

  const handleDeleteProfessor = async (professor: Professor) => {
    if (!token) return
    if (!confirm(`Delete professor "${professor.first_name} ${professor.last_name}"? This cannot be undone.`)) {
      return
    }
    try {
      await apiClient.deleteProfessor(professor.id, token)
      setProfessors((prev) => prev.filter((p) => p.id !== professor.id))
    } catch (error) {
      console.error("Failed to delete professor:", error)
    }
  }

  return (
    <DashboardLayout title="Professor Management">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Professor Management</h1>
            <p className="text-muted-foreground">View and manage all professors</p>
          </div>
          <Button onClick={() => router.push("/dashboard/admin/professors/create")}>
            <Plus className="mr-2 h-4 w-4" />
            Add Professor
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          </div>
        ) : professors.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No professors found
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {professors.map((professor) => (
              <Card key={professor.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <UserCheck className="h-5 w-5" />
                        {professor.first_name} {professor.last_name}
                      </CardTitle>
                      <CardDescription>Professor ID: {professor.id}</CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          router.push(`/dashboard/admin/professors/edit/${professor.id}`)
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDeleteProfessor(professor)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{professor.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{professor.phone}</span>
                    </div>
                    {professor.office && (
                      <div>
                        <p className="font-medium">Office</p>
                        <p className="text-muted-foreground">{professor.office}</p>
                      </div>
                    )}
                    {(() => {
                      const professorSubjects = getProfessorSubjects(professor.id)
                      const professorDepartments = getProfessorDepartments(professor.id)
                      return (
                        <>
                          {professorDepartments.length > 0 && (
                            <div className="col-span-2">
                              <p className="font-medium mb-1 flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                Head of departments:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {professorDepartments.map((dept) => (
                                  <span
                                    key={dept.id}
                                    className="text-xs bg-secondary px-2 py-1 rounded"
                                  >
                                    {dept.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {professorSubjects.length > 0 && (
                            <div className="col-span-2">
                              <p className="font-medium mb-1 flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-muted-foreground" />
                                Subjects
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {professorSubjects.map((subject) => (
                                  <span
                                    key={subject.id}
                                    className="text-xs bg-secondary px-2 py-1 rounded"
                                  >
                                    {subject.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )
                    })()}
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
