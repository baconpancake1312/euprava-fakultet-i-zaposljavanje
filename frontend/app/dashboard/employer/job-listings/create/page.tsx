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
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2 } from "lucide-react"

export default function CreateJobListingPage() {
  const router = useRouter()
  const { user, token } = useAuth()
  const [formData, setFormData] = useState({
    position: "",
    description: "",
    expire_at: "",
    is_internship: false,
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
        poster_id: user.id,
        position: formData.position,
        description: formData.description,
        expire_at: formData.expire_at ? new Date(formData.expire_at).toISOString() : undefined,
        is_internship: formData.is_internship,
      }

      await apiClient.createJobListing(data, token)
      router.push("/dashboard/employer/job-listings")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create job listing")
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <DashboardLayout title="Create Job Listing">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Create Job Listing</h2>
          <p className="text-muted-foreground">Post a new job opportunity</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
            <CardDescription>Fill in the job information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="position">Position Title *</Label>
                <Input
                  id="position"
                  placeholder="Senior Software Engineer"
                  value={formData.position}
                  onChange={(e) => updateField("position", e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Job Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the role, responsibilities, and requirements..."
                  value={formData.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  required
                  disabled={loading}
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expire_at">Expiration Date (Optional)</Label>
                <Input
                  id="expire_at"
                  type="date"
                  value={formData.expire_at}
                  onChange={(e) => updateField("expire_at", e.target.value)}
                  disabled={loading}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_internship"
                  checked={formData.is_internship}
                  onCheckedChange={(checked) => updateField("is_internship", checked as boolean)}
                  disabled={loading}
                />
                <Label htmlFor="is_internship" className="cursor-pointer">
                  This is an internship position
                </Label>
              </div>

              <Alert>
                <AlertDescription>
                  Your job listing will be reviewed by administrators before being published.
                </AlertDescription>
              </Alert>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Listing"
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
