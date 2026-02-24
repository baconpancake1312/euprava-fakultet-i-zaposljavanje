"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ArrowLeft, BarChart3, Building } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"

interface JobListing {
  id: string
  position: string
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

export default function CompanyAnalyticsPage() {
  const router = useRouter()
  const { user, token, isLoading: authLoading, isAuthenticated } = useAuth()
  const [employerId, setEmployerId] = useState<string | null>(null)
  const [jobListings, setJobListings] = useState<JobListing[]>([])
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

    const allowedTypes = ["EMPLOYER", "ADMIN", "ADMINISTRATOR"]
    if (!allowedTypes.includes(user.user_type)) {
      setError("You don't have permission to view this page")
      setLoading(false)
      return
    }

    const loadData = async () => {
      try {
        let empId = employerId

        // If user is employer, get their employer ID
        if (user.user_type === "EMPLOYER") {
          const employerData = await apiClient.getEmployerByUserId(user.id, token) as any
          empId = employerData.id || employerData._id || user.id
          setEmployerId(empId)
        } else if (user.user_type === "ADMIN" || user.user_type === "ADMINISTRATOR") {
          // For admins, we'll show all data or they can filter by employer
          // For now, show all
          empId = null
        }

        // Get all job listings
        const allListings = await apiClient.getJobListings(token) as JobListing[]
        
        // Filter by employer if not admin
        const filteredListings = empId 
          ? allListings.filter((listing: JobListing) => 
              listing.poster_id === empId || listing.poster_id?.toString() === empId
            )
          : allListings
        
        setJobListings(filteredListings)

        // Get applications
        if (empId) {
          const empApplications = await apiClient.getApplicationsByEmployer(empId, token) as Application[]
          setApplications(empApplications)
        } else {
          // For admins, get all applications
          // Try to get all applications, but if it fails, collect from all employers
          try {
            const allApplications = await apiClient.getApplications(token) as Application[]
            setApplications(allApplications)
          } catch (err) {
            console.warn("Failed to get all applications directly, trying alternative method:", err)
            // Alternative: Get all employers and collect their applications
            try {
              const allEmployers = await apiClient.getEmployers(token) as any[]
              const allApps: Application[] = []
              for (const employer of allEmployers) {
                try {
                  const empId = employer.id || employer._id
                  if (empId) {
                    const empApps = await apiClient.getApplicationsByEmployer(empId, token) as Application[]
                    if (Array.isArray(empApps)) {
                      allApps.push(...empApps)
                    }
                  }
                } catch (e) {
                  console.warn(`Failed to get applications for employer ${employer.id}:`, e)
                }
              }
              setApplications(allApps)
            } catch (fallbackErr) {
              console.error("Failed to get applications via fallback method:", fallbackErr)
              setApplications([])
            }
          }
        }
      } catch (err) {
        console.error("Failed to load analytics:", err)
        setError(err instanceof Error ? err.message : "Failed to load analytics")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [token, authLoading, isAuthenticated, user, employerId])

  // Calculate statistics
  const stats = {
    totalJobs: jobListings.length,
    activeJobs: jobListings.filter(job => {
      if (!job.expire_at) return true
      const expireDate = new Date(job.expire_at)
      return expireDate > new Date()
    }).length,
    totalApplications: applications.length,
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

  // Applications per job
  const getApplicationsPerJob = () => {
    const jobAppCounts: { [key: string]: number } = {}
    
    applications.forEach(app => {
      const jobId = app.listing_id
      if (jobId) {
        jobAppCounts[jobId] = (jobAppCounts[jobId] || 0) + 1
      }
    })

    return jobListings
      .map(job => ({
        name: job.position.length > 20 ? job.position.substring(0, 20) + "..." : job.position,
        applications: jobAppCounts[job.id] || 0,
      }))
      .sort((a, b) => b.applications - a.applications)
      .slice(0, 10) // Top 10
  }

  // Applications over time (last 30 days)
  const getApplicationsOverTime = () => {
    const days = 30
    const data = []
    const today = new Date()
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const count = applications.filter(app => {
        const appDate = new Date(app.submitted_at)
        return appDate.toISOString().split('T')[0] === dateStr
      }).length
      
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        applications: count,
      })
    }
    
    return data
  }

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
      <DashboardLayout title="Company Analytics">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  const getBackRoute = () => {
    if (user?.user_type === "ADMIN" || user?.user_type === "ADMINISTRATOR") {
      return "/dashboard/admin"
    }
    return "/dashboard/employer"
  }

  if (error) {
    return (
      <DashboardLayout title="Company Analytics">
        <div className="space-y-6">
          <Button variant="outline" onClick={() => router.push(getBackRoute())}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Company Analytics">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Building className="h-8 w-8" />
              {user?.user_type === "ADMIN" || user?.user_type === "ADMINISTRATOR" ? "All Companies Analytics" : "Company Analytics"}
            </h1>
            <p className="text-muted-foreground">Insights and performance metrics</p>
          </div>
          <Button variant="outline" onClick={() => router.push(getBackRoute())}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Jobs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalJobs}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Jobs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeJobs}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Applications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalApplications}</div>
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
              <CardDescription>Breakdown of all application statuses</CardDescription>
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

          {/* Applications Over Time */}
          <Card>
            <CardHeader>
              <CardTitle>Applications Over Time</CardTitle>
              <CardDescription>Last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getApplicationsOverTime()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line 
                      type="monotone" 
                      dataKey="applications" 
                      stroke="var(--color-applications)" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Applications Per Job */}
          {getApplicationsPerJob().length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Applications Per Job</CardTitle>
                <CardDescription>Top job listings by application count</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getApplicationsPerJob()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="applications" fill="var(--color-applications)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
