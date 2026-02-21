"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
    BookOpen,
    Users,
    Calendar,
    ArrowLeft,
    Loader2,
    GraduationCap,
    Clock,
    User
} from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { Subject, Major, Student } from "@/lib/types"

export default function CourseDetailPage() {
    const router = useRouter()
    const params = useParams()
    const { user, token, isAuthenticated } = useAuth()
    const [loading, setLoading] = useState(true)
    const [course, setCourse] = useState<Subject | null>(null)
    const [major, setMajor] = useState<Major | null>(null)
    const [students, setStudents] = useState<Student[]>([])

    const courseId = params.courseId as string

    useEffect(() => {
        if (!isAuthenticated || user?.user_type !== "PROFESSOR") {
            router.push("/login")
            return
        }

        if (courseId) {
            fetchCourseData()
        }
    }, [isAuthenticated, user, router, courseId])

    const fetchCourseData = async () => {
        try {
            if (!token || !courseId) return

            // Fetch course details and major
            const courseData = await apiClient.getCourseById(courseId, token)
            setCourse(courseData)

            if (courseData.major_id) {
                const majorData = await apiClient.getMajorById(courseData.major_id, token)
                setMajor(majorData)
            }

            // Fetch all students, then filter by same major and exclude those who passed this subject
            const allStudents = await apiClient.getAllStudents(token)
            const majorId = courseData.major_id ?? (courseData as any).major_id
            if (!majorId) {
                setStudents([])
                return
            }

            const studentsInMajor = allStudents.filter((s: Student & { major_id?: string }) => {
                const sid = s.major_id ?? (s as any).major_id
                return sid === majorId
            })

            // For each student in major, check exam-grades/student/{student_id}; exclude if they have passed this subject
            const studentsNotPassed = await Promise.all(
                studentsInMajor.map(async (student) => {
                    try {
                        const grades = await apiClient.getAllExamGradesForStudent(student.id, token)
                        const gradeList = Array.isArray(grades) ? grades : []
                        const passedThisSubject = gradeList.some((g: any) => {
                            const subId = g.subject_id ?? g.subjectId
                            if (subId !== courseId) return false
                            const passed = g.passed ?? g.Passed
                            return passed === true || passed === "true" || passed === "passed"
                        })
                        return passedThisSubject ? null : student
                    } catch {
                        return student
                    }
                })
            )

            setStudents(studentsNotPassed.filter((s): s is Student => s != null))
        } catch (error) {
            console.error("Error fetching course data:", error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <DashboardLayout title="Course Details">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        )
    }

    if (!course) {
        return (
            <DashboardLayout title="Course Details">
                <div className="flex flex-col items-center justify-center py-12">
                    <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Course not found</h3>
                    <p className="text-muted-foreground mb-4">The requested course could not be found.</p>
                    <Button onClick={() => router.push("/dashboard/professor/courses")}>
                        Back to Courses
                    </Button>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout title="Course Details">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push("/dashboard/professor/courses")}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Courses
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">{course.name}</h2>
                        <p className="text-muted-foreground">
                            {major?.name || "Unknown Major"} • Year {course.year}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Course Information */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BookOpen className="h-5 w-5" />
                                    Course Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Year</p>
                                        <Badge variant="secondary">Year {course.year}</Badge>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Major</p>
                                        <p className="font-medium">{major?.name || "Unknown"}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Students Section */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    Enrolled Students
                                </CardTitle>
                                <CardDescription>
                                    Students in this major who have not yet passed this subject
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {students.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                        <p className="text-muted-foreground">
                                            No students in this major, or all have already passed this subject.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {students.map((student) => (
                                            <div key={student.id} className="flex items-center justify-between p-3 border rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                                        <User className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{student.first_name} {student.last_name}</p>
                                                        <p className="text-sm text-muted-foreground">{student.email}</p>
                                                    </div>
                                                </div>
                                                <Badge variant="outline">
                                                    {major?.name || (student as any).major?.name || "Same major"}
                                                </Badge>
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
                                    onClick={() => {
                                        // Navigate to exam management for this course
                                        router.push(`/dashboard/professor/exam-sessions?course=${course.id}`)
                                    }}
                                >
                                    <Calendar className="h-4 w-4 mr-2" />
                                    Manage Exams
                                </Button>
                                <Button
                                    className="w-full justify-start"
                                    variant="outline"
                                    onClick={() => {
                                        // Navigate to grades management for this course
                                        router.push(`/dashboard/professor/grades?course=${course.id}`)
                                    }}
                                >
                                    <GraduationCap className="h-4 w-4 mr-2" />
                                    Manage Grades
                                </Button>
                                <Button
                                    className="w-full justify-start"
                                    variant="outline"
                                    onClick={() => {
                                        // Navigate to students management for this course
                                        router.push(`/dashboard/professor/students?course=${course.id}`)
                                    }}
                                >
                                    <Users className="h-4 w-4 mr-2" />
                                    View Students
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Course Stats */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Course Statistics</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Total Students</span>
                                    <span className="font-semibold">{students.length}</span>
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Course Year</span>
                                    <Badge variant="secondary">Year {course.year}</Badge>
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Status</span>
                                    <Badge variant={course.hasPassed ? "default" : "secondary"}>
                                        {course.hasPassed ? "Active" : "Inactive"}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
