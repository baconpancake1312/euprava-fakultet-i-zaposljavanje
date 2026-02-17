"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Briefcase, Calendar, CheckCircle, Clock, XCircle, Pencil, ArrowLeft } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function EmployerJobListingDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { token, user, isLoading } = useAuth()
  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (isLoading) return // Wait for auth to load
    
    if (!token || !params?.id) {
      setLoading(false)
      setError("Authentication required or invalid job listing ID")
      return
    }
    
    const loadJobListing = async () => {
      try {
        const jobId = Array.isArray(params.id) ? params.id[0] : params.id
        const jobData = await apiClient.getJobListingById(jobId, token)
        setJob(jobData)
      } catch (err) {
        console.error("Error loading job listing:", err)
        setError(err instanceof Error ? err.message : "Failed to load job listing")
      } finally {
        setLoading(false)
      }
    }

    loadJobListing()
  }, [token, params?.id, isLoading])

  if (loading) {
    return (
      <DashboardLayout title="Job Listing Details">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  if (error || !job) {
    return (
      <DashboardLayout title="Job Listing Details">
        <div className="max-w-2xl mx-auto py-8">
          <Alert variant="destructive">
            <AlertDescription>{error || "Job listing not found"}</AlertDescription>
          </Alert>
          <Button onClick={() => router.push("/dashboard/employer/job-listings")} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Listings
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Job Listing Details">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="outline" onClick={() => router.push("/dashboard/employer/job-listings")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Listings
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  {job.position}
                </CardTitle>
                <CardDescription className="mt-2">
                  {job.is_internship ? "Internship Position" : "Full-time Position"}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {(job.approval_status?.toLowerCase() === "approved" || job.approval_status === "Approved") && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                {(job.approval_status?.toLowerCase() === "pending" || job.approval_status === "Pending") && (
                  <Clock className="h-4 w-4 text-yellow-500" />
                )}
                {(job.approval_status?.toLowerCase() === "rejected" || job.approval_status === "Rejected") && (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <Badge
                  variant={
                    job.approval_status?.toLowerCase() === "approved" || job.approval_status === "Approved"
                      ? "default"
                      : "secondary"
                  }
                >
                  {job.approval_status || "Pending"}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{job.description}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Posted By</p>
                <p className="font-semibold">{job.poster_name || "Unknown"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p className="font-semibold">
                  {job.created_at ? new Date(job.created_at).toLocaleDateString() : "N/A"}
                </p>
              </div>
              {job.expire_at && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Expires</p>
                  <p className="font-semibold">{new Date(job.expire_at).toLocaleDateString()}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/employer/job-listings/${job.id}/edit`)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit Listing
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
