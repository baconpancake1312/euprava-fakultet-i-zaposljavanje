"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Major } from "@/lib/types"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"


export default function CompleteStudentProfile() {
  const router = useRouter()
  const { user, token } = useAuth()

  const [majors, setMajors] = useState<Major[]>([])
  const [formData, setFormData] = useState({
    major: "",
    year: "",
    assigned_dorm: "",
    scholarship: false,
    highschool_gpa: "",
    gpa: "",
    espb: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingMajors, setLoadingMajors] = useState(true)

  useEffect(() => {
    const fetchMajors = async () => {
      try {
        const res = await fetch("http://localhost:8088/majors")
        if (!res.ok) throw new Error("Failed to fetch majors")
        const data = await res.json()
        setMajors(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error(err)
        setError("Could not load majors list")
      } finally {
        setLoadingMajors(false)
      }
    }
    fetchMajors()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (!token || !user?.id) throw new Error("Not authenticated")

      const data = {
        major_id: formData.major,
        year: Number.parseInt(formData.year),
        scholarship: formData.scholarship,
        highschool_gpa: Number.parseFloat(formData.highschool_gpa),
      }

      await apiClient.updateStudent(user.id, data, token)
      router.push("/dashboard/student")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile")
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <DashboardLayout title="Complete Student Profile">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Complete Your Student Profile</h2>
          <p className="text-muted-foreground">
            Add your academic information to access all university services
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Academic Information</CardTitle>
            <CardDescription>Fill in your student details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Major Dropdown */}
              <div className="space-y-2">
                <Label htmlFor="major">Major / Program *</Label>
                {loadingMajors ? (
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading majors...</span>
                  </div>
                ) : majors && majors.length > 0 ? (
                  <select
                    id="major"
                    className="w-full border border-input bg-background rounded-md p-2"
                    value={formData.major}
                    onChange={(e) => updateField("major", e.target.value)}
                    required
                    disabled={loading}
                  >
                    <option value="">Select a major</option>
                    {majors.map((major) => (
                      <option key={major.id} value={major.id}>
                        {major.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No majors available. Please contact your administrator.
                  </div>
                )}
              </div>


              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year">Current Year *</Label>
                  <Input
                    id="year"
                    type="number"
                    min="1"
                    max="6"
                    placeholder="1"
                    value={formData.year}
                    onChange={(e) => updateField("year", e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="highschool_gpa">High School GPA *</Label>
                  <Input
                    id="highschool_gpa"
                    type="number"
                    step="0.01"
                    min="0"
                    max="5"
                    placeholder="4.5"
                    value={formData.highschool_gpa}
                    onChange={(e) => updateField("highschool_gpa", e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Profile"
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
