"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, FileText, CheckCircle, XCircle, Calendar, User, Briefcase } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"

interface Application {
  id: string
  applicant_id: string
  listing_id: string
  status: string
  submitted_at: string
  updated_at?: string
  job_listing?: {
    id: string
    position: string
    description: string
  }
  applicant?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
}

export default function EmployerApplicationsPage() {
  const { token, user } = useAuth()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [processingId, setProcessingId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const loadApplications = async () => {
      if (!token || !user?.id) {
        setLoading(false)
        return
      }

      try {
        const data = await apiClient.getApplicationsByEmployer(user.id, token)
        setApplications(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load applications")
      } finally {
        setLoading(false)
      }
    }

    loadApplications()
  }, [token, user])

  const handleAccept = async (applicationId: string) => {
    setProcessingId(applicationId)
    try {
      await apiClient.acceptApplication(applicationId, token!)
      setApplications(prev => 
        prev.map(app => 
          app.id === applicationId 
            ? { ...app, status: "accepted", updated_at: new Date().toISOString() }
            : app
        )
      )
      toast({
        title: "Application Accepted",
        description: "The application has been accepted successfully.",
      })
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to accept application",
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (applicationId: string) => {
    setProcessingId(applicationId)
    try {
      await apiClient.rejectApplication(applicationId, token!)
      setApplications(prev => 
        prev.map(app => 
          app.id === applicationId 
            ? { ...app, status: "rejected", updated_at: new Date().toISOString() }
            : app
        )
      )
      toast({
        title: "Application Rejected",
        description: "The application has been rejected.",
      })
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to reject application",
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "accepted":
        return <Badge className="bg-green-100 text-green-800">Accepted</Badge>
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <DashboardLayout title="Job Applications">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Job Applications</h2>
          <p className="text-muted-foreground">Manage applications for your job listings</p>
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
              <p className="text-sm text-muted-foreground mt-2">Applications will appear here when candidates apply to your jobs</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {applications.map((application) => (
              <Card key={application.id} className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-primary" />
                        {application.job_listing?.position || "Position"}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <User className="h-4 w-4" />
                        {application.applicant?.first_name} {application.applicant?.last_name}
                      </CardDescription>
                    </div>
                    {getStatusBadge(application.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Applied {new Date(application.submitted_at).toLocaleDateString()}</span>
                  </div>
                  
                  {application.applicant?.email && (
                    <div className="text-sm">
                      <span className="font-medium">Email: </span>
                      <span className="text-muted-foreground">{application.applicant.email}</span>
                    </div>
                  )}

                  {application.status === "pending" && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => handleAccept(application.id)}
                        disabled={processingId === application.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {processingId === application.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="mr-2 h-4 w-4" />
                        )}
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(application.id)}
                        disabled={processingId === application.id}
                      >
                        {processingId === application.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="mr-2 h-4 w-4" />
                        )}
                        Reject
                      </Button>
                    </div>
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