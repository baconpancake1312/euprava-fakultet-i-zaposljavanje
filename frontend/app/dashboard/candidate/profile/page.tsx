"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, FileText, X } from "lucide-react"

export default function CandidateProfilePage() {
  const router = useRouter()
  const { isAuthenticated, isLoading, user, token } = useAuth()
  const [formData, setFormData] = useState({
    major: "",
    year: 1,
    scholarship: false,
    highschool_gpa: 0,
    gpa: 0,
    esbp: 0,
    cv_base64: "",
    skills: [] as string[],
    skillInput: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
      return
    }

    const loadCandidateData = async () => {
      if (!token || !user?.id) return

      try {
        const candidate = await apiClient.getCandidateByUserId(user.id, token)
        setFormData({
          major: candidate.major || "",
          year: candidate.year || 1,
          scholarship: candidate.scholarship || false,
          highschool_gpa: candidate.highschool_gpa || 0,
          gpa: candidate.gpa || 0,
          esbp: candidate.esbp || 0,
          cv_base64: candidate.cv_base64 || "",
          skills: candidate.skills || [],
          skillInput: "",
        })
      } catch (err) {
        console.error("Failed to load candidate data:", err)
      }
    }

    loadCandidateData()
  }, [isAuthenticated, isLoading, router, token, user])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string
        setFormData((prev) => ({ ...prev, cv_base64: base64 }))
      }
      reader.readAsDataURL(file)
    }
  }

  const addSkill = () => {
    if (formData.skillInput.trim() && !formData.skills.includes(formData.skillInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, prev.skillInput.trim()],
        skillInput: "",
      }))
    }
  }

  const removeSkill = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(false)
    setLoading(true)

    try {
      if (!token || !user?.id) throw new Error("Not authenticated")

      const updateData = {
        major: formData.major,
        year: formData.year,
        scholarship: formData.scholarship,
        highschool_gpa: formData.highschool_gpa,
        gpa: formData.gpa,
        esbp: formData.esbp,
        cv_base64: formData.cv_base64,
        skills: formData.skills,
      }

      await apiClient.updateCandidate(user.id, updateData, token)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile")
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout title="Profile">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Profile">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Candidate Profile</h2>
          <p className="text-muted-foreground">Manage your professional information</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Academic Information</CardTitle>
            <CardDescription>Update your academic details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert>
                  <AlertDescription>Profile updated successfully!</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="major">Major / Field of Study</Label>
                  <Input
                    id="major"
                    placeholder="e.g., Computer Science"
                    value={formData.major}
                    onChange={(e) => setFormData((prev) => ({ ...prev, major: e.target.value }))}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="year">Academic Year</Label>
                  <Input
                    id="year"
                    type="number"
                    min="1"
                    max="8"
                    value={formData.year}
                    onChange={(e) => setFormData((prev) => ({ ...prev, year: parseInt(e.target.value) || 1 }))}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gpa">Current GPA</Label>
                  <Input
                    id="gpa"
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    placeholder="0.00"
                    value={formData.gpa}
                    onChange={(e) => setFormData((prev) => ({ ...prev, gpa: parseFloat(e.target.value) || 0 }))}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="highschool_gpa">High School GPA</Label>
                  <Input
                    id="highschool_gpa"
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    placeholder="0.00"
                    value={formData.highschool_gpa}
                    onChange={(e) => setFormData((prev) => ({ ...prev, highschool_gpa: parseFloat(e.target.value) || 0 }))}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="esbp">ESBP Points</Label>
                  <Input
                    id="esbp"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.esbp}
                    onChange={(e) => setFormData((prev) => ({ ...prev, esbp: parseInt(e.target.value) || 0 }))}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scholarship">Scholarship</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      id="scholarship"
                      type="checkbox"
                      checked={formData.scholarship}
                      onChange={(e) => setFormData((prev) => ({ ...prev, scholarship: e.target.checked }))}
                      disabled={loading}
                      className="rounded"
                    />
                    <Label htmlFor="scholarship" className="text-sm">I receive a scholarship</Label>
                  </div>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Professional Information</CardTitle>
            <CardDescription>Update your CV and skills</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cv">CV / Resume</Label>
                <Input id="cv" type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} disabled={loading} />
                {formData.cv_base64 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    CV uploaded
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="skills">Skills</Label>
                <div className="flex gap-2">
                  <Input
                    id="skills"
                    placeholder="Add a skill"
                    value={formData.skillInput}
                    onChange={(e) => setFormData((prev) => ({ ...prev, skillInput: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addSkill()
                      }
                    }}
                    disabled={loading}
                  />
                  <Button type="button" onClick={addSkill} disabled={loading}>
                    Add
                  </Button>
                </div>
                {formData.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="gap-1">
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="ml-1 hover:text-destructive"
                          disabled={loading}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
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
