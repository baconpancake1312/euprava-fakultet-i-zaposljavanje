"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ArrowLeft, Calendar, Briefcase, Building, Clock, CheckCircle, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface JobListing {
  id: string
  position: string
  description: string
  poster_id: string
  approval_status: string
  created_at: string
  expire_at?: string
  is_internship?: boolean
  approved_at?: string
  approved_by?: string
}

export default function JobListingDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const { user, token, isLoading: authLoading, isAuthenticated } = useAuth()
  const { toast } = useToast()
  const [listing, setListing] = useState<JobListing | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (authLoading) return

    if (!isAuthenticated || !token || !user) {
      setError("Please log in to view job listing details")
      setLoading(false)
      return
    }

    if (user.user_type !== "EMPLOYER") {
      setError("Only employers can view job listing details")
      setLoading(false)
      return
    }

    const loadJobListing = async () => {
      try {
        const jobId = Array.isArray(params.id) ? params.id[0] : params.id
        if (!jobId) {
          setError("Invalid job listing ID")
          setLoading(false)
          return
        }

        const jobData = await apiClient.getJobListingById(jobId, token)
        setListing(jobData)
      } catch (err) {
        console.error("Failed to load job listing:", err)
        setError(err instanceof Error ? err.message : "Failed to load job listing")
      } finally {
        setLoading(false)
      }
    }

    loadJobListing()
  }, [params.id, token, authLoading, isAuthenticated, user])

  const getStatusBadge = (status?: string) => {
    if (!status) return <Badge className="bg-yellow-500">Pending</Badge>
    switch (status.toLowerCase()) {
      case "approved":
        return <Badge className="bg-green-500">Approved</Badge>
      case "rejected":
        return <Badge className="bg-red-500">Rejected</Badge>
      case "pending":
        return <Badge className="bg-yellow-500">Pending</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Job Listing Details">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  if (error || !listing) {
    return (
      <DashboardLayout title="Job Listing Details">
        <div className="space-y-6">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Alert variant="destructive">
            <AlertDescription>{error || "Job listing not found"}</AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Job Listing Details">
      <div className="space-y-6">
        <Button variant="outline" onClick={() => router.push("/dashboard/employer/job-listings")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Job Listings
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <CardTitle className="text-2xl">{listing.position}</CardTitle>
                <CardDescription className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    {listing.is_internship ? "Internship" : "Full-time"}
                  </div>
                  {listing.created_at && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Posted {new Date(listing.created_at).toLocaleDateString('en-GB')}</span>
                    </div>
                  )}
                </CardDescription>
              </div>
              {getStatusBadge(listing.approval_status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{listing.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              {listing.expire_at && (
                <div>
                  <p className="font-medium">Expires</p>
                  <p className="text-muted-foreground">
                    {new Date(listing.expire_at).toLocaleDateString('en-GB')}
                  </p>
                </div>
              )}
              {listing.approved_at && listing.approved_at !== "0001-01-01T00:00:00Z" && (
                <div>
                  <p className="font-medium">Status Updated</p>
                  <p className="text-muted-foreground">
                    {(() => {
                      const date = new Date(listing.approved_at)
                      if (isNaN(date.getTime()) || date.getFullYear() < 2000) {
                        return "Invalid date"
                      }
                      return date.toLocaleString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    })()}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/employer/job-listings/${listing.id}/edit`)}
              >
                Edit Listing
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/employer/applications`)}
              >
                View Applications
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
