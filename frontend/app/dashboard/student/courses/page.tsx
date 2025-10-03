"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, BookOpen, User, Calendar } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function StudentCoursesPage() {
  const { token } = useAuth()
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    try {
      if (!token) throw new Error("Not authenticated")
      const data = await apiClient.getAllCourses(token)
      setCourses(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load courses")
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout title="My Courses">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">My Courses</h2>
          <p className="text-muted-foreground">View your enrolled courses and schedules</p>
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
        ) : courses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No courses found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {courses.map((course) => (
              <Card key={course.id} className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    {course.name}
                  </CardTitle>
                  <CardDescription>{course.department?.name || "Department"}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {course.professor && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Prof. {course.professor.first_name} {course.professor.last_name}
                      </span>
                    </div>
                  )}
                  {course.schedule && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{course.schedule}</span>
                    </div>
                  )}
                  {course.prerequisites && course.prerequisites.length > 0 && (
                    <div className="text-sm">
                      <p className="text-muted-foreground mb-1">Prerequisites:</p>
                      <div className="flex flex-wrap gap-1">
                        {course.prerequisites.map((prereq: string, idx: number) => (
                          <span key={idx} className="px-2 py-1 bg-muted rounded text-xs">
                            {prereq}
                          </span>
                        ))}
                      </div>
                    </div>
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
