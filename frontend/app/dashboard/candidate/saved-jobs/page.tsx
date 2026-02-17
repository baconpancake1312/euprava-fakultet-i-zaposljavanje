"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Briefcase } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function CandidateSavedJobsPage() {
  const { user, token } = useAuth()
  const [savedJobs, setSavedJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.id && token) {
      loadSavedJobs()
    }
  }, [user, token])

  const loadSavedJobs = async () => {
    try {
      if (!user || typeof user.id !== "string" || user.id === null) {
        // Optionally redirect or show error
        return setSavedJobs([])
      }
      const data = await apiClient.getSavedJobs(user.id, token)
      setSavedJobs(data.saved_jobs || [])
    } catch (error) {
      setSavedJobs([])
    } finally {
      setLoading(false)
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
        <h2 className="text-2xl font-bold">Saved Job Listings</h2>
        {savedJobs.length === 0 ? (
          <p className="text-muted-foreground">No saved jobs yet.</p>
        ) : (
          <div className="grid gap-4">
            {savedJobs.map((job) => (
              <Card key={job.id}>
                <CardHeader>
                  <CardTitle>{job.job_id}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Saved at: {new Date(job.saved_at).toLocaleString()}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
