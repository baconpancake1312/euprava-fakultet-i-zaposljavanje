"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Calendar,
    ArrowLeft,
    Loader2,
    Clock,
    MapPin,
    Users,
    BookOpen,
    GraduationCap,
    Filter,
    CheckCircle,
    XCircle
} from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { ExamSession, ExamRegistration, Course } from "@/lib/types"

export default function ExamSessionDetailPage() {
    const router = useRouter()
    const params = useParams()
    const { user, token, isAuthenticated } = useAuth()
    const [loading, setLoading] = useState(true)
    const [examSession, setExamSession] = useState<ExamSession | null>(null)
    const [registrations, setRegistrations] = useState<ExamRegistration[]>([])
    const [filteredRegistrations, setFilteredRegistrations] = useState<ExamRegistration[]>([])
    const [course, setCourse] = useState<Course | null>(null)
    const [gradingFilter, setGradingFilter] = useState<string>("all")
    const [gradingDialogOpen, setGradingDialogOpen] = useState(false)
    const [selectedRegistration, setSelectedRegistration] = useState<ExamRegistration | null>(null)
    const [grade, setGrade] = useState("")
    const [comments, setComments] = useState("")
    const [gradingLoading, setGradingLoading] = useState(false)

    const sessionId = params.sessionId as string


    useEffect(() => {
        if (!isAuthenticated || user?.user_type !== "PROFESSOR") {
            router.push("/login")
            return
        }

        if (sessionId) {
            fetchData()
        }
    }, [isAuthenticated, user, router, sessionId])

    const fetchData = async () => {
        try {
            if (!token || !sessionId) return

            // Fetch exam session details
            const sessionData = await apiClient.getExamSessionById(sessionId, token)
            setExamSession(sessionData)

            // Set course from session data
            if (sessionData.subject) {
                setCourse(sessionData.subject)
            }

            // Fetch registrations for this exam session
            const registrationsData = await apiClient.getExamRegistrationsBySession(sessionId, token)
            console.log("Fetched registrations:", registrationsData)
            // Fetch exam grades for this exam session
            let gradesData = []
            try {
                gradesData = await apiClient.getExamGradesForExamSession(sessionId, token) || []
            } catch (error) {
                console.log("No grades found for this exam session:", error)
                gradesData = []
            }

            console.log("Fetched grades:", gradesData)

            // Create comprehensive array with all registrations and their grades
            console.log("Raw registrations data:", registrationsData)
            console.log("Raw grades data:", gradesData)

            // Start with all registrations
            const allRegistrations = [...registrationsData]

            // Ensure gradesData is an array before filtering
            const safeGradesData = Array.isArray(gradesData) ? gradesData : []

            // Add any grades that don't have corresponding registrations (edge case)
            const gradesWithoutRegistrations = safeGradesData.filter((grade: any) =>
                !registrationsData.some((reg: ExamRegistration) => reg.id === grade.exam_registration_id)
            )

            console.log("Grades without registrations:", gradesWithoutRegistrations)

            // Create the final array
            const registrationsWithGrades = allRegistrations.map((registration: ExamRegistration) => {
                const grade = safeGradesData.find((g: any) => g.exam_registration_id === registration.id)
                console.log(`Processing registration ${registration.id}:`, {
                    foundGrade: !!grade,
                    gradeObject: grade,
                    gradeValue: grade?.grade
                })
                const result: ExamRegistration = {
                    ...registration,
                    grade: grade || undefined,
                    status: grade
                        ? (parseInt(grade.grade) >= 6 ? "passed" as const : "failed" as const)
                        : "registered" as const
                }
                console.log(`Final registration ${registration.id}:`, {
                    hasGrade: !!result.grade,
                    gradeType: typeof result.grade,
                    gradeValue: result.grade?.grade
                })
                return result
            })



            console.log("Final registrations array:", registrationsWithGrades)
            console.log("Total registrations count:", registrationsWithGrades.length)
            console.log("Graded count:", registrationsWithGrades.filter(r => r.grade).length)
            console.log("Ungraded count:", registrationsWithGrades.filter(r => !r.grade).length)

            setRegistrations(registrationsWithGrades)
            setFilteredRegistrations(registrationsWithGrades)

        } catch (error) {
            console.error("Error fetching data:", error)
        } finally {
            setLoading(false)
        }
    }

    const filterRegistrations = () => {
        if (!registrations || registrations.length === 0) {
            console.log("No registrations to filter")
            setFilteredRegistrations([])
            return
        }

        console.log("Filtering registrations with filter:", gradingFilter)
        console.log("All registrations:", registrations.map(r => ({
            id: r.id,
            status: r.status,
            hasGrade: !!r.grade,
            grade: r?.grade
        })))

        let filtered = [...registrations] // Create a copy

        if (gradingFilter === "graded") {
            filtered = registrations.filter(r => !!r.grade)
        } else if (gradingFilter === "ungraded") {
            filtered = registrations.filter(r => !r.grade)
        }


        console.log("Final filtered registrations count:", filtered.length)
        console.log("Final filtered registrations:", filtered)
        setFilteredRegistrations(filtered)
    }

    useEffect(() => {
        filterRegistrations()
    }, [gradingFilter, registrations])

    // Debug effect to log state changes
    useEffect(() => {
        console.log("Registrations state changed:", registrations)
        console.log("Filtered registrations state changed:", filteredRegistrations)
        console.log("Grading filter:", gradingFilter)
    }, [registrations, filteredRegistrations, gradingFilter])

    const handleGradeStudent = async () => {
        if (!selectedRegistration || !grade || !token) return

        setGradingLoading(true)
        try {
            const gradeData = {
                exam_registration_id: selectedRegistration.id,
                exam_session_id: sessionId,
                subject_id: examSession?.subject.id,
                student_id: selectedRegistration.student_id || selectedRegistration.student?.id,
                grade: parseInt(grade),
                passed: parseInt(grade) >= 6 ? "true" : "false",
                comments: comments.trim() || "No comment."
            }

            console.log("Creating exam grade with data:", gradeData)
            console.log("Selected registration:", selectedRegistration)
            console.log("Student data:", selectedRegistration.student)

            await apiClient.createExamGrade(gradeData, token)

            // Refresh the data to get updated grades
            await fetchData()

            setGradingDialogOpen(false)
            setSelectedRegistration(null)
            setGrade("")
            setComments("")
        } catch (error) {
            console.error("Error grading student:", error)
        } finally {
            setGradingLoading(false)
        }
    }

    const openGradingDialog = (registration: ExamRegistration) => {
        setSelectedRegistration(registration)
        setGradingDialogOpen(true)
        setGrade("")
        setComments("")
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString()
    }

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "registered":
                return <Badge variant="secondary">Registered</Badge>
            case "graded":
                return <Badge variant="default">Graded</Badge>
            case "passed":
                return <Badge variant="default" className="bg-green-500">Passed</Badge>
            case "failed":
                return <Badge variant="destructive">Failed</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    if (loading) {
        return (
            <DashboardLayout title="Exam Session Details">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        )
    }

    if (!examSession) {
        return (
            <DashboardLayout title="Exam Session Details">
                <div className="flex flex-col items-center justify-center py-12">
                    <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Exam session not found</h3>
                    <p className="text-muted-foreground mb-4">The requested exam session could not be found.</p>
                    <Button onClick={() => router.push("/dashboard/professor/exam-sessions")}>
                        Back to Exam Sessions
                    </Button>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout title="Exam Session Details">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push("/dashboard/professor/exam-sessions")}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Exam Sessions
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">
                            {course?.name || "Unknown Course"} - Exam Session
                        </h2>
                        <p className="text-muted-foreground">
                            {formatDate(examSession.exam_date)} at {formatTime(examSession.exam_date)}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Exam Session Information */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5" />
                                    Exam Session Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Date</p>
                                        <p className="font-medium">{formatDate(examSession.exam_date)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Time</p>
                                        <p className="font-medium">{formatTime(examSession.exam_date)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Location</p>
                                        <p className="font-medium">{examSession.location}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Max Students</p>
                                        <p className="font-medium">{examSession.max_students}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Registrations Section */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <Users className="h-5 w-5" />
                                            Student Registrations
                                        </CardTitle>
                                        <CardDescription>
                                            {filteredRegistrations?.length || 0} of {registrations?.length || 0} registrations
                                        </CardDescription>
                                        {/* Debug info */}
                                        <div className="text-xs text-muted-foreground mt-1">
                                            Debug: Filter={gradingFilter}, Total={registrations?.length || 0}, Filtered={filteredRegistrations?.length || 0}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Filter className="h-4 w-4" />
                                        <Select value={gradingFilter} onValueChange={setGradingFilter}>
                                            <SelectTrigger className="w-40">
                                                <SelectValue placeholder="Filter by status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Students</SelectItem>
                                                <SelectItem value="graded">Graded</SelectItem>
                                                <SelectItem value="ungraded">Not Graded</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {/* Debug section - show all registrations */}
                                <div className="mb-4 p-2 bg-black-100 rounded text-xs">
                                    <strong>Debug - All Registrations:</strong>
                                    {registrations?.map((reg, index) => (
                                        <div key={index}>
                                            {index + 1}. ID: {reg.id}, Status: {reg.status}, Has Grade: {reg.grade ? 'Yes (' + reg.grade + ')' : 'No'}
                                        </div>
                                    ))}
                                    <div className="mt-2 font-bold">
                                        Total: {registrations?.length || 0} |
                                        Graded: {registrations?.filter(r => r.grade).length || 0} |
                                        Ungraded: {registrations?.filter(r => !r.grade).length || 0}
                                    </div>
                                </div>

                                {!filteredRegistrations || filteredRegistrations.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                        <p className="text-muted-foreground">
                                            {!registrations || registrations.length === 0
                                                ? "No students have registered for this exam yet."
                                                : "No registrations match your current filter."
                                            }
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {filteredRegistrations.map((registration) => (
                                            <div key={registration.id} className="flex items-center justify-between p-4 border rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                                        <span className="text-sm font-medium text-primary">
                                                            {registration.student?.first_name?.[0]}{registration.student?.last_name?.[0]}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">
                                                            {registration.student?.first_name} {registration.student?.last_name}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {registration.student?.email}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {getStatusBadge(registration.status)}
                                                    {registration.grade && (
                                                        <Badge variant="outline">
                                                            Grade: {(() => {
                                                                console.log("Registration grade:", registration.grade);
                                                                console.log("Grade type:", typeof registration.grade);
                                                                console.log("Grade.grade:", registration.grade?.grade);
                                                                return typeof registration.grade === 'object' ? registration.grade.grade : registration.grade;
                                                            })()}
                                                        </Badge>
                                                    )}
                                                    {registration.status === "registered" && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => openGradingDialog(registration)}
                                                        >
                                                            <GraduationCap className="h-4 w-4 mr-2" />
                                                            Grade
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Quick Actions */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Quick Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Button
                                    className="w-full justify-start"
                                    variant="outline"
                                    onClick={() => router.push(`/dashboard/professor/exam-sessions/${sessionId}/edit`)}
                                >
                                    <Calendar className="h-4 w-4 mr-2" />
                                    Edit Session
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Session Stats */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Session Statistics</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Total Registrations</span>
                                    <span className="font-semibold">{registrations?.length || 0}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Graded</span>
                                    <span className="font-semibold">
                                        {registrations?.filter(r => r.status !== "registered").length || 0}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Pending</span>
                                    <span className="font-semibold">
                                        {registrations?.filter(r => r.status === "registered").length || 0}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Grading Dialog */}
                <Dialog open={gradingDialogOpen} onOpenChange={setGradingDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Grade Student</DialogTitle>
                            <DialogDescription>
                                Enter the grade for {selectedRegistration?.student?.first_name} {selectedRegistration?.student?.last_name}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="grade">Grade (5-10)</Label>
                                <Input
                                    id="grade"
                                    type="number"
                                    min="5"
                                    max="10"
                                    value={grade}
                                    onChange={(e) => setGrade(e.target.value)}
                                    placeholder="Enter grade"
                                />
                            </div>
                            <div>
                                <Label htmlFor="comments">Comments (Optional)</Label>
                                <Textarea
                                    id="comments"
                                    value={comments}
                                    onChange={(e) => setComments(e.target.value)}
                                    placeholder="Enter any comments about the exam performance (defaults to 'No comment.' if left empty)"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setGradingDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleGradeStudent}
                                disabled={!grade || gradingLoading}
                            >
                                {gradingLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Grading...
                                    </>
                                ) : (
                                    "Submit Grade"
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    )
}
