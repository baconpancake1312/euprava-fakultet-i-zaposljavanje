"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GraduationCap } from "lucide-react"

interface Student {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  major?: string
  year?: number
  gpa?: number
  espb?: number
  scholarship?: boolean
}

export default function AdminStudentsPage() {
  const { token } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      loadStudents()
    }
  }, [token])

  const loadStudents = async () => {
    try {
      const data = await apiClient.getAllStudents(token!)
      setStudents(data)
    } catch (error) {
      console.error("Failed to load students:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Student Management</h1>
          <p className="text-muted-foreground">View all registered students</p>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : students.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">No students found</CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {students.map((student) => (
              <Card key={student.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <GraduationCap className="h-5 w-5" />
                        {student.first_name} {student.last_name}
                      </CardTitle>
                      <CardDescription>{student.email}</CardDescription>
                    </div>
                    {student.scholarship && <Badge className="bg-blue-500">Scholarship</Badge>}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Major</p>
                      <p className="text-muted-foreground">{student.major || "Not set"}</p>
                    </div>
                    <div>
                      <p className="font-medium">Year</p>
                      <p className="text-muted-foreground">{student.year || "Not set"}</p>
                    </div>
                    <div>
                      <p className="font-medium">GPA</p>
                      <p className="text-muted-foreground">{student.gpa?.toFixed(2) || "N/A"}</p>
                    </div>
                    <div>
                      <p className="font-medium">ESPB</p>
                      <p className="text-muted-foreground">{student.espb || "N/A"}</p>
                    </div>
                    <div>
                      <p className="font-medium">Phone</p>
                      <p className="text-muted-foreground">{student.phone}</p>
                    </div>
                    <div>
                      <p className="font-medium">Student ID</p>
                      <p className="text-muted-foreground font-mono text-xs">{student.id}</p>
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
