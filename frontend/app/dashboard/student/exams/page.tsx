"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Calendar, BookOpen, Clock, Filter } from "lucide-react"
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
  const [studentData, setStudentData] = useState<any>(null)
  const [passedCourses, setPassedCourses] = useState<any[]>([])
  const [allSubjects, setAllSubjects] = useState<any[]>([])
  const [selectedSubject, setSelectedSubject] = useState<string>("all")
  const [timeFilter, setTimeFilter] = useState<"all" | "future" | "past">("all")
  const [showRegisteredOnly, setShowRegisteredOnly] = useState<boolean>(false)
  const [showGradedOnly, setShowGradedOnly] = useState<boolean>(false)
  const [examGrades, setExamGrades] = useState<any[]>([])

  useEffect(() => {
    loadStudentData()
  }, [])

  const loadStudentData = async () => {
    try {
      if (!token || !user?.id) {
        console.log("No token or user ID available")
        return
      }

      console.log("Loading student data for user:", user.id)
      const data = await apiClient.getStudentById(user.id, token)
      console.log("Student data:", data)

      // Fetch major data if major_id exists
      if (data.major_id) {
        console.log("Student has major_id:", data.major_id)
        try {
          data.major = await apiClient.getMajorById(data.major_id, token)
          console.log("Major data:", data.major)
        } catch (majorError) {
          console.error("Failed to fetch major data:", majorError)
        }
      } else {
        console.log("Student has no major_id")
      }

      setStudentData(data)

      // Load exams, passed courses, subjects, and exam grades after student data is available
      if (data.major_id) {
        console.log("Loading data for major_id:", data.major_id)
        await Promise.all([
          loadExams(),
          loadPassedCourses(user.id),
          loadSubjects(data.major_id),
          loadExamGrades(user.id)
        ])
      } else {
        console.log("Cannot load data - no major_id")
        await Promise.all([
          loadExams(),
          loadExamGrades(user.id)
        ])
      }
    } catch (err) {
      console.error("Error in loadStudentData:", err)
      setError(err instanceof Error ? err.message : "Failed to load student data")
    } finally {
      setLoading(false)
    }
  }

  const loadPassedCourses = async (studentId: string) => {
    try {
      if (!token) throw new Error("Not authenticated")
      console.log("Loading passed courses for student:", studentId)
      const data = await apiClient.getPassedCorusesForStudent(studentId, token)
      console.log("Passed courses data:", data)
      setPassedCourses(data || [])
    } catch (err) {
      console.error("Error in loadPassedCourses:", err)
      console.log("Failed to load passed courses, continuing without this data")
      setPassedCourses([]) // Ensure we always have an empty array
    }
  }

  const loadSubjects = async (majorId: string) => {
    try {
      if (!token) throw new Error("Not authenticated")
      console.log("Loading subjects for major:", majorId)
      const data = await apiClient.getSubjectsByMajor(majorId, token)
      console.log("Subjects data:", data)
      setAllSubjects(data)
    } catch (err) {
      console.error("Error in loadSubjects:", err)
      console.log("Failed to load subjects, continuing without this data")
    }
  }

  const loadExamGrades = async (studentId: string) => {
    try {
      if (!token) throw new Error("Not authenticated")
      console.log("Loading exam grades for student:", studentId)
      const data = await apiClient.getAllExamGradesForStudent(studentId, token)
      console.log("Exam grades data:", data)
      console.log("Exam grades data type:", typeof data)
      console.log("Exam grades data length:", Array.isArray(data) ? data.length : "Not an array")

      if (Array.isArray(data)) {
        console.log("Exam grades array contents:")
        data.forEach((grade, index) => {
          console.log(`Grade ${index}:`, {
            id: grade.id,
            exam_registration_id: grade.exam_registration_id,
            grade: grade.grade,
            passed: grade.passed,
            graded_at: grade.graded_at
          })
        })
        setExamGrades(data)
      } else {
        console.log("Exam grades data is not an array, setting empty array")
        setExamGrades([])
      }
    } catch (err) {
      console.error("Error in loadExamGrades:", err)
      console.log("Failed to load exam grades, continuing without this data")
      setExamGrades([]) // Ensure we always have an empty array
    }
  }

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
      console.log("Loaded exam sessions:", examSessions)
      console.log("Exam sessions count:", examSessions.length)

      // Log exam session IDs for debugging
      examSessions.forEach((exam: any, index: number) => {
        console.log(`Exam ${index}:`, {
          id: exam.id,
          subject: exam.subject?.name || exam.subject?.Name,
          exam_date: exam.exam_date
        })
      })

      setExams(examSessions)

      // Process registrations to create a set of registered exam session IDs
      // Handle both direct array and wrapped in value property
      let registrations = []
      if (Array.isArray(registrationsData)) {
        registrations = registrationsData
      } else if (registrationsData && registrationsData.value && Array.isArray(registrationsData.value)) {
        registrations = registrationsData.value
      }

      console.log("Loaded registrations:", registrations)
      console.log("Registrations count:", registrations.length)

      if (registrations.length > 0) {
        const registeredIds = new Set<string>(registrations.map((reg: any) => reg.exam_session_id))
        console.log("Registered exam session IDs:", Array.from(registeredIds))
        setRegisteredExams(registeredIds)
      } else {
        setRegisteredExams(new Set<string>())
      }
    } catch (err) {
      console.error("Error loading exams:", err)
      setError(err instanceof Error ? err.message : "Failed to load exam sessions")
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

      // Find the exam session to check if it's in the past
      const examSession = exams.find(exam => exam.id === examSessionId)
      if (examSession && new Date(examSession.exam_date) < new Date()) {
        throw new Error("Cannot register for an exam that has already passed")
      }

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

      // Find the exam session to check if it's in the past
      const examSession = exams.find(exam => exam.id === examSessionId)
      if (examSession && new Date(examSession.exam_date) < new Date()) {
        throw new Error("Cannot deregister from an exam that has already passed")
      }

      await apiClient.deregisterFromExamSession(user.id, examSessionId, token)
      await refreshRegistrationStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deregister from exam session")
    } finally {
      setRegistering(null)
    }
  }

  // Helper function to check if a course is passed
  const isCoursePassed = (courseId: string) => {
    if (!passedCourses || !Array.isArray(passedCourses)) {
      return false
    }
    return passedCourses.some((passedCourse: any) =>
      passedCourse.id === courseId ||
      passedCourse.course_id === courseId ||
      passedCourse.subject_id === courseId
    )
  }

  // Get subjects that the student hasn't passed yet
  const getNotPassedSubjects = () => {
    return allSubjects.filter(subject => !isCoursePassed(subject.id))
  }

  // Get exam grade for a specific exam
  const getExamGrade = (examId: string) => {
    console.log("Looking for grade for exam ID:", examId)
    console.log("Available exam grades:", examGrades)

    if (!examGrades || !Array.isArray(examGrades)) {
      console.log("Exam grades is null, undefined, or not an array")
      return undefined
    }

    console.log("Exam grades count:", examGrades.length)

    const foundGrade = examGrades.find(grade => {
      console.log(`Comparing exam ID ${examId} with grade exam_registration_id ${grade.exam_registration_id}`)
      return grade.exam_session_id === examId
    })

    console.log("Found grade for exam", examId, ":", foundGrade)
    return foundGrade
  }

  // Filter exams based on selected subject, past registered filter, and time filter
  const getFilteredExams = () => {
    let filteredExams = exams

    // First apply subject filter
    if (selectedSubject === "all") {
      filteredExams = exams
    } else if (selectedSubject === "not-passed") {
      // Show exams for subjects the student hasn't passed
      const notPassedSubjectIds = getNotPassedSubjects().map(subject => subject.id)
      filteredExams = exams.filter(exam =>
        exam.subject?.id && notPassedSubjectIds.includes(exam.subject.id)
      )
    } else {
      // Show exams for specific subject
      filteredExams = exams.filter(exam => exam.subject?.id === selectedSubject)
    }

    // Then apply time filter (future/past)
    if (timeFilter !== "all") {
      const now = new Date()
      filteredExams = filteredExams.filter(exam => {
        const examDate = new Date(exam.exam_date)
        if (timeFilter === "future") {
          return examDate >= now
        } else if (timeFilter === "past") {
          return examDate < now
        }
        return true
      })
    }

    // Then apply registered only filter
    if (showRegisteredOnly) {
      filteredExams = filteredExams.filter(exam => {
        // Check if student is registered for this exam
        return registeredExams.has(exam.id)
      })
    }

    // Then apply graded only filter
    if (showGradedOnly) {
      filteredExams = filteredExams.filter(exam => {
        // Check if exam has been graded
        return getExamGrade(exam.id) !== undefined
      })
    }

    // Sort exams by date with farthest future dates first
    filteredExams.sort((a, b) => {
      const dateA = new Date(a.exam_date)
      const dateB = new Date(b.exam_date)
      return dateB.getTime() - dateA.getTime() // Descending order (farthest future first)
    })

    return filteredExams
  }

  return (
    <DashboardLayout title="Exams">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Exam Calendar</h2>
          <p className="text-muted-foreground">View and register for upcoming exams</p>
        </div>

        {/* Filter Controls */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filter by subject:</span>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  <SelectItem value="not-passed">❌ Not Passed Subjects</SelectItem>
                  {getNotPassedSubjects().map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.Name || subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              Showing {getFilteredExams().length} of {exams.length} exams
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Time:</span>
              <div className="flex gap-1">
                <Button
                  variant={timeFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeFilter("all")}
                >
                  All
                </Button>
                <Button
                  variant={timeFilter === "future" ? "default" : "outline"}
                  size="sm"
                  disabled={showGradedOnly}
                  onClick={() => setTimeFilter("future")}
                >
                  🔮 Future
                </Button>
                <Button
                  variant={timeFilter === "past" ? "default" : "outline"}
                  size="sm"
                  disabled={showGradedOnly}
                  onClick={() => setTimeFilter("past")}
                >
                  📅 Past
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={showRegisteredOnly ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setShowRegisteredOnly(!showRegisteredOnly)
                  if (!showRegisteredOnly) {
                    setShowGradedOnly(false) // Turn off Graded Exams when turning on My Registered Exams
                  }
                }}
              >
                📋 My Registered Exams
              </Button>
              {showRegisteredOnly && (
                <span className="text-xs text-muted-foreground">
                  Showing all exams you are registered for (use Future/Past filters to narrow down)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={showGradedOnly ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setShowGradedOnly(!showGradedOnly)
                  if (!showGradedOnly) {
                    setShowRegisteredOnly(false) // Turn off My Registered Exams when turning on Graded Exams
                    setTimeFilter("all") // Reset time filter when turning on graded filter
                  }
                }}
              >
                🎯 Graded Exams
              </Button>
              {showGradedOnly && (
                <span className="text-xs text-muted-foreground">
                  Showing only exams that have been graded (time filters disabled)
                </span>
              )}
            </div>
          </div>
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
        ) : getFilteredExams().length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {showGradedOnly
                  ? "No graded exams found"
                  : showRegisteredOnly
                    ? "No registered exams found"
                    : timeFilter === "future"
                      ? "No future exams found"
                      : timeFilter === "past"
                        ? "No past exams found"
                        : selectedSubject === "all"
                          ? "No exam sessions scheduled"
                          : selectedSubject === "not-passed"
                            ? "No exams for subjects you haven't passed"
                            : "No exams for selected subject"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {getFilteredExams().map((examSession) => (
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
                        <span>{new Date(examSession.exam_date).toLocaleDateString('en-GB')}</span>
                      </div>
                    )}
                    {examSession.exam_date && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(examSession.exam_date).toLocaleTimeString('en-US', {
                          hour12: true,
                          hour: 'numeric',
                          minute: '2-digit'
                        })}</span>
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
                      <span className={`px-2 py-1 rounded-full text-xs ${getExamGrade(examSession.id)
                        ? 'bg-yellow-100 text-yellow-800'
                        : new Date(examSession.exam_date) < new Date()
                          ? 'bg-gray-100 text-gray-800'
                          : examSession.status === 'scheduled'
                            ? 'bg-green-100 text-green-800'
                            : examSession.status === 'cancelled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                        }`}>
                        {getExamGrade(examSession.id) ? 'Graded' :
                          new Date(examSession.exam_date) < new Date() ? 'The exam date has passed' : examSession.status}
                      </span>
                    </div>
                    {(() => {
                      const examGrade = getExamGrade(examSession.id)

                      return examGrade && (
                        <div className="flex flex-col text-sm gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Grade:</span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${examGrade?.passed
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                                }`}
                            >
                              {examGrade?.grade}
                            </span>
                            {examGrade?.passed ? '✅' : '❌'}
                          </div>

                          {examGrade?.comments && (
                            <div>
                              <span className="text-muted-foreground">Comment:</span>{' '}
                              <span>{examGrade.comments}</span>
                            </div>
                          )}
                        </div>

                      )
                    })()}

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
                        disabled={
                          registering === examSession.id ||
                          new Date(examSession.exam_date) < new Date()
                        }
                        className="w-full"
                        variant="destructive"
                      >
                        {registering === examSession.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Deregistering...
                          </>
                        )
                          : new Date(examSession.exam_date) < new Date() ? (
                            "Exam Date Passed"
                          ) : (
                            "Deregister from Exam"
                          )}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleRegister(examSession.id)}
                      disabled={
                        registering === examSession.id ||
                        examSession.status !== 'scheduled' ||
                        new Date(examSession.exam_date) < new Date()
                      }
                      className={`w-full ${duplicateRegistration === examSession.id ? 'animate-pulse' : ''}`}
                      variant="default"
                    >
                      {registering === examSession.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Registering...
                        </>
                      ) : new Date(examSession.exam_date) < new Date() ? (
                        "Exam Date Passed"
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
