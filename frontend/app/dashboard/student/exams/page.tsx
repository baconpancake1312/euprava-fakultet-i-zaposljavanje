"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Calendar, BookOpen, Clock } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { StudentData } from '../../../../lib/types';

export default function StudentExamsPage() {
  const { token, user } = useAuth()
  const [exams, setExams] = useState<any[]>([])
  const [registeredExams, setRegisteredExams] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [registering, setRegistering] = useState<string | null>(null)
  const [duplicateRegistration, setDuplicateRegistration] = useState<string | null>(null)

  useEffect(() => {
    loadExams()
  }, [])

  const loadExams = async () => {
    try {
      console.log("user token: " + token + " user id: " + user)
      if (!token || !user?.id) throw new Error("Not authenticated")


      // Load exam sessions and student registrations in parallel
      const [examSessionsData, registrationsData] = await Promise.all([
        apiClient.getAllExamSessionsForStudent(user.id, token),
        apiClient.getStudentExamRegistrations(user.id, token)
      ])

      // Handle different data structures
      const examSessions = examSessionsData?.value || examSessionsData || []
      setExams(examSessions)

      // Process registrations to create a set of registered exam session IDs
      // Handle both direct array and wrapped in value property
      let registrations = []
      if (Array.isArray(registrationsData)) {
        registrations = registrationsData
      } else if (registrationsData && registrationsData.value && Array.isArray(registrationsData.value)) {
        registrations = registrationsData.value
      }

      if (registrations.length > 0) {
        const registeredIds = new Set<string>(registrations.map((reg: any) => reg.exam_session_id))
        setRegisteredExams(registeredIds)
      } else {
        setRegisteredExams(new Set<string>())
      }
    } catch (err) {
      console.error("Error loading exams:", err)
      setError(err instanceof Error ? err.message : "Failed to load exam sessions")

    } finally {
      setLoading(false)
    }
  }

  const refreshRegistrationStatus = async () => {
    try {
      if (!token || !user?.id) return

      const registrationsData = await apiClient.getStudentExamRegistrations(user.id, token)

      // Process registrations to create a set of registered exam session IDs
      // Handle both direct array and wrapped in value property
      let registrations = []
      if (Array.isArray(registrationsData)) {
        registrations = registrationsData
      } else if (registrationsData && registrationsData.value && Array.isArray(registrationsData.value)) {
        registrations = registrationsData.value
      }

      if (registrations.length > 0) {
        const registeredIds = new Set<string>(registrations.map((reg: any) => reg.exam_session_id))
        setRegisteredExams(registeredIds)
      } else {
        setRegisteredExams(new Set<string>())
      }
    } catch (err) {
      console.error("Failed to refresh registration status:", err)
    }
  }

  const handleRegister = async (examSessionId: string) => {
    setRegistering(examSessionId)
    setDuplicateRegistration(null)
    try {
      if (!token || !user?.id) throw new Error("Not authenticated")
      await apiClient.registerForExamSession({
        student_id: user.id,
        exam_session_id: examSessionId,
      }, token)
      await refreshRegistrationStatus()
    } catch (err) {
      // Handle 409 error (already registered) by refreshing the registration status
      if (err instanceof Error && err.message.includes("already registered")) {
        // Refresh registration status to update UI
        await refreshRegistrationStatus()
        setDuplicateRegistration(examSessionId)
        setError("You are already registered for this exam")
        // Clear the duplicate registration indicator after 3 seconds
        setTimeout(() => setDuplicateRegistration(null), 3000)
      } else {
        setError(err instanceof Error ? err.message : "Failed to register for exam session")
      }
    } finally {
      setRegistering(null)
    }
  }

  const handleDeregister = async (examSessionId: string) => {
    setRegistering(examSessionId)
    try {
      if (!token || !user?.id) throw new Error("Not authenticated")
      await apiClient.deregisterFromExamSession(user.id, examSessionId, token)
      await refreshRegistrationStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deregister from exam session")
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
              <p className="text-muted-foreground">No exam sessions scheduled</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {exams.map((examSession) => (
              <Card key={examSession.id} className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    {examSession.subject?.name || "Course"}
                  </CardTitle>
                  <CardDescription>
                    {examSession.professor?.first_name && examSession.professor?.last_name
                      ? `Professor: ${examSession.professor.first_name} ${examSession.professor.last_name}`
                      : "Exam Session"
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {examSession.exam_date && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(examSession.exam_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    {examSession.exam_date && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(examSession.exam_date).toLocaleTimeString()}</span>
                      </div>
                    )}
                    {examSession.location && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Location:</span>
                        <span>{examSession.location}</span>
                      </div>
                    )}
                    {examSession.max_students && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Max Students:</span>
                        <span>{examSession.max_students}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${examSession.status === 'scheduled' ? 'bg-green-100 text-green-800' :
                        examSession.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                        {examSession.status}
                      </span>
                    </div>
                  </div>
                  {registeredExams.has(examSession.id) ? (
                    <div className="space-y-2">
                      <Button
                        disabled
                        className="w-full"
                        variant="outline"
                      >
                        Already registered
                      </Button>
                      <Button
                        onClick={() => handleDeregister(examSession.id)}
                        disabled={registering === examSession.id}
                        className="w-full"
                        variant="destructive"
                      >
                        {registering === examSession.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Deregistering...
                          </>
                        ) : (
                          "Deregister from Exam"
                        )}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleRegister(examSession.id)}
                      disabled={registering === examSession.id || examSession.status !== 'scheduled'}
                      className={`w-full ${duplicateRegistration === examSession.id ? 'animate-pulse' : ''}`}
                      variant="default"
                    >
                      {registering === examSession.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Registering...
                        </>
                      ) : examSession.status !== 'scheduled' ? (
                        "Not Available"
                      ) : duplicateRegistration === examSession.id ? (
                        "Already Registered!"
                      ) : (
                        "Register for Exam"
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
