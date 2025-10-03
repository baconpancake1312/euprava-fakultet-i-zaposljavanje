"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, GraduationCap, Award, BookOpen, TrendingUp } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function StudentAcademicPage() {
  const { token, user } = useAuth()
  const [studentData, setStudentData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    loadStudentData()
  }, [])

  const loadStudentData = async () => {
    try {
      if (!token || !user?.id) throw new Error("Not authenticated")
      const data = await apiClient.getStudentById(user.id, token)
      setStudentData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load academic data")
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout title="Academic Information">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Academic Information</h2>
          <p className="text-muted-foreground">Track your academic progress and achievements</p>
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
        ) : studentData ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Major</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{studentData.major || "Not set"}</div>
                <p className="text-xs text-muted-foreground">Current program</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Year</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{studentData.year || "N/A"}</div>
                <p className="text-xs text-muted-foreground">Current year</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">GPA</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{studentData.gpa?.toFixed(2) || "N/A"}</div>
                <p className="text-xs text-muted-foreground">Grade point average</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ESPB</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{studentData.espb || 0}</div>
                <p className="text-xs text-muted-foreground">Credits earned</p>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Academic Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">High School GPA:</span>
                  <span className="font-medium">{studentData.highschool_gpa?.toFixed(2) || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scholarship:</span>
                  <span className="font-medium">{studentData.scholarship ? "Yes" : "No"}</span>
                </div>
                {studentData.assigned_dorm && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Assigned Dorm:</span>
                    <span className="font-medium">{studentData.assigned_dorm}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium">{user?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="font-medium">{user?.phone || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">JMBG:</span>
                  <span className="font-medium">{user?.jmbg || "N/A"}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No academic data available</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
