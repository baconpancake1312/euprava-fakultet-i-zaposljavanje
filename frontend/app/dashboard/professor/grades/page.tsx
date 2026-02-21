"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ArrowLeft,
  Loader2,
  GraduationCap,
  Pencil,
  Trash2,
  User,
} from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { Subject } from "@/lib/types"

type GradeRecord = {
  id: string
  subject_id: string
  exam_session_id: string
  exam_registration_id: string
  grade: number | string
  passed: boolean
  comments?: string
  graded_at?: string
  student?: {
    id?: string
    first_name?: string
    last_name?: string
    email?: string
  }
}

function normalizeGradesList(data: unknown): GradeRecord[] {
  if (Array.isArray(data)) {
    return data.map((g: any) => ({
      id: g.id,
      subject_id: g.subject_id ?? g.subjectId,
      exam_session_id: g.exam_session_id ?? g.examSessionId,
      exam_registration_id: g.exam_registration_id ?? g.examRegistrationId,
      grade: g.grade ?? "",
      passed: g.passed === true || g.passed === "true" || g.passed === "passed",
      comments: g.comments ?? "",
      graded_at: g.graded_at ?? g.gradedAt,
      student: g.student ? { id: g.student.id, first_name: g.student.first_name, last_name: g.student.last_name, email: g.student.email } : undefined,
    }))
  }
  if (data && typeof data === "object" && (data as any).subject_id != null) {
    const g = data as any
    return [{
      id: g.id,
      subject_id: g.subject_id ?? g.subjectId,
      exam_session_id: g.exam_session_id ?? g.examSessionId,
      exam_registration_id: g.exam_registration_id ?? g.examRegistrationId,
      grade: g.grade ?? "",
      passed: g.passed === true || g.passed === "true" || g.passed === "passed",
      comments: g.comments ?? "",
      graded_at: g.graded_at ?? g.gradedAt,
      student: g.student ? { id: g.student.id, first_name: g.student.first_name, last_name: g.student.last_name, email: g.student.email } : undefined,
    }]
  }
  return []
}

export default function ManageGradesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, token, isAuthenticated } = useAuth()
  const courseId = searchParams.get("course") ?? ""

  const [loading, setLoading] = useState(true)
  const [course, setCourse] = useState<Subject | null>(null)
  const [grades, setGrades] = useState<GradeRecord[]>([])
  const [editOpen, setEditOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editingGrade, setEditingGrade] = useState<GradeRecord | null>(null)
  const [editGrade, setEditGrade] = useState("")
  const [editPassed, setEditPassed] = useState(true)
  const [editComments, setEditComments] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || user?.user_type !== "PROFESSOR") {
      router.push("/login")
      return
    }
    if (courseId) {
      fetchData()
    } else {
      setLoading(false)
    }
  }, [isAuthenticated, user, router, courseId])

  const fetchData = async () => {
    if (!token || !courseId || !user?.id) return
    setLoading(true)
    try {
      const [courseData, sessionsData] = await Promise.all([
        apiClient.getCourseById(courseId, token),
        apiClient.getExamSessionsByProfessor(user.id, token),
      ])
      setCourse(courseData)

      const sessionsForCourse = (sessionsData || []).filter(
        (s: any) => (s.subject_id ?? s.subject?.id) === courseId
      )
      const allGrades: GradeRecord[] = []
      for (const session of sessionsForCourse) {
        try {
          const data = await apiClient.getExamGradesForExamSession(session.id, token)
          const list = normalizeGradesList(data)
          for (const g of list) {
            if (g.subject_id === courseId) allGrades.push(g)
          }
        } catch {
          // skip session
        }
      }
      setGrades(allGrades)
    } catch (err) {
      console.error("Error fetching grades:", err)
    } finally {
      setLoading(false)
    }
  }

  const openEdit = (g: GradeRecord) => {
    setEditingGrade(g)
    setEditGrade(String(g.grade))
    setEditPassed(g.passed)
    setEditComments(g.comments ?? "")
    setEditOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!token || !editingGrade) return
    setSaving(true)
    try {
      const gradeNum = editGrade.trim() === "" ? undefined : Number(editGrade)
      await apiClient.updateExamGrade(
        editingGrade.id,
        {
          grade: gradeNum ?? editingGrade.grade,
          passed: editPassed,
          comments: editComments.trim() || undefined,
        },
        token
      )
      setGrades((prev) =>
        prev.map((g) =>
          g.id === editingGrade.id
            ? {
                ...g,
                grade: gradeNum ?? g.grade,
                passed: editPassed,
                comments: editComments.trim() || g.comments,
              }
            : g
        )
      )
      setEditOpen(false)
      setEditingGrade(null)
    } catch (err) {
      console.error("Error updating grade:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!token) return
    try {
      await apiClient.deleteExamGrade(id, token)
      setGrades((prev) => prev.filter((g) => g.id !== id))
      setDeleteId(null)
    } catch (err) {
      console.error("Error deleting grade:", err)
    }
  }

  const studentName = (g: GradeRecord) => {
    const s = g.student
    if (!s) return "Unknown"
    const first = s.first_name ?? ""
    const last = s.last_name ?? ""
    return `${first} ${last}`.trim() || s.email || "Unknown"
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—"
    try {
      return new Date(dateStr).toLocaleString()
    } catch {
      return dateStr
    }
  }

  if (!courseId) {
    return (
      <DashboardLayout title="Manage Grades">
        <div className="space-y-6">
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/professor/courses")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Button>
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Select a course to manage grades. Go to a course and click &quot;Manage Grades&quot;.
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  if (loading) {
    return (
      <DashboardLayout title="Manage Grades">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Manage Grades">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/professor/courses/${courseId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Course
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <GraduationCap className="h-8 w-8" />
              Manage Grades
            </h2>
            <p className="text-muted-foreground">{course?.name ?? "Course"} — view, edit, or delete grades</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Grades</CardTitle>
            <CardDescription>All recorded grades for this course. Edit or delete as needed.</CardDescription>
          </CardHeader>
          <CardContent>
            {grades.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No grades recorded for this course yet.
              </div>
            ) : (
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Student</th>
                      <th className="text-left p-3 font-medium">Grade</th>
                      <th className="text-left p-3 font-medium">Passed</th>
                      <th className="text-left p-3 font-medium">Comments</th>
                      <th className="text-left p-3 font-medium">Graded at</th>
                      <th className="w-[120px] p-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {grades.map((g) => (
                      <tr key={g.id} className="border-b last:border-0">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {studentName(g)}
                          </div>
                        </td>
                        <td className="p-3 font-medium">{String(g.grade)}</td>
                        <td className="p-3">
                          <Badge variant={g.passed ? "default" : "secondary"}>
                            {g.passed ? "Passed" : "Failed"}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground max-w-[200px] truncate">
                          {g.comments || "—"}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">{formatDate(g.graded_at)}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(g)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteId(g.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit grade</DialogTitle>
            <DialogDescription>
              Update grade, passed status, and comments for {editingGrade ? studentName(editingGrade) : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-grade">Grade</Label>
              <Input
                id="edit-grade"
                type="number"
                min={0}
                max={10}
                step={0.5}
                value={editGrade}
                onChange={(e) => setEditGrade(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="edit-passed" checked={editPassed} onCheckedChange={(c) => setEditPassed(c === true)} />
              <Label htmlFor="edit-passed">Passed</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-comments">Comments</Label>
              <Textarea
                id="edit-comments"
                value={editComments}
                onChange={(e) => setEditComments(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId != null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete grade</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this grade record. The student will no longer have a grade for this exam. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  )
}
