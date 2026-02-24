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
import { Loader2, X, FileText, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const MAX_CV_SIZE_MB = 5

export default function CompleteCandidateProfile() {
  const router = useRouter()
  const { user, token } = useAuth()
  const [cvFile, setCvFile] = useState<{ name: string; base64: string } | null>(null)
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("")
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_CV_SIZE_MB * 1024 * 1024) {
      setError(`File is too large. Maximum size is ${MAX_CV_SIZE_MB} MB.`)
      e.target.value = ""
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setCvFile({ name: file.name, base64: reader.result as string })
    }
    reader.onerror = () => setError("Failed to read the file. Please try again.")
    reader.readAsDataURL(file)
  }

  const addSkill = () => {
    const trimmed = skillInput.trim()
    if (trimmed && !skills.includes(trimmed)) {
      setSkills((prev) => [...prev, trimmed])
      setSkillInput("")
    }
  }

  const removeSkill = (skill: string) => setSkills((prev) => prev.filter((s) => s !== skill))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!cvFile) {
      setError("Please upload your CV before saving.")
      return
    }
    if (skills.length === 0) {
      setError("Please add at least one skill.")
      return
    }

    setLoading(true)
    try {
      if (!token || !user?.id) throw new Error("Not authenticated")

      const payload = {
        // Spread user so the backend has first_name, last_name, email, etc.
        ...user,
        // Explicitly set id so the upsert filter matches the existing document
        id: user.id,
        cv_file: cvFile.name,
        cv_base64: cvFile.base64,
        skills,
      }

      await apiClient.createCandidate(payload, token)
      router.push("/dashboard/candidate")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout title="Complete Candidate Profile">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Complete Your Candidate Profile</h2>
          <p className="text-muted-foreground">Upload your CV and add skills to start applying for jobs.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Professional Information</CardTitle>
            <CardDescription>
              Accepted formats: PDF, DOC, DOCX — max {MAX_CV_SIZE_MB} MB
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* CV Upload */}
              <div className="space-y-2">
                <Label htmlFor="cv">CV / Resume *</Label>
                <Input
                  id="cv"
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileChange}
                  disabled={loading}
                />
                {cvFile && (
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className="truncate font-medium">{cvFile.name}</span>
                    <button
                      type="button"
                      onClick={() => setCvFile(null)}
                      className="ml-auto shrink-0 text-muted-foreground hover:text-destructive"
                      disabled={loading}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Skills */}
              <div className="space-y-2">
                <Label htmlFor="skills">Skills *</Label>
                <div className="flex gap-2">
                  <Input
                    id="skills"
                    placeholder="e.g., JavaScript, React, Node.js"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addSkill()
                      }
                    }}
                    disabled={loading}
                  />
                  <Button type="button" onClick={addSkill} disabled={loading || !skillInput.trim()}>
                    Add
                  </Button>
                </div>
                {skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {skills.map((skill) => (
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
                ) : (
                  <p className="text-sm text-muted-foreground">Add at least one skill.</p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={loading || !cvFile || skills.length === 0}
                  className="bg-[#FF5A5F] hover:bg-[#e04e53] text-white"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
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
