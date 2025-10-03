"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

export default function CompleteStudentProfile() {
  const router = useRouter()
  const { user, token, updateUser } = useAuth()
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (!token || !user?.id) throw new Error("Not authenticated")

      const data = {
        ...user,
        major: formData.major,
        year: Number.parseInt(formData.year),
        assigned_dorm: formData.assigned_dorm || undefined,
        scholarship: formData.scholarship,
        highschool_gpa: Number.parseFloat(formData.highschool_gpa),
        gpa: Number.parseFloat(formData.gpa),
        espb: Number.parseInt(formData.espb),
      }

      await apiClient.updateStudent(user.id, data, token)
      
      // Update user with university profile created flag
      const updatedUser = {
        ...user,
        university_profile_created: true,
      }
      
      // Update user context
      updateUser(updatedUser)
      
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
          <p className="text-muted-foreground">Add your academic information to access all university services</p>
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

              <div className="space-y-2">
                <Label htmlFor="major">Major / Program *</Label>
                <Input
                  id="major"
                  placeholder="Computer Science"
                  value={formData.major}
                  onChange={(e) => updateField("major", e.target.value)}
                  required
                  disabled={loading}
                />
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

                <div className="space-y-2">
                  <Label htmlFor="espb">ESPB Credits *</Label>
                  <Input
                    id="espb"
                    type="number"
                    min="0"
                    placeholder="60"
                    value={formData.espb}
                    onChange={(e) => updateField("espb", e.target.value)}
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

                <div className="space-y-2">
                  <Label htmlFor="gpa">Current GPA *</Label>
                  <Input
                    id="gpa"
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    placeholder="8.5"
                    value={formData.gpa}
                    onChange={(e) => updateField("gpa", e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assigned_dorm">Assigned Dorm (Optional)</Label>
                <Input
                  id="assigned_dorm"
                  placeholder="Dorm A"
                  value={formData.assigned_dorm}
                  onChange={(e) => updateField("assigned_dorm", e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="scholarship"
                  checked={formData.scholarship}
                  onCheckedChange={(checked) => updateField("scholarship", checked as boolean)}
                  disabled={loading}
                />
                <Label htmlFor="scholarship" className="cursor-pointer">
                  I have a scholarship
                </Label>
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
