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
import { Loader2, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function CompleteCandidateProfile() {
  const router = useRouter()
  const { user, token } = useAuth()
  const [formData, setFormData] = useState({
    cv_base64: "",
    skills: [] as string[],
    skillInput: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

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
    setLoading(true)

    try {
      if (!token || !user?.id) throw new Error("Not authenticated")

      const data = {
        ...user,
        cv_base64: formData.cv_base64,
        skills: formData.skills,
      }

      await apiClient.createCandidate(data, token)
      router.push("/dashboard/candidate")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create candidate profile")
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout title="Complete Candidate Profile">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Complete Your Candidate Profile</h2>
          <p className="text-muted-foreground">Add your CV and skills to apply for jobs</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Professional Information</CardTitle>
            <CardDescription>Upload your CV and list your skills</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="cv">CV / Resume *</Label>
                <Input
                  id="cv"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  required={!formData.cv_base64}
                  disabled={loading}
                />
                {formData.cv_base64 && <p className="text-sm text-muted-foreground">CV uploaded successfully</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="skills">Skills *</Label>
                <div className="flex gap-2">
                  <Input
                    id="skills"
                    placeholder="e.g., JavaScript, React, Node.js"
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
                {formData.skills.length === 0 && (
                  <p className="text-sm text-muted-foreground">Add at least one skill</p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={loading || formData.skills.length === 0}>
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
