"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
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
import { Loader2, ArrowLeft } from "lucide-react"

export default function EditJobListingPage() {
  const router = useRouter()
  const params = useParams()
  const { user, token, isLoading } = useAuth()
  const [formData, setFormData] = useState({
    position: "",
    description: "",
    expire_at: "",
    is_internship: false,
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isLoading) return

    if (!token || !params?.id) {
      setLoading(false)
      setError("Authentication required or invalid job listing ID")
      return
    }

    const loadJobListing = async () => {
      try {
        const jobId = Array.isArray(params.id) ? params.id[0] : params.id
        const jobData = await apiClient.getJobListingById(jobId, token)
        
        // Check if user owns this job listing
        if (jobData.poster_id !== user?.id && jobData.posterId !== user?.id) {
          setError("You don't have permission to edit this job listing")
          setLoading(false)
          return
        }

        setFormData({
          position: jobData.position || "",
          description: jobData.description || "",
          expire_at: jobData.expire_at
            ? new Date(jobData.expire_at).toISOString().split("T")[0]
            : "",
          is_internship: jobData.is_internship || false,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load job listing")
      } finally {
        setLoading(false)
      }
    }

    loadJobListing()
  }, [token, params?.id, isLoading, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSaving(true)

    try {
      if (!token || !params?.id) throw new Error("Not authenticated")

      const jobId = Array.isArray(params.id) ? params.id[0] : params.id
      const data = {
        position: formData.position,
        description: formData.description,
        expire_at: formData.expire_at ? new Date(formData.expire_at).toISOString() : undefined,
        is_internship: formData.is_internship,
      }

      await apiClient.updateJobListing(jobId, data, token)
      router.push(`/dashboard/employer/job-listings/${jobId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update job listing")
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <DashboardLayout title="Edit Job Listing">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Edit Job Listing">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div>
          <h2 className="text-2xl font-bold">Edit Job Listing</h2>
          <p className="text-muted-foreground">Update job information</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
            <CardDescription>Update the job information</CardDescription>
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
                  disabled={saving}
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
                  disabled={saving}
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
                  disabled={saving}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_internship"
                  checked={formData.is_internship}
                  onCheckedChange={(checked) => updateField("is_internship", checked as boolean)}
                  disabled={saving}
                />
                <Label htmlFor="is_internship" className="cursor-pointer">
                  This is an internship position
                </Label>
              </div>

              <Alert>
                <AlertDescription>
                  Note: After updating, your job listing will need to be re-approved by administrators.
                </AlertDescription>
              </Alert>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>
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
