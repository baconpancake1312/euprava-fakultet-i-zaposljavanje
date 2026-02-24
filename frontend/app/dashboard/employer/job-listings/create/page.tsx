"use client"

import type React from "react"

import { useState, useEffect } from "react"
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
  const { user, token, isLoading: authLoading, isAuthenticated } = useAuth()
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
  const [loading, setLoading] = useState(false)
  const [employerId, setEmployerId] = useState<string | null>(null)
  const [checkingEmployer, setCheckingEmployer] = useState(true)

  useEffect(() => {
    const loadEmployer = async () => {
      if (authLoading) return

      if (!isAuthenticated || !token || !user) {
        setCheckingEmployer(false)
        setError("Please log in to create a job listing")
        return
      }

      try {
        const employer = await apiClient.getEmployerByUserId(user.id, token)
        
        if (!employer || !employer.id) {
          setError("Employer profile not found. Please complete your profile first.")
          setCheckingEmployer(false)
          return
        }

        if (employer.approval_status !== "approved" && employer.approval_status !== "Approved") {
          setError("Your employer profile must be approved before you can create job listings.")
          setCheckingEmployer(false)
          return
        }

        setEmployerId(employer.id)
      } catch (err) {
        console.error("Error loading employer:", err)
        setError("Failed to load employer profile. Please complete your profile first.")
      } finally {
        setCheckingEmployer(false)
      }
    }

    loadEmployer()
  }, [authLoading, isAuthenticated, token, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (!token || !employerId) throw new Error("Not authenticated")

      const data = {
        poster_id: employerId,
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

      console.log("Creating job listing:", data)
      await apiClient.createJobListing(data, token)
      router.push("/dashboard/employer/job-listings")
    } catch (err) {
      console.error("Error creating job listing:", err)
      setError(err instanceof Error ? err.message : "Failed to create job listing")
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Show loading while auth loads
  if (authLoading || checkingEmployer) {
    return (
      <DashboardLayout title="Create Job Listing">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  // Show error if not authenticated or employer not ready
  if (!isAuthenticated || !token || !user || !employerId) {
    return (
      <DashboardLayout title="Create Job Listing">
        <div className="max-w-2xl mx-auto space-y-6">
          <Alert variant="destructive">
            <AlertDescription>{error || "Please log in and complete your employer profile first"}</AlertDescription>
          </Alert>
          <Button onClick={() => router.push("/dashboard/employer")}>
            Go to Dashboard
          </Button>
        </div>
      </DashboardLayout>
    )
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

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="e.g. Belgrade, Remote, Hybrid"
                    value={formData.location}
                    onChange={(e) => updateField("location", e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="work_type">Work Type</Label>
                  <Input
                    id="work_type"
                    placeholder="e.g. Remote, Hybrid, On-site"
                    value={formData.work_type}
                    onChange={(e) => updateField("work_type", e.target.value)}
                    disabled={loading}
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
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="requirements">Requirements</Label>
                <Textarea
                  id="requirements"
                  placeholder="List the required skills, experience, education..."
                  value={formData.requirements}
                  onChange={(e) => updateField("requirements", e.target.value)}
                  disabled={loading}
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
                  disabled={loading}
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
