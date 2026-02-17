"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, Calendar, User, Briefcase, Clock, CheckCircle, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { format } from "date-fns"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function CandidateInterviewsPage() {
  const { token, user } = useAuth()
  const [interviews, setInterviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const loadInterviews = async () => {
      if (!token || !user?.id) {
        setLoading(false)
        return
      }
      try {
        const data = await apiClient.getInterviewsByCandidate(user.id, token)
        setInterviews(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load interviews")
      } finally {
        setLoading(false)
      }
    }
    loadInterviews()
  }, [token, user])

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "scheduled":
        return <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1"><Clock className="h-3 w-3" />Scheduled</Badge>
      case "completed":
        return <Badge className="bg-green-100 text-green-800 flex items-center gap-1"><CheckCircle className="h-3 w-3" />Completed</Badge>
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800 flex items-center gap-1"><XCircle className="h-3 w-3" />Cancelled</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <DashboardLayout title="My Interviews">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold">My Interviews</h2>
            <p className="text-muted-foreground">View and track your upcoming and past interviews</p>
          </div>
          <Link href="/dashboard/candidate/interviews/request">
            <Button variant="default">Request Interview</Button>
          </Link>
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
        ) : interviews.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No interviews scheduled</p>
              <p className="text-sm text-muted-foreground mt-2">You will see your interviews here when scheduled by employers</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {interviews.map((interview) => (
              <Card key={interview.id} className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-primary" />
                        {interview.job_listing_id || "Job Listing"}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Employer: {interview.employer_id}
                      </CardDescription>
                    </div>
                    {getStatusBadge(interview.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Scheduled: {format(new Date(interview.scheduled_time), "PPPp")}</span>
                  </div>
                  {interview.notes && (
                    <div className="text-sm text-muted-foreground">Notes: {interview.notes}</div>
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
