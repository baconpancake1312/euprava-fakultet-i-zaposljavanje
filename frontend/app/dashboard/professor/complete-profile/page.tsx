"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function CompleteProfessorProfile() {
  const router = useRouter()
  const { user, token } = useAuth()
  const [formData, setFormData] = useState({
    office: "",
    subjects: [] as string[],
    subjectInput: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const addSubject = () => {
    if (formData.subjectInput.trim() && !formData.subjects.includes(formData.subjectInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        subjects: [...prev.subjects, prev.subjectInput.trim()],
        subjectInput: "",
      }))
    }
  }

  const removeSubject = (subject: string) => {
    setFormData((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((s) => s !== subject),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (!token || !user?.id) throw new Error("Not authenticated")

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      router.push("/dashboard/professor")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile")
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout title="Complete Professor Profile">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Complete Your Professor Profile</h2>
          <p className="text-muted-foreground">Add your teaching information</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Teaching Information</CardTitle>
            <CardDescription>Fill in your professor details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="office">Office Location *</Label>
                <Input
                  id="office"
                  placeholder="Building A, Room 301"
                  value={formData.office}
                  onChange={(e) => setFormData({ ...formData, office: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subjects">Subjects *</Label>
                <div className="flex gap-2">
                  <Input
                    id="subjects"
                    placeholder="e.g., Data Structures, Algorithms"
                    value={formData.subjectInput}
                    onChange={(e) => setFormData((prev) => ({ ...prev, subjectInput: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addSubject()
                      }
                    }}
                    disabled={loading}
                  />
                  <Button type="button" onClick={addSubject} disabled={loading}>
                    Add
                  </Button>
                </div>
                {formData.subjects.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.subjects.map((subject) => (
                      <Badge key={subject} variant="secondary" className="gap-1">
                        {subject}
                        <button
                          type="button"
                          onClick={() => removeSubject(subject)}
                          className="ml-1 hover:text-destructive"
                          disabled={loading}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                {formData.subjects.length === 0 && (
                  <p className="text-sm text-muted-foreground">Add at least one subject</p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={loading || formData.subjects.length === 0}>
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
