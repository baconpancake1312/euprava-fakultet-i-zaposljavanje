"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Calendar,
    Plus,
    Eye,
    Edit,
    Trash2,
    Loader2,
    Clock,
    MapPin,
    Users,
    BookOpen,
    Filter
} from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { ExamSession, Subject, ExamPeriod } from "@/lib/types"

export default function ExamSessionsPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { user, token, isAuthenticated } = useAuth()
    const [loading, setLoading] = useState(true)
    const [examSessions, setExamSessions] = useState<ExamSession[]>([])
    const [courses, setCourses] = useState<Subject[]>([])
    const [examPeriods, setExamPeriods] = useState<ExamPeriod[]>([])

    const courseFilter = searchParams.get("course") ?? "all"
    const periodFilter = searchParams.get("period") ?? "all"

    const setCourseFilter = (value: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (value === "all") {
            params.delete("course")
        } else {
            params.set("course", value)
        }
        const query = params.toString()
        router.replace(query ? `/dashboard/professor/exam-sessions?${query}` : "/dashboard/professor/exam-sessions")
    }

    const setPeriodFilter = (value: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (value === "all") {
            params.delete("period")
        } else {
            params.set("period", value)
        }
        const query = params.toString()
        router.replace(query ? `/dashboard/professor/exam-sessions?${query}` : "/dashboard/professor/exam-sessions")
    }

    useEffect(() => {
        if (!isAuthenticated || user?.user_type !== "PROFESSOR") {
            router.push("/login")
            return
        }

        fetchData()
    }, [isAuthenticated, user, router])

    // Debug effect to log state changes
    useEffect(() => {
        console.log("Exam sessions state changed:", examSessions)
        console.log("Courses state changed:", courses)
    }, [examSessions, courses])

    const fetchData = async () => {
        try {
            if (!token || !user?.id) return

            const [sessionsData, coursesData, periodsData] = await Promise.all([
                apiClient.getExamSessionsByProfessor(user.id, token),
                apiClient.getCoursesByProfessor(user.id, token),
                apiClient.getAllExamPeriods(token).catch(() => []),
            ])
            console.log("Fetched exam sessions:", sessionsData)
            setExamSessions(sessionsData as ExamSession[] || [])
            console.log("Fetched courses:", coursesData)
            setCourses(coursesData as Subject[] || [])
            setExamPeriods(Array.isArray(periodsData) ? periodsData : [])
        } catch (error) {
            console.error("Error fetching data:", error)
            setExamSessions([])
            setCourses([])
            setExamPeriods([])
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (sessionId: string) => {
        try {
            if (!token) return
            await apiClient.deleteExamSession(sessionId, token)
            setExamSessions(prev => prev.filter(session => session.id !== sessionId))
        } catch (error) {
            console.error("Error deleting exam session:", error)
        }
    }

    const getCourseName = (subjectId: string) => {
        console.log("getCourseName called with subjectId:", subjectId)
        console.log("Available courses:", courses)
        console.log("Course IDs:", courses.map(c => ({ id: c.id, name: c.name })))

        const course = courses.find(c => c.id === subjectId)
        console.log("Found course:", course)

        const result = course?.name || "Unknown Course"
        console.log("Returning course name:", result)
        return result
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

    const filteredSessions = examSessions.filter((session) => {
        const subjectId = (session as any).subject_id ?? session.subject?.id
        const courseMatch = courseFilter === "all" || subjectId === courseFilter
        const periodId = (session as any).exam_period_id ?? session.exam_period_id
        const periodMatch = periodFilter === "all" || periodId === periodFilter
        return courseMatch && periodMatch
    })

    if (loading) {
        return (
            <DashboardLayout title="Exam Sessions">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout title="Exam Sessions">
            <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Exam Sessions</h2>
                        <p className="text-muted-foreground">Manage your exam sessions and view registrations</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            <Select value={courseFilter} onValueChange={setCourseFilter}>
                                <SelectTrigger className="w-[220px]">
                                    <SelectValue placeholder="Filter by course" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All courses</SelectItem>
                                    {courses.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={periodFilter} onValueChange={setPeriodFilter}>
                                <SelectTrigger className="w-[220px]">
                                    <SelectValue placeholder="Filter by exam period" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All exam periods</SelectItem>
                                    {examPeriods.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={() => router.push("/dashboard/professor/exam-sessions/create")}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Exam Session
                        </Button>
                    </div>
                </div>

                {/* Exam Sessions Grid */}
                {!examSessions || examSessions.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No exam sessions found</h3>
                            <p className="text-muted-foreground text-center mb-4">
                                You haven't created any exam sessions yet.
                            </p>
                            <Button onClick={() => router.push("/dashboard/professor/exam-sessions/create")}>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Your First Exam Session
                            </Button>
                        </CardContent>
                    </Card>
                ) : filteredSessions.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No sessions match filters</h3>
                            <p className="text-muted-foreground text-center mb-4">
                                No exam sessions match the selected course or exam period. Try another filter or create a session.
                            </p>
                            <Button variant="outline" onClick={() => { setCourseFilter("all"); setPeriodFilter("all") }}>
                                Clear filters
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredSessions.map((session) => (
                            <Card key={session.id} className="hover:border-primary/50 transition-colors">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <CardTitle className="text-lg">{getCourseName((session as any).subject_id ?? session.subject?.id ?? "")}</CardTitle>
                                            <CardDescription>
                                                Exam Session
                                            </CardDescription>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => router.push(`/dashboard/professor/exam-sessions/${session.id}`)}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => router.push(`/dashboard/professor/exam-sessions/${session.id}/edit`)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="outline" size="sm">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete Exam Session</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Are you sure you want to delete this exam session? This action cannot be undone.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => handleDelete(session.id)}
                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                        >
                                                            Delete
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Calendar className="h-4 w-4" />
                                            <span>{formatDate(session.exam_date)}</span>
                                        </div>

                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Clock className="h-4 w-4" />
                                            <span>{formatTime(session.exam_date)}</span>
                                        </div>

                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <MapPin className="h-4 w-4" />
                                            <span>{session.location}</span>
                                        </div>

                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Users className="h-4 w-4" />
                                            <span>Max: {session.max_students} students</span>
                                        </div>

                                        <div className="pt-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full"
                                                onClick={() => router.push(`/dashboard/professor/exam-sessions/${session.id}`)}
                                            >
                                                View Details & Registrations
                                            </Button>
                                        </div>
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
