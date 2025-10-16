"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Loader2, Calendar, Clock, MapPin, Users } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { ExamSession, Course } from "@/lib/types"

export default function EditExamSessionPage() {
    const router = useRouter()
    const params = useParams()
    const { user, token, isAuthenticated } = useAuth()
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [examSession, setExamSession] = useState<ExamSession | null>(null)
    const [courses, setCourses] = useState<Course[]>([])
    const [formData, setFormData] = useState({
        subject_id: "",
        exam_date: "",
        exam_time: "",
        location: "",
        max_students: "1"
    })

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
            if (!token || !sessionId || !user?.id) return

            // Fetch exam session details
            const sessionData = await apiClient.getExamSessionById(sessionId, token)
            setExamSession(sessionData)

            // Set form data - parse the ISO date string
            const examDate = new Date(sessionData.exam_date)
            const dateString = examDate.toISOString().split('T')[0]
            const timeString = examDate.toTimeString().split(' ')[0].substring(0, 5) // HH:MM format

            setFormData({
                subject_id: sessionData.subject_id,
                exam_date: dateString,
                exam_time: timeString,
                location: sessionData.location,
                max_students: sessionData.max_students.toString()
            })

            // Fetch courses for this professor
            const coursesData = await apiClient.getCoursesByProfessor(user.id, token)
            setCourses(coursesData)
        } catch (error) {
            console.error("Error fetching data:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!token || !sessionId) return

        setSubmitting(true)
        try {
            // Combine date and time into a single ISO string for MongoDB
            const examDateTime = new Date(`${formData.exam_date}T${formData.exam_time}`)
            const examDateISO = examDateTime.toISOString()

            const submitData = {
                subject_id: formData.subject_id,
                exam_date: examDateISO,
                location: formData.location,
                max_students: formData.max_students ? parseInt(formData.max_students) : 1
            }

            await apiClient.updateExamSession(sessionId, submitData, token)
            router.push(`/dashboard/professor/exam-sessions/${sessionId}`)
        } catch (error) {
            console.error("Error updating exam session:", error)
        } finally {
            setSubmitting(false)
        }
    }

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    if (loading) {
        return (
            <DashboardLayout title="Edit Exam Session">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        )
    }

    if (!examSession) {
        return (
            <DashboardLayout title="Edit Exam Session">
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
        <DashboardLayout title="Edit Exam Session">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/professor/exam-sessions/${sessionId}`)}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Session
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Edit Exam Session</h2>
                        <p className="text-muted-foreground">Update the details of your exam session</p>
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
                                        Update the details for your exam session
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
                                                Update the exam date and time when students will take the exam
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium">Location</p>
                                            <p className="text-xs text-muted-foreground">
                                                Update where the exam will take place
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium">Capacity</p>
                                            <p className="text-xs text-muted-foreground">
                                                Update the maximum number of students if needed
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
                                                Updating...
                                            </>
                                        ) : (
                                            "Update Exam Session"
                                        )}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => router.push(`/dashboard/professor/exam-sessions/${sessionId}`)}
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
