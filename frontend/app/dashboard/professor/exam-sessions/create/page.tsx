"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Loader2, Calendar, Clock, MapPin, Users, AlertTriangle, CircleAlert } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { apiClient } from "@/lib/api-client"
import { Subject, ExamPeriod } from "@/lib/types"

function formatPeriodRange(period: ExamPeriod): string {
  try {
    const start = new Date(period.start_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    const end = new Date(period.end_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    return `${period.name} (${start} – ${end})`
  } catch {
    return period.name
  }
}

function isDateWithinPeriod(examDate: Date, period: ExamPeriod): boolean {
  try {
    const examDay = new Date(examDate.getFullYear(), examDate.getMonth(), examDate.getDate())
    const periodStart = new Date(period.start_date)
    const periodEnd = new Date(period.end_date)
    const startDay = new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate())
    const endDay = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate())
    endDay.setHours(23, 59, 59, 999)
    return examDay >= startDay && examDay <= endDay
  } catch {
    return false
  }
}

export default function CreateExamSessionPage() {
    const router = useRouter()
    const { user, token, isAuthenticated } = useAuth()
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [courses, setCourses] = useState<Subject[]>([])
    const [activePeriods, setActivePeriods] = useState<ExamPeriod[]>([])
    const [formData, setFormData] = useState({
        subject_id: "",
        exam_date: "",
        exam_time: "",
        location: "",
        max_students: "1"
    })

    useEffect(() => {
        if (!isAuthenticated || user?.user_type !== "PROFESSOR") {
            router.push("/login")
            return
        }

        fetchCourses()
    }, [isAuthenticated, user, router])

    const fetchCourses = async () => {
        try {
            if (!token || !user?.id) return

            const [coursesData, periodsData] = await Promise.all([
                apiClient.getCoursesByProfessor(user.id, token),
                apiClient.getActiveExamPeriods(token).catch(() => []),
            ])
            setCourses(coursesData)
            setActivePeriods(Array.isArray(periodsData) ? periodsData : [])
        } catch (error) {
            console.error("Error fetching courses:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!token) return

        setSubmitting(true)
        try {
            // Combine date and time into a single ISO string for MongoDB
            const examDateTime = new Date(`${formData.exam_date}T${formData.exam_time}`)
            const examDateISO = examDateTime.toISOString()

            const submitData = {
                subject_id: formData.subject_id,
                professor_id: user?.id,
                exam_date: examDateISO,
                location: formData.location,
                max_students: formData.max_students ? parseInt(formData.max_students) : 1
            }

            await apiClient.createExamSession(submitData, token)
            router.push("/dashboard/professor/exam-sessions")
        } catch (error) {
            console.error("Error creating exam session:", error)
        } finally {
            setSubmitting(false)
        }
    }

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const examDateChosen = formData.exam_date && formData.exam_time
    const chosenDate = examDateChosen
      ? new Date(`${formData.exam_date}T${formData.exam_time}`)
      : null
    const hasActivePeriods = activePeriods.length > 0
    const isOutsideAnyPeriod =
      hasActivePeriods &&
      chosenDate != null &&
      !activePeriods.some((p) => isDateWithinPeriod(chosenDate, p))

    if (loading) {
        return (
            <DashboardLayout title="Create Exam Session">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout title="Create Exam Session">
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
                        <h2 className="text-3xl font-bold tracking-tight">Create Exam Session</h2>
                        <p className="text-muted-foreground">Set up a new exam session for your course</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Form */}
                        <div className="lg:col-span-2 space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Calendar className="h-5 w-5" />
                                        Exam Session Details
                                    </CardTitle>
                                    <CardDescription>
                                        Fill in the details for your exam session
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <Label htmlFor="subject_id">Course *</Label>
                                        <Select
                                            value={formData.subject_id}
                                            onValueChange={(value) => handleInputChange("subject_id", value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a course" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {courses.map((course) => (
                                                    <SelectItem key={course.id} value={course.id}>
                                                        {course.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="exam_date">Exam Date *</Label>
                                            <Input
                                                id="exam_date"
                                                type="date"
                                                value={formData.exam_date}
                                                onChange={(e) => handleInputChange("exam_date", e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="exam_time">Exam Time *</Label>
                                            <Input
                                                id="exam_time"
                                                type="time"
                                                value={formData.exam_time}
                                                onChange={(e) => handleInputChange("exam_time", e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>

                                    {isOutsideAnyPeriod && (
                                        <Alert variant="destructive">
                                            <AlertTriangle className="h-4 w-4" />
                                            <AlertTitle>Date outside active exam period</AlertTitle>
                                            <AlertDescription>
                                                The chosen exam date is not within any active exam period. The system may reject this session. Please choose a date within one of the active exam periods listed in the sidebar.
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    <div>
                                        <Label htmlFor="location">Location *</Label>
                                        <Input
                                            id="location"
                                            value={formData.location}
                                            onChange={(e) => handleInputChange("location", e.target.value)}
                                            placeholder="e.g., Room 101, Building A"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="max_students">Maximum Students *</Label>
                                        <Input
                                            id="max_students"
                                            type="number"
                                            min="1"
                                            value={formData.max_students}
                                            onChange={(e) => handleInputChange("max_students", e.target.value)}
                                            required
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {activePeriods.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Active exam periods</CardTitle>
                                        <CardDescription>
                                            Schedule your exam on a date within one of these periods so it is accepted by the system.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="text-sm text-muted-foreground space-y-1">
                                            {activePeriods.map((p) => (
                                                <>
                                                    <li key={p.id}>{formatPeriodRange(p)} {isOutsideAnyPeriod ? "⚠️" : ""}</li>
                                                    
                                                </>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                            )}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Form Guidelines</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium">Date & Time</p>
                                            <p className="text-xs text-muted-foreground">
                                                Set the exam date and time when students will take the exam
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium">Location</p>
                                            <p className="text-xs text-muted-foreground">
                                                Specify where the exam will take place
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium">Capacity</p>
                                            <p className="text-xs text-muted-foreground">
                                                Set a maximum number of students if needed
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Actions</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <Button
                                        type="submit"
                                        className="w-full"
                                        disabled={!formData.subject_id || !formData.exam_date || !formData.exam_time || !formData.location || !formData.max_students || submitting}
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            "Create Exam Session"
                                        )}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => router.push("/dashboard/professor/exam-sessions")}
                                    >
                                        Cancel
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    )
}
