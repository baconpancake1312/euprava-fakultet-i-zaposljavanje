"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Briefcase, Building, Calendar, BookmarkCheck, Trash2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"

export default function CandidateSavedJobsPage() {
  const router = useRouter()
  const { user, token } = useAuth()
  const [savedJobs, setSavedJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [unsaving, setUnsaving] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (user?.id && token) {
      loadSavedJobs()
    } else if (!token) {
      setLoading(false)
    }
  }, [user, token])

  const loadSavedJobs = async () => {
    try {
      if (!user || typeof user.id !== "string" || user.id === null) {
        setSavedJobs([])
        return
      }
      const data = await apiClient.getSavedJobs(user.id, token!)
      // API returns { saved_jobs: [...] } or just array
      const jobs = Array.isArray(data) ? data : (data.saved_jobs || [])
      setSavedJobs(jobs)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load saved jobs")
      setSavedJobs([])
    } finally {
      setLoading(false)
    }
  }

  const handleUnsave = async (jobId: string) => {
    if (!token || !user?.id) return
    
    setUnsaving(jobId)
    try {
      await apiClient.unsaveJob(user.id, jobId, token)
      setSavedJobs(prev => prev.filter(job => job.id !== jobId))
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

  if (loading) {
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

        {savedJobs.length === 0 ? (
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
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {savedJobs.map((job) => (
              <Card key={job.id} className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-primary" />
                        {job.position || "Position"}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Building className="h-4 w-4" />
                        {job.poster_name || "Company"}
                      </CardDescription>
                    </div>
                    {job.is_internship && <Badge variant="secondary">Internship</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {job.description || "No description available"}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Posted {new Date(job.created_at || job.createdAt).toLocaleDateString()}</span>
                  </div>
                  {job.expire_at && (
                    <div className="text-sm text-muted-foreground">
                      Expires: {new Date(job.expire_at).toLocaleDateString()}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => router.push(`/dashboard/candidate/job-search`)}
                    >
                      View Details
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleUnsave(job.id)}
                      disabled={unsaving === job.id}
                    >
                      {unsaving === job.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
