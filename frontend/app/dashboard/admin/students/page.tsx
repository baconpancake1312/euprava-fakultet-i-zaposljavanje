"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Loader2, GraduationCap, Mail, Phone, Plus, Pencil, Trash2, Building2, ChevronDown, ChevronRight, Users } from "lucide-react"
import type { Student, Major } from "@/lib/types"

interface DepartmentRef {
  id: string
  name: string
}

export default function AdminStudentsPage() {
  const router = useRouter()
  const { token } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [majors, setMajors] = useState<Major[]>([])
  const [departments, setDepartments] = useState<DepartmentRef[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedDeptId, setExpandedDeptId] = useState<string | null>(null)
  const [expandedMajorIds, setExpandedMajorIds] = useState<Set<string>>(new Set())
  const [expandedUnassigned, setExpandedUnassigned] = useState<boolean>(false)

  useEffect(() => {
    if (token) {
      loadStudents()
    }
  }, [token])

  const loadStudents = async () => {
    try {
      const authToken: string = token!
      const [studentsData, majorsData, departmentsData] = await Promise.all([
        apiClient.getAllStudents(authToken),
        apiClient.getAllMajors(authToken),
        apiClient.getAllDepartments(authToken),
      ])
      
      setStudents(Array.isArray(studentsData) ? studentsData : [])
      setMajors(Array.isArray(majorsData) ? majorsData : [])
      setDepartments(
        Array.isArray(departmentsData)
          ? departmentsData.map((d: { id: string; name: string }) => ({
              id: d.id,
              name: d.name,
            }))
          : []
      )
    } catch (error) {
      console.error("Failed to load students:", error)
    } finally {
      setLoading(false)
    }
  }

  // Group majors by department
  const majorsByDepartmentId = useMemo(() => {
    const map: Record<string, Major[]> = {}
    for (const major of majors) {
      const deptId = major.department_id ?? ""
      if (!deptId) continue
      if (!map[deptId]) map[deptId] = []
      map[deptId].push(major)
    }
    return map
  }, [majors])

  // Group students by major
  const studentsByMajorId = useMemo(() => {
    const map: Record<string, Student[]> = {}
    for (const student of students) {
      // Try to match by major_id first, then by major name
      let majorId: string | undefined
      
      // Check if student has major_id field
      const studentWithMajorId = student as Student & { major_id?: string }
      if (studentWithMajorId.major_id) {
        majorId = studentWithMajorId.major_id
      } else if (student.major) {
        // Try to find major by name
        const matchedMajor = majors.find((m) => m.name === student.major)
        if (matchedMajor) {
          majorId = matchedMajor.id
        }
      }
      
      if (!majorId) {
        // Students without a major
        if (!map["_unassigned"]) map["_unassigned"] = []
        map["_unassigned"].push(student)
        continue
      }
      
      if (!map[majorId]) map[majorId] = []
      map[majorId].push(student)
    }
    return map
  }, [students, majors])

  const toggleMajor = (majorId: string) => {
    setExpandedMajorIds((prev) => {
      const next = new Set(prev)
      if (next.has(majorId)) {
        next.delete(majorId)
      } else {
        next.add(majorId)
      }
      return next
    })
  }

  const handleDeleteStudent = async (student: Student) => {
    if (!token) return
    if (!confirm(`Delete student "${student.first_name} ${student.last_name}"? This cannot be undone.`)) {
      return
    }
    try {
      await apiClient.deleteStudent(student.id, token)
      setStudents((prev) => prev.filter((s) => s.id !== student.id))
    } catch (error) {
      console.error("Failed to delete student:", error)
    }
  }

  // Get students without a major
  const unassignedStudents = studentsByMajorId["000000000000000000000000"] ?? []

  return (
    <DashboardLayout title="Student Management">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Student Management</h1>
            <p className="text-muted-foreground">View and manage all students organized by department and major</p>
          </div>
          <Button onClick={() => router.push("/dashboard/admin/students/create")}>
            <Plus className="mr-2 h-4 w-4" />
            Add Student
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          </div>
        ) : departments.length === 0 && unassignedStudents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No students found
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-1">

   {/* Students without a major */}
   {unassignedStudents.length > 0 && (
              <Collapsible
                open={expandedUnassigned}
                onOpenChange={setExpandedUnassigned}
              >
                <Card>
                  <div className="flex items-center gap-2 w-full px-4 py-3 rounded-t-lg">
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center gap-3 flex-1 min-w-0 text-left hover:bg-muted/50 transition-colors rounded py-1 -my-1 -ml-2 pl-2"
                      >
                        {expandedUnassigned ? (
                          <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                        )}
                        <Users className="h-5 w-5 shrink-0 text-muted-foreground" />
                        <span className="font-semibold truncate">Unassigned Students</span>
                        <span className="text-sm text-muted-foreground shrink-0">
                          ({unassignedStudents.length} student{unassignedStudents.length !== 1 ? "s" : ""})
                        </span>
                      </button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-3 px-4">
                      <div className="pl-8 pt-2 space-y-3">
                        {unassignedStudents.map((student) => (
                          <Card key={student.id}>
                            <CardHeader>
                              <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                  <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    {student.first_name} {student.last_name}
                                  </CardTitle>
                                  <CardDescription>Student ID: {student.id}</CardDescription>
                                </div>
                                <div className="flex items-center gap-1">
                                  {student.scholarship && (
                                    <Badge className="bg-blue-500">Scholarship</Badge>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() =>
                                      router.push(`/dashboard/admin/students/edit/${student.id}`)
                                    }
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleDeleteStudent(student)}
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
                                  <span>{student.email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  <span>{student.phone}</span>
                                </div>
                                <div>
                                  <p className="font-medium">Year</p>
                                  <p className="text-muted-foreground">{student.year || "Not set"}</p>
                                </div>
                                <div>
                                  <p className="font-medium">GPA</p>
                                  <p className="text-muted-foreground">{student.gpa?.toFixed(2) || "N/A"}</p>
                                </div>
                                {student.espb != null && (
                                  <div>
                                    <p className="font-medium">ESPB</p>
                                    <p className="text-muted-foreground">{student.espb}</p>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}



            {/* Students organized by department and major */}
            {departments.map((dept) => {
              const deptMajors = majorsByDepartmentId[dept.id] ?? []
              const totalStudentsInDept = deptMajors.reduce(
                (sum, major) => sum + (studentsByMajorId[major.id]?.length ?? 0),
                0
              )
              
              if (totalStudentsInDept === 0) return null
              
              const isExpanded = expandedDeptId === dept.id
              return (
                <Collapsible
                  key={dept.id}
                  open={isExpanded}
                  onOpenChange={(open) => setExpandedDeptId(open ? dept.id : null)}
                >
                  <Card>
                    <div className="flex items-center gap-2 w-full px-4 py-3 rounded-t-lg">
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="flex items-center gap-3 flex-1 min-w-0 text-left hover:bg-muted/50 transition-colors rounded py-1 -my-1 -ml-2 pl-2"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                          )}
                          <Building2 className="h-5 w-5 shrink-0 text-muted-foreground" />
                          <span className="font-semibold truncate">{dept.name}</span>
                          <span className="text-sm text-muted-foreground shrink-0">
                            ({deptMajors.length} major{deptMajors.length !== 1 ? "s" : ""}, {totalStudentsInDept} student{totalStudentsInDept !== 1 ? "s" : ""})
                          </span>
                        </button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-3 px-4">
                        {deptMajors.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-2 pl-8">
                            No majors in this department
                          </p>
                        ) : (
                          <ul className="space-y-3 pl-8">
                            {deptMajors.map((major) => {
                              const majorStudents = studentsByMajorId[major.id] ?? []
                              if (majorStudents.length === 0) return null
                              
                              const isMajorExpanded = expandedMajorIds.has(major.id)
                              return (
                                <li key={major.id} className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Collapsible
                                      open={isMajorExpanded}
                                      onOpenChange={() => toggleMajor(major.id)}
                                    >
                                      <CollapsibleTrigger asChild>
                                        <button
                                          type="button"
                                          className="flex items-center gap-2 flex-1 min-w-0 text-left hover:bg-muted/50 transition-colors rounded py-1 px-2 -ml-2"
                                        >
                                          {isMajorExpanded ? (
                                            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                                          ) : (
                                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                                          )}
                                          <GraduationCap className="h-4 w-4 shrink-0 text-muted-foreground" />
                                          <span className="text-sm font-medium flex-1 min-w-0 truncate">{major.name}</span>
                                          <span className="text-xs text-muted-foreground shrink-0">
                                            ({majorStudents.length} student{majorStudents.length !== 1 ? "s" : ""})
                                          </span>
                                        </button>
                                      </CollapsibleTrigger>
                                      <CollapsibleContent>
                                        <div className="pl-6 pt-2 space-y-3">
                                          {majorStudents.map((student) => (
                                            <Card key={student.id}>
                                              <CardHeader>
                                                <div className="flex items-start justify-between">
                                                  <div className="space-y-1">
                                                    <CardTitle className="flex items-center gap-2">
                                                      <Users className="h-5 w-5" />
                                                      {student.first_name} {student.last_name}
                                                    </CardTitle>
                                                    <CardDescription>Student ID: {student.id}</CardDescription>
                                                  </div>
                                                  <div className="flex items-center gap-1">
                                                    {student.scholarship && (
                                                      <Badge className="bg-blue-500">Scholarship</Badge>
                                                    )}
                                                    <Button
                                                      variant="outline"
                                                      size="icon"
                                                      onClick={() =>
                                                        router.push(`/dashboard/admin/students/edit/${student.id}`)
                                                      }
                                                    >
                                                      <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                      variant="outline"
                                                      size="icon"
                                                      onClick={() => handleDeleteStudent(student)}
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
                                                    <span>{student.email}</span>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                                    <span>{student.phone}</span>
                                                  </div>
                                                  <div>
                                                    <p className="font-medium">Year</p>
                                                    <p className="text-muted-foreground">{student.year || "Not set"}</p>
                                                  </div>
                                                  <div>
                                                    <p className="font-medium">GPA</p>
                                                    <p className="text-muted-foreground">{student.gpa?.toFixed(2) || "N/A"}</p>
                                                  </div>
                                                  {student.espb != null && (
                                                    <div>
                                                      <p className="font-medium">ESPB</p>
                                                      <p className="text-muted-foreground">{student.espb}</p>
                                                    </div>
                                                  )}
                                                </div>
                                              </CardContent>
                                            </Card>
                                          ))}
                                        </div>
                                      </CollapsibleContent>
                                    </Collapsible>
                                  </div>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              )
            })}

         
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
