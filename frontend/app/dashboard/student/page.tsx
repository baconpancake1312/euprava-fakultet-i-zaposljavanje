"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ProfileCompletionPrompt } from "@/components/profile-completion-prompt"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Calendar, GraduationCap, Briefcase, Loader2 } from "lucide-react"
import { apiClient } from "@/lib/api-client"

export default function StudentDashboard() {
  const router = useRouter()
  const { user, token, isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(true)
  const [studentData, setStudentData] = useState<any>(null)
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || user?.user_type !== "STUDENT") {
      router.push("/login")
      return
    }

    checkStudentProfile()
  }, [isAuthenticated, user, router])

  const checkStudentProfile = async () => {
    try {
      if (!token || !user?.id) return

      const data = await apiClient.getStudentById(user.id, token)
      setStudentData(data)

      // Check if profile needs completion
      const missingFields = []
      if (!data.major) missingFields.push("major")
      if (!data.year) missingFields.push("year")
      if (!data.gpa) missingFields.push("gpa")

      setNeedsProfileCompletion(missingFields.length > 0)
    } catch (error) {
      // Student profile doesn't exist yet
      setNeedsProfileCompletion(true)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Student Dashboard">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Student Dashboard">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Welcome back, {user?.first_name}!</h2>
          <p className="text-muted-foreground">Manage your academic journey and career opportunities</p>
        </div>

        {needsProfileCompletion && (
          <ProfileCompletionPrompt
            title="Complete Your Student Profile"
            description="To access all university services, please complete your student profile with academic information."
            missingFields={["Major/Program", "Current Year", "GPA", "ESPB Credits"]}
            onComplete={() => router.push("/dashboard/student/complete-profile")}
          />
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card
            className="hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => router.push("/dashboard/student/courses")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>My Courses</CardTitle>
                  <CardDescription>View enrolled courses</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Access course materials, schedules, and professors</p>
            </CardContent>
          </Card>

          <Card
            className="hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => router.push("/dashboard/student/exams")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Exams</CardTitle>
                  <CardDescription>Register for exams</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">View exam calendar and register for upcoming exams</p>
            </CardContent>
          </Card>

          <Card
            className="hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => router.push("/dashboard/student/academic")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <GraduationCap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Academic Info</CardTitle>
                  <CardDescription>Track your progress</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">View GPA, ESPB credits, and academic standing</p>
            </CardContent>
          </Card>

          <Card
            className="hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => router.push("/dashboard/student/internships")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Briefcase className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <CardTitle>Internships</CardTitle>
                  <CardDescription>Find opportunities</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Browse and apply for internship positions</p>
            </CardContent>
          </Card>
        </div>

        {studentData && (
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Major</p>
                  <p className="text-lg font-semibold">{studentData.major || "Not set"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Year</p>
                  <p className="text-lg font-semibold">{studentData.year || "Not set"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">GPA</p>
                  <p className="text-lg font-semibold">{studentData.gpa?.toFixed(2) || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ESPB</p>
                  <p className="text-lg font-semibold">{studentData.espb || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
