"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, FileText, Briefcase, Calendar, CheckCircle, XCircle, Clock } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

export default function CandidateApplicationsPage() {
  const { token, user, isLoading: authLoading, isAuthenticated } = useAuth()
  const [candidateId, setCandidateId] = useState<string | null>(null)
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    const loadCandidateAndApplications = async () => {
      // Wait for auth to finish loading
      if (authLoading) {
        return
      }

      // If not authenticated, don't load data
      if (!isAuthenticated || !token || !user) {
        setLoading(false)
        setError("Please log in to view your applications")
        return
      }

      try {
        // Find the candidate by matching email
        console.log("Finding candidate for user:", user.email)
        const candidates = await apiClient.getAllCandidates(token) as any[]
        const candidate = candidates.find((c: any) => 
          c.email === user.email || 
          c.id === user.id ||
          c.user_id === user.id
        )
        
        if (!candidate || !candidate.id) {
          setError("Candidate profile not found. Please complete your profile first.")
        setLoading(false)
        return
      }

        const candidateId = candidate.id
        console.log("Loading applications for candidate ID:", candidateId)
        console.log("Candidate ID type:", typeof candidateId)
        setCandidateId(candidateId)
        
        // Fetch applications using the candidate ID
        const data = await apiClient.getApplicationsByCandidate(candidateId, token)
        console.log("Raw applications data received:", data)
        console.log("Data type:", typeof data, "Is array:", Array.isArray(data))
          
          // Ensure data is an array before processing
          const applicationsData = Array.isArray(data) ? data : []
          console.log("Applications array length:", applicationsData.length)
          
          // Fetch job listing details for each application
          const applicationsWithDetails = await Promise.all(
            applicationsData.map(async (app) => {
              try {
                if (app.listing_id) {
                  const jobListing = await apiClient.getJobListingById(app.listing_id, token)
                  return {
                    ...app,
                    job_listing: jobListing
                  }
                }
                return app
              } catch (err) {
                console.error("Failed to fetch job listing:", err)
                return app
              }
            })
          )
          
        setApplications(prev => {
          // Check for status changes and show toast notifications
            if (applicationsWithDetails.length > 0) {
              applicationsWithDetails.forEach(newApp => {
            const oldApp = prev.find(app => app.id === newApp.id)
            if (oldApp && oldApp.status !== newApp.status) {
              if (newApp.status === "accepted") {
                toast({
                  title: "Application Accepted! 🎉",
                  description: `Your application for ${newApp.job_listing?.position || "the position"} has been accepted!`,
                })
              } else if (newApp.status === "rejected") {
                toast({
                  title: "Application Update",
                  description: `Your application for ${newApp.job_listing?.position || "the position"} was not selected this time.`,
                  variant: "destructive",
                })
              }
            }
          })
            }
            return applicationsWithDetails
        })
      } catch (err) {
        console.error("Error loading applications:", err)
          setError(err instanceof Error ? err.message : "Failed to load applications")
        setApplications([])
      } finally {
        setLoading(false)
      }
    }

    loadCandidateAndApplications()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.id, authLoading, isAuthenticated])

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "accepted":
        return (
          <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Accepted
          </Badge>
        )
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        )
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <DashboardLayout title="My Applications">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="My Applications">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">My Applications</h2>
          <p className="text-muted-foreground">Track the status of your job applications</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : applications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No applications yet</p>
              <p className="text-sm text-muted-foreground mt-2">Start applying to jobs to see your applications here</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {applications.map((application) => (
              <Card key={application.id} className="hover:border-primary/50 transition-colors border-2 shadow-lg">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <Briefcase className="h-5 w-5 text-primary" />
                        {application.job_listing?.position || "Position"}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {application.job_listing?.poster_name || "Company"}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                    {getStatusBadge(application.status)}
                      {application.job_listing?.is_internship && (
                        <Badge variant="secondary" className="text-xs">Internship</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {application.job_listing?.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {application.job_listing.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Applied {new Date(application.submitted_at || application.created_at).toLocaleDateString()}</span>
                  </div>
                  {application.status === "pending" && (
                    <p className="text-xs text-muted-foreground italic">
                      Your application is being reviewed by the employer
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
