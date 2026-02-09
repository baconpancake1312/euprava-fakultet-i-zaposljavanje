"use client"

import { useEffect, useState, useMemo } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Loader2, BookOpen, Plus, Pencil, Trash2, ChevronDown, ChevronRight, GraduationCap, Users, Building2 } from "lucide-react"
import type { Subject, Major, Professor } from "@/lib/types"

interface DepartmentRef {
  id: string
  name: string
  staff?: string[]
}

export default function AdminSubjectsPage() {
  const router = useRouter()
  const { token } = useAuth()
  const [departments, setDepartments] = useState<DepartmentRef[]>([])
  const [majors, setMajors] = useState<Major[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [professorsById, setProfessorsById] = useState<Record<string, Professor>>({})
  const [loading, setLoading] = useState(true)
  const [expandedDeptId, setExpandedDeptId] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return

    const loadData = async () => {
      try {
        setLoading(true)
        const [deptData, majorsData, subjectsData] = await Promise.all([
          apiClient.getAllDepartments(token),
          apiClient.getAllMajors(token),
          apiClient.getAllSubjects(token),
        ])
        const deptList = Array.isArray(deptData) ? deptData : []
        setDepartments(
          deptList.map((d: { id: string; name: string; staff?: string[] }) => ({
            id: d.id,
            name: d.name,
            staff: Array.isArray(d.staff) ? d.staff : [],
          }))
        )
        setMajors(Array.isArray(majorsData) ? majorsData : [])
        setSubjects(Array.isArray(subjectsData) ? subjectsData : [])

        const staffIds = new Set<string>()
        deptList.forEach((d: { staff?: string[] }) => {
          if (Array.isArray(d.staff)) d.staff.forEach((id: string) => staffIds.add(id))
        })
        const professors = await Promise.all(
          Array.from(staffIds).map((id) =>
            apiClient.getProfessorById(id, token).catch(() => null)
          )
        )
        setProfessorsById(
          Object.fromEntries(
            professors.filter((p): p is Professor => p != null).map((p) => [p.id, p])
          )
        )
      } catch (err) {
        console.error("Failed to load subjects data", err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [token])

  const majorsByDepartmentId = useMemo(() => {
    const map: Record<string, Major[]> = {}
    for (const major of majors) {
      const deptId = major.department_id ?? (major as { department_id?: string }).department_id ?? ""
      if (!deptId) continue
      if (!map[deptId]) map[deptId] = []
      map[deptId].push(major)
    }
    return map
  }, [majors])

  const subjectsByMajorId = useMemo(() => {
    const map: Record<string, Subject[]> = {}
    for (const subject of subjects) {
      const mid = subject.major_id ?? (subject as { major_id?: string }).major_id ?? ""
      if (!mid) continue
      if (!map[mid]) map[mid] = []
      map[mid].push(subject)
    }
    return map
  }, [subjects])

  async function handleDeleteSubject(subject: Subject) {
    if (!token) return
    if (!confirm(`Delete subject "${subject.name}"? This cannot be undone.`)) return
    try {
      await apiClient.deleteCourse(subject.id, token)
      setSubjects((prev) => prev.filter((s) => s.id !== subject.id))
    } catch (err) {
      console.error("Failed to delete subject:", err)
    }
  }

  async function handleDeleteDepartment(dept: DepartmentRef) {
    if (!token) return
    const majorsInDept = majorsByDepartmentId[dept.id] ?? []
    if (majorsInDept.length > 0 && !confirm(
      `"${dept.name}" has ${majorsInDept.length} major(s). Delete department anyway? This cannot be undone.`
    )) return
    if (majorsInDept.length === 0 && !confirm(`Delete department "${dept.name}"? This cannot be undone.`)) return
    try {
      await apiClient.deleteDepartment(dept.id, token)
      setDepartments((prev) => prev.filter((d) => d.id !== dept.id))
      setMajors((prev) => prev.filter((m) => (m.department_id ?? (m as { department_id?: string }).department_id) !== dept.id))
      if (expandedDeptId === dept.id) setExpandedDeptId(null)
    } catch (err) {
      console.error("Failed to delete department:", err)
    }
  }

  async function handleDeleteMajor(major: Major) {
    if (!token) return
    const majorSubjects = subjectsByMajorId[major.id] ?? []
    if (majorSubjects.length > 0 && !confirm(
      `"${major.name}" has ${majorSubjects.length} subject(s). Delete major anyway? This cannot be undone.`
    )) return
    if (majorSubjects.length === 0 && !confirm(`Delete major "${major.name}"? This cannot be undone.`)) return
    try {
      await apiClient.deleteMajor(major.id, token)
      setMajors((prev) => prev.filter((m) => m.id !== major.id))
      setSubjects((prev) => prev.filter((s) => (s.major_id ?? (s as { major_id?: string }).major_id) !== major.id))
    } catch (err) {
      console.error("Failed to delete major:", err)
    }
  }

  return (
    <DashboardLayout title="Department Management">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-3xl font-bold">Department Management</h1>
            <p className="text-muted-foreground">View and manage departments, majors, and subjects</p>
          </div>
          <div className="flex items-center gap-2">

            <Button variant="outline" onClick={() => router.push("/dashboard/admin/departments/")}>
              <Building2 className="mr-2 h-4 w-4" />
              View Departments
            </Button>
            
            <Button variant="outline" onClick={() => router.push("/dashboard/admin/majors/")}>
              <GraduationCap className="mr-2 h-4 w-4" />
              View Majors
            </Button>

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
        ) : departments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No departments found
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-1">
            {departments.map((dept) => {
              const deptMajors = majorsByDepartmentId[dept.id] ?? []
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
                          <span className="font-semibold truncate">{dept.name}</span>
                          <span className="text-sm text-muted-foreground shrink-0">
                            ({deptMajors.length} major{deptMajors.length !== 1 ? "s" : ""}
                            {(dept.staff?.length ?? 0) > 0 && (
                              <>, {dept.staff!.length} staff</>
                            )}
                            )
                          </span>
                        </button>
                      </CollapsibleTrigger>
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Add major"
                          onClick={() => router.push(`/dashboard/admin/majors/create/?department_id=${dept.id}`)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Edit department"
                          onClick={() => router.push(`/dashboard/admin/departments/edit/${dept.id}`)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          title="Delete department"
                          onClick={() => handleDeleteDepartment(dept)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-3 px-4">
                        {/* Staff */}
                        <div className="py-2 pl-8">
                          <div className="flex items-center gap-2 text-sm font-medium mb-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            Staff
                            <span className="text-muted-foreground font-normal">
                              ({dept.staff?.length ?? 0} member{(dept.staff?.length ?? 0) !== 1 ? "s" : ""})
                            </span>
                            <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        title="Edit department"
                                        onClick={() => router.push(`/dashboard/admin/departments/edit/${dept.id}`)}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                          </div>
                          {dept.staff?.length ? (
                            <ul className="space-y-0.5 pl-6 border-l-2 border-muted text-sm text-muted-foreground">
                              {dept.staff.map((staffId) => {
                                const prof = professorsById[staffId]
                                const label = prof
                                  ? `${prof.first_name} ${prof.last_name}`.trim() || prof.email
                                  : staffId
                                return (
                                  <li key={staffId} className="py-0.5 px-2">
                                    {label}
                                  </li>
                                )
                              })}
                            </ul>
                          ) : (
                            <p className="text-xs text-muted-foreground pl-6">No staff</p>
                          )}
                        </div>
                        {/* Majors */}
                        {deptMajors.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-2 pl-8">
                            No majors in this department
                          </p>
                        ) : (
                          <ul className="space-y-3 pl-8">
                            {deptMajors.map((major) => {
                              const majorSubjects = subjectsByMajorId[major.id] ?? []
                              return (
                                <li key={major.id} className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm font-medium">
                                    <GraduationCap className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span className="flex-1 min-w-0">{major.name}</span>
                                    <span className="text-muted-foreground font-normal shrink-0">
                                      ({majorSubjects.length} subject{majorSubjects.length !== 1 ? "s" : ""})
                                    </span>
                                    <div className="flex items-center gap-0.5 shrink-0">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        title="Add subject"
                                        onClick={() => router.push(`/dashboard/admin/subjects/create/?major_id=${major.id}`)}
                                      >
                                        <Plus className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        title="Edit major"
                                        onClick={() => router.push(`/dashboard/admin/majors/edit/${major.id}`)}
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive hover:text-destructive"
                                        title="Delete major"
                                        onClick={() => handleDeleteMajor(major)}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                  {majorSubjects.length > 0 ? (
                                    <ul className="space-y-1 pl-6 border-l-2 border-muted">
                                      {majorSubjects.map((subject) => (
                                        <li
                                          key={subject.id}
                                          className="flex items-center justify-between gap-2 py-1.5 px-2 rounded hover:bg-muted/50 group"
                                        >
                                          <div className="flex items-center gap-2 min-w-0">
                                            <BookOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                            <span className="text-sm truncate">{subject.name}</span>
                                            {subject.year != null && (
                                              <span className="text-xs text-muted-foreground shrink-0">
                                                Year {subject.year}
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7"
                                              onClick={(e) => {
                                                e.preventDefault()
                                                router.push(`/dashboard/admin/subjects/edit/${subject.id}`)
                                              }}
                                            >
                                              <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7 text-destructive hover:text-destructive"
                                              onClick={(e) => {
                                                e.preventDefault()
                                                handleDeleteSubject(subject)
                                              }}
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="text-xs text-muted-foreground pl-6">
                                      No subjects
                                    </p>
                                  )}
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
