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
import { Loader2, ArrowLeft, Calendar, Briefcase, Building, MapPin, DollarSign, CheckCircle, Clock, FileText, Gift } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface JobListing {
  id: string
  position: string
  description: string
  location?: string
  salary?: string
  requirements?: string
  benefits?: string
  work_type?: string
  poster_id: string
  poster_name?: string
  approval_status: string
  created_at: string
  updated_at?: string
  expire_at?: string
  is_internship?: boolean
  approved_at?: string
  approved_by?: string
}

export default function CandidateJobListingDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const { user, token, isLoading: authLoading, isAuthenticated } = useAuth()
  const { toast } = useToast()
  const [listing, setListing] = useState<JobListing | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [applying, setApplying] = useState(false)
  const [isApplied, setIsApplied] = useState(false)

  useEffect(() => {
    if (authLoading) return

    if (!isAuthenticated || !token || !user) {
      setError("Please log in to view job listing details")
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

        // Check if already applied
        if (user.user_type === "CANDIDATE") {
          try {
            const candidates = await apiClient.getAllCandidates(token) as any[]
            const candidate = candidates.find((c: any) => 
              c.email === user.email || 
              c.id === user.id ||
              c.user_id === user.id
            )

            if (candidate?.id) {
              const applications = await apiClient.getApplicationsByCandidate(candidate.id, token)
              const applicationsData = Array.isArray(applications) ? applications : []
              const applied = applicationsData.some((app: any) => {
                const appListingId = app.listing_id || app.job_listing_id || app.listing?.id || app.job_listing?.id
                return String(appListingId) === String(jobId)
              })
              setIsApplied(applied)
            }
          } catch (err) {
            console.error("Error checking application status:", err)
          }
        }
      } catch (err) {
        console.error("Failed to load job listing:", err)
        setError(err instanceof Error ? err.message : "Failed to load job listing")
      } finally {
        setLoading(false)
      }
    }

    loadJobListing()
  }, [params.id, token, authLoading, isAuthenticated, user])

  const handleApply = async () => {
    if (!token || !user || !listing) return

    setApplying(true)
    try {
      // Find candidate ID by email match
      const candidates = await apiClient.getAllCandidates(token) as any[]
      const candidate = candidates.find((c: any) => 
        c.email === user.email || 
        c.id === user.id ||
        c.user_id === user.id
      )

      if (!candidate || !candidate.id) {
        throw new Error("Please complete your profile first")
      }

      await apiClient.applyToJob(listing.id, { applicant_id: candidate.id }, token)
      setIsApplied(true)
      toast({
        title: "Application Submitted",
        description: "Your application has been successfully submitted to the employer.",
      })
    } catch (err) {
      toast({
        title: "Application Failed",
        description: err instanceof Error ? err.message : "Failed to submit application",
        variant: "destructive",
      })
    } finally {
      setApplying(false)
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
        <Button variant="outline" onClick={() => router.push("/dashboard/candidate/job-search")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Job Search
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <CardTitle className="text-2xl">{listing.position}</CardTitle>
                <CardDescription className="flex items-center gap-4 flex-wrap">
                  {listing.poster_name && (
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      <span>{listing.poster_name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    {listing.is_internship ? "Internship" : "Full-time"}
                  </div>
                  {(listing.updated_at || listing.created_at) && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {(() => {
                          if (listing.updated_at && listing.updated_at !== "0001-01-01T00:00:00Z") {
                            const date = new Date(listing.updated_at)
                            if (!isNaN(date.getTime()) && date.getFullYear() >= 2000) {
                              return `Updated ${date.toLocaleDateString('en-GB')}`
                            }
                          }
                          if (listing.created_at && listing.created_at !== "0001-01-01T00:00:00Z") {
                            const date = new Date(listing.created_at)
                            if (!isNaN(date.getTime()) && date.getFullYear() >= 2000) {
                              return `Posted ${date.toLocaleDateString('en-GB')}`
                            }
                          }
                          // Always show a date
                          const fallbackDate = new Date(listing.created_at)
                          if (!isNaN(fallbackDate.getTime()) && fallbackDate.getFullYear() >= 2000) {
                            return `Posted ${fallbackDate.toLocaleDateString('en-GB')}`
                          }
                          return `Posted ${new Date().toLocaleDateString('en-GB')}`
                        })()}
                      </span>
                    </div>
                  )}
                </CardDescription>
              </div>
              {listing.approval_status?.toLowerCase() === "approved" ? (
                <Badge className="bg-green-500">Approved</Badge>
              ) : (
                <Badge className="bg-yellow-500">Pending</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Description
              </h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{listing.description}</p>
            </div>

            {(listing.location || listing.work_type || listing.salary) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {listing.location && (
                  <div className="flex items-start gap-3 p-3 border rounded-lg">
                    <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm text-muted-foreground">Location</p>
                      <p className="font-semibold">{listing.location}</p>
                    </div>
                  </div>
                )}
                {listing.work_type && (
                  <div className="flex items-start gap-3 p-3 border rounded-lg">
                    <Briefcase className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm text-muted-foreground">Work Type</p>
                      <p className="font-semibold">{listing.work_type}</p>
                    </div>
                  </div>
                )}
                {listing.salary && (
                  <div className="flex items-start gap-3 p-3 border rounded-lg">
                    <DollarSign className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm text-muted-foreground">Salary</p>
                      <p className="font-semibold">{listing.salary}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {listing.requirements && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Requirements
                </h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{listing.requirements}</p>
              </div>
            )}

            {listing.benefits && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Gift className="h-4 w-4" />
                  Benefits
                </h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{listing.benefits}</p>
              </div>
            )}

            {listing.expire_at && listing.expire_at !== "0001-01-01T00:00:00Z" && (
              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    Expires: {(() => {
                      const date = new Date(listing.expire_at)
                      if (!isNaN(date.getTime()) && date.getFullYear() >= 2000) {
                        return date.toLocaleDateString('en-GB')
                      }
                      return "N/A"
                    })()}
                  </span>
                </div>
              </div>
            )}

            <div className="pt-4 border-t flex gap-2">
              {user.user_type === "CANDIDATE" && listing.approval_status?.toLowerCase() === "approved" && (
                <Button
                  onClick={handleApply}
                  disabled={applying || isApplied}
                  className="flex-1"
                  size="lg"
                >
                  {applying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Applying...
                    </>
                  ) : isApplied ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Applied
                    </>
                  ) : (
                    <>
                      Apply Now
                    </>
                  )}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/employer/job-listings/${listing.id}/analytics`)}
                className="flex-1"
              >
                View Analytics
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
