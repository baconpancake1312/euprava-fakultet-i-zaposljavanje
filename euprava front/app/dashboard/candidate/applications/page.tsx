"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, FileText, Briefcase, Calendar } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

export default function CandidateApplicationsPage() {
  const { token, user } = useAuth()
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    // In a real implementation, you would fetch applications for the current user
    // For now, we'll show a placeholder
    setLoading(false)
  }, [])

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
                        {application.listing?.position || "Position"}
                      </CardTitle>
                      <CardDescription>Company Name</CardDescription>
                    </div>
                    <Badge variant={application.status === "Accepted" ? "default" : "secondary"}>
                      {application.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Applied {new Date(application.submitted_at).toLocaleDateString()}</span>
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
