"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Briefcase, Building, Calendar, BookmarkCheck } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"

export default function CandidateSavedJobsPage() {
  const router = useRouter()
  const { user, token, isLoading: authLoading, isAuthenticated } = useAuth()
  const [savedJobs, setSavedJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [unsaving, setUnsaving] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return
    }

    // If not authenticated, redirect to login
    if (!isAuthenticated || !user) {
      router.push("/login")
      return
    }

    // Load saved jobs if we have user and token
    if (user?.id && token) {
      loadSavedJobs()
    } else {
      setLoading(false)
    }
  }, [user, token, authLoading, isAuthenticated, router])

  const loadSavedJobs = async () => {
    try {
      if (!user || !token) {
        setSavedJobs([])
        setLoading(false)
        return
      }

      console.log("Loading saved jobs for user:", user.email)
      
      // Find the candidate ID by matching email (same approach as profile page)
      const candidates = await apiClient.getAllCandidates(token) as any[]
      console.log("Found candidates:", candidates.length)
      
      const candidate = candidates.find((c: any) => 
        c.email === user.email || 
        c.id === user.id ||
        c.user_id === user.id
      )

      if (!candidate || !candidate.id) {
        console.log("Candidate not found for user:", user.email)
        setError("Candidate profile not found. Please complete your profile first.")
        setSavedJobs([])
        setLoading(false)
        return
      }

      console.log("Found candidate ID:", candidate.id)
      const data = await apiClient.getSavedJobs(candidate.id, token)
      console.log("Saved jobs API response (raw):", JSON.stringify(data, null, 2))
      
      // API returns { saved_jobs: [...] } - backend wraps it
      let jobs: any[] = []
      
      if (Array.isArray(data)) {
        // Direct array response
        jobs = data
      } else if (data && typeof data === 'object') {
        // Object response - extract saved_jobs array
        if (Array.isArray(data.saved_jobs)) {
          jobs = data.saved_jobs
        } else if (Array.isArray(data.jobs)) {
          jobs = data.jobs
        } else if (Array.isArray(data.data)) {
          jobs = data.data
        } else {
          if (data.saved_jobs) {
            jobs = [data.saved_jobs]
          } else {
            jobs = []
          }
        }
      }
      
      // Ensure all items are valid
      jobs = jobs.filter(job => job && (job.id || job._id))
      
      console.log("Parsed saved jobs count:", jobs.length)
      console.log("Parsed saved jobs:", jobs)
      setSavedJobs(jobs)
    } catch (err) {
      console.error("Error loading saved jobs:", err)
      setError(err instanceof Error ? err.message : "Failed to load saved jobs")
      setSavedJobs([])
    } finally {
      setLoading(false)
    }
  }

  const handleUnsave = async (jobId: string) => {
    if (!token || !user) return
    
    setUnsaving(jobId)
    try {
      // Find candidate ID
      const candidates = await apiClient.getAllCandidates(token) as any[]
      const candidate = candidates.find((c: any) => 
        c.email === user.email || 
        c.id === user.id ||
        c.user_id === user.id
      )

      if (!candidate || !candidate.id) {
        toast({
          title: "Error",
          description: "Candidate profile not found",
          variant: "destructive",
        })
        return
      }

      await apiClient.unsaveJob(candidate.id, jobId, token)
      setSavedJobs(prev =>
        prev.filter(job => {
          const id = job.id || job._id
          return id !== jobId
        })
      )
      toast({
        title: "Job Removed",
        description: "Job removed from your saved jobs.",
      })
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to remove job from saved jobs",
        variant: "destructive",
      })
    } finally {
      setUnsaving(null)
    }
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Saved Jobs">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Saved Jobs">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Saved Job Listings</h2>
          <p className="text-muted-foreground">Your favorite job opportunities</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}


        {!loading && savedJobs.length === 0 && !error && (
          <Card>
            <CardContent className="py-12 text-center">
              <BookmarkCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No saved jobs yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Save jobs while browsing to view them here
              </p>
              <Button
                className="mt-4"
                onClick={() => router.push("/dashboard/candidate/job-search")}
              >
                Browse Jobs
              </Button>
            </CardContent>
          </Card>
        )}

        {savedJobs.length > 0 && (
          <div className="grid md:grid-cols-2 gap-6">
            {savedJobs.map((job) => {
              // Job should be a JobListing object directly from the API
              // Handle both id and _id formats
              const jobId = job.id || job._id || String(Math.random())
              
              if (!job) {
                console.warn("Invalid job object:", job)
                return null
              }
              
              return (
                <Card key={jobId} className="hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          <Briefcase className="h-5 w-5 text-primary" />
                          {job.position || job.title || "Position"}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Building className="h-4 w-4" />
                          {job.poster_name || job.company_name || job.company || "Company"}
                        </CardDescription>
                      </div>
                      {job.is_internship && <Badge variant="secondary">Internship</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {job.description || job.details || "No description available"}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {(() => {
                          const createdDate = job.created_at || job.createdAt
                          if (createdDate && createdDate !== "0001-01-01T00:00:00Z") {
                            const date = new Date(createdDate)
                            if (!isNaN(date.getTime()) && date.getFullYear() >= 2000) {
                              return `Posted ${date.toLocaleDateString('en-GB')}`
                            }
                          }
                          return `Posted ${new Date().toLocaleDateString('en-GB')}`
                        })()}
                      </span>
                    </div>
                    {job.expire_at && job.expire_at !== "0001-01-01T00:00:00Z" && (
                      <div className="text-sm text-muted-foreground">
                        {(() => {
                          const date = new Date(job.expire_at)
                          if (!isNaN(date.getTime()) && date.getFullYear() >= 2000) {
                            return `Expires: ${date.toLocaleDateString('en-GB')}`
                          }
                          return null
                        })()}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => router.push(`/dashboard/candidate/job-listings/${job.id || job._id}`)}
                      >
                        View Details
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleUnsave(jobId)}
                        disabled={unsaving === jobId}
                        aria-label="Remove from saved jobs"
                      >
                        {unsaving === jobId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <BookmarkCheck className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            }).filter(Boolean)}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
