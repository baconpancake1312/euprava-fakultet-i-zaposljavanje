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
  const { token, user } = useAuth()
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    const loadApplications = async () => {
      if (!token || !user?.id) {
        setLoading(false)
        return
      }

      try {
        // Try to get applications by candidate ID first
        const data = await apiClient.getApplicationsByCandidate(user.id, token)
        
        // Ensure data is an array before processing
        const applicationsData = Array.isArray(data) ? data : []
        
        setApplications(prev => {
          // Check for status changes and show toast notifications
          if (applicationsData.length > 0) {
            applicationsData.forEach(newApp => {
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
          return applicationsData
        })
      } catch (err) {
        // Fallback to general applications endpoint
        try {
          const data = await apiClient.getApplications(token)
          const fallbackData = Array.isArray(data) ? data : []
          setApplications(fallbackData)
        } catch (fallbackErr) {
          setError(err instanceof Error ? err.message : "Failed to load applications")
          setApplications([]) // Set empty array on error
        }
      } finally {
        setLoading(false)
      }
    }

    loadApplications()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.id]) // Removed toast from dependencies to prevent re-renders

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
              <Card key={application.id} className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-primary" />
                        {application.job_listing?.position || application.position || "Position"}
                      </CardTitle>
                      <CardDescription>{application.job_listing?.company_name || application.company_name || "Company Name"}</CardDescription>
                    </div>
                    {getStatusBadge(application.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Applied {new Date(application.created_at || application.submitted_at).toLocaleDateString()}</span>
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
