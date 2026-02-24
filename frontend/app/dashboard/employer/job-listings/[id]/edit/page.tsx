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
  const { user, token, isLoading, isAuthenticated } = useAuth()
  const [formData, setFormData] = useState({
    position: "",
    description: "",
    location: "",
    salary: "",
    requirements: "",
    benefits: "",
    work_type: "",
    expire_at: "",
    is_internship: false,
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [employerId, setEmployerId] = useState<string | null>(null)

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated || !token || !params?.id) {
      setLoading(false)
      setError("Authentication required or invalid job listing ID")
      return
    }

    const loadJobListing = async () => {
      try {
        // Get employer profile first
        const employer = await apiClient.getEmployerByUserId(user!.id, token)
        setEmployerId(employer.id)
        
        const jobId = Array.isArray(params.id) ? params.id[0] : params.id
        const jobData = await apiClient.getJobListingById(jobId, token)
        
        // Check if user owns this job listing (using employer ID)
        if (jobData.poster_id !== employer.id && jobData.posterId !== employer.id) {
          setError("You don't have permission to edit this job listing")
          setLoading(false)
          return
        }

        setFormData({
          position: jobData.position || "",
          description: jobData.description || "",
          location: jobData.location || "",
          salary: jobData.salary || "",
          requirements: jobData.requirements || "",
          benefits: jobData.benefits || "",
          work_type: jobData.work_type || "",
          expire_at: jobData.expire_at
            ? new Date(jobData.expire_at).toISOString().split("T")[0]
            : "",
          is_internship: jobData.is_internship || false,
        })
      } catch (err) {
        console.error("Error loading job listing:", err)
        setError(err instanceof Error ? err.message : "Failed to load job listing")
      } finally {
        setLoading(false)
      }
    }

    loadJobListing()
  }, [token, params?.id, isLoading, isAuthenticated, user])

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
        location: formData.location || undefined,
        salary: formData.salary || undefined,
        requirements: formData.requirements || undefined,
        benefits: formData.benefits || undefined,
        work_type: formData.work_type || undefined,
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

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="e.g. Belgrade, Remote, Hybrid"
                    value={formData.location}
                    onChange={(e) => updateField("location", e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="work_type">Work Type</Label>
                  <Input
                    id="work_type"
                    placeholder="e.g. Remote, Hybrid, On-site"
                    value={formData.work_type}
                    onChange={(e) => updateField("work_type", e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="salary">Salary</Label>
                <Input
                  id="salary"
                  placeholder="e.g. 50,000 - 70,000 RSD/month"
                  value={formData.salary}
                  onChange={(e) => updateField("salary", e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="requirements">Requirements</Label>
                <Textarea
                  id="requirements"
                  placeholder="List the required skills, experience, education..."
                  value={formData.requirements}
                  onChange={(e) => updateField("requirements", e.target.value)}
                  disabled={saving}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="benefits">Benefits</Label>
                <Textarea
                  id="benefits"
                  placeholder="List the benefits offered (health insurance, flexible hours, etc.)..."
                  value={formData.benefits}
                  onChange={(e) => updateField("benefits", e.target.value)}
                  disabled={saving}
                  rows={4}
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
