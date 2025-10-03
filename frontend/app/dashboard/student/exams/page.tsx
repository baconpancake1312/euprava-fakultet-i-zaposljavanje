"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Calendar, BookOpen, Clock } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function StudentExamsPage() {
  const { token, user } = useAuth()
  const [exams, setExams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [registering, setRegistering] = useState<string | null>(null)

  useEffect(() => {
    loadExams()
  }, [])

  const loadExams = async () => {
    try {
      if (!token) throw new Error("Not authenticated")
      const data = await apiClient.getAllExams(token)
      setExams(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load exams")
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (examId: string, courseId: string) => {
    setRegistering(examId)
    try {
      if (!token || !user?.id) throw new Error("Not authenticated")
      await apiClient.registerExam({ student_id: user.id, course_id: courseId }, token)
      await loadExams()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register for exam")
    } finally {
      setRegistering(null)
    }
  }

  return (
    <DashboardLayout title="Exams">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Exam Calendar</h2>
          <p className="text-muted-foreground">View and register for upcoming exams</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : exams.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No exams scheduled</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {exams.map((exam) => (
              <Card key={exam.id} className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    {exam.course?.name || "Course"}
                  </CardTitle>
                  <CardDescription>Exam Registration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {exam.exam_date && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(exam.exam_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    {exam.exam_date && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(exam.exam_date).toLocaleTimeString()}</span>
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => handleRegister(exam.id, exam.course?.id)}
                    disabled={registering === exam.id}
                    className="w-full"
                  >
                    {registering === exam.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      "Register for Exam"
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
