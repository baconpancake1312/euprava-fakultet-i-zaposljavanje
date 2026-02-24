"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ArrowLeft, BarChart3 } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"

interface JobListing {
  id: string
  position: string
  description: string
  poster_id: string
  approval_status: string
  created_at: string
  expire_at?: string
}

interface Application {
  id: string
  listing_id: string
  applicant_id: string
  status: string
  submitted_at: string
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

export default function JobListingAnalyticsPage() {
  const router = useRouter()
  const params = useParams()
  const { user, token, isLoading: authLoading, isAuthenticated } = useAuth()
  const [listing, setListing] = useState<JobListing | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (authLoading) return

    if (!isAuthenticated || !token || !user) {
      setError("Please log in to view analytics")
      setLoading(false)
      return
    }

    const allowedTypes = ["EMPLOYER", "ADMIN", "ADMINISTRATOR", "CANDIDATE", "STUDENT"]
    if (!allowedTypes.includes(user.user_type)) {
      setError("You don't have permission to view this page")
      setLoading(false)
      return
    }

    const loadData = async () => {
      try {
        const jobId = Array.isArray(params.id) ? params.id[0] : params.id
        if (!jobId) {
          setError("Invalid job listing ID")
          setLoading(false)
          return
        }

        const jobData = await apiClient.getJobListingById(jobId, token) as JobListing
        setListing(jobData)

        // Get all applications and filter by job listing
        const allApplications = await apiClient.getApplications(token) as Application[]
        const jobApplications = allApplications.filter((app: Application) => 
          app.listing_id === jobId || app.listing_id?.toString() === jobId
        )
        setApplications(jobApplications)
      } catch (err) {
        console.error("Failed to load analytics:", err)
        setError(err instanceof Error ? err.message : "Failed to load analytics")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [params.id, token, authLoading, isAuthenticated, user])

  // Calculate statistics
  const stats = {
    total: applications.length,
    pending: applications.filter(app => app.status?.toLowerCase() === "pending").length,
    accepted: applications.filter(app => app.status?.toLowerCase() === "accepted").length,
    rejected: applications.filter(app => app.status?.toLowerCase() === "rejected").length,
  }

  // Prepare data for charts
  const statusData = [
    { name: "Pending", value: stats.pending, fill: COLORS[0] },
    { name: "Accepted", value: stats.accepted, fill: COLORS[1] },
    { name: "Rejected", value: stats.rejected, fill: COLORS[2] },
  ]

  // Line chart data: one point per status type
  const statusLineData = [
    { status: "Pending", count: stats.pending },
    { status: "Accepted", count: stats.accepted },
    { status: "Rejected", count: stats.rejected },
  ]

  const chartConfig = {
    applications: {
      label: "Applications",
      color: "hsl(var(--chart-1))",
    },
    pending: {
      label: "Pending",
      color: COLORS[0],
    },
    accepted: {
      label: "Accepted",
      color: COLORS[1],
    },
    rejected: {
      label: "Rejected",
      color: COLORS[2],
    },
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout title="Job Listing Analytics">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  if (error || !listing) {
    return (
      <DashboardLayout title="Job Listing Analytics">
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
    <DashboardLayout title="Job Listing Analytics">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{listing.position}</h1>
            <p className="text-muted-foreground">Analytics and insights</p>
          </div>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Applications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Accepted</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.accepted}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Rejected</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.rejected}</div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Distribution Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Application Status Distribution</CardTitle>
              <CardDescription>Breakdown of application statuses</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Status counts as line chart */}
          <Card>
            <CardHeader>
              <CardTitle>Applications by Status</CardTitle>
              <CardDescription>Each point represents total applications per status</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={statusLineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="var(--color-applications)"
                      strokeWidth={2}
                      dot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
