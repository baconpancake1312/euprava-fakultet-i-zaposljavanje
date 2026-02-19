"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Clock, Building2, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Employer {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  firm_name: string
  pib: string
  maticni_broj: string
  delatnost: string
  firm_address: string
  firm_phone: string
  approval_status: string
  approved_at?: string
  approved_by?: string
}

export default function AdminEmployersPage() {
  const { user, token, isLoading: authLoading, isAuthenticated } = useAuth()
  const [employers, setEmployers] = useState<Employer[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all")
  const [processingId, setProcessingId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const loadData = async () => {
      if (authLoading) return

      if (!isAuthenticated || !token || !user) {
        setLoading(false)
        return
      }

      // Check if user is admin
      if (user.user_type !== "ADMIN" && user.user_type !== "STUDENTSKA_SLUZBA") {
        setLoading(false)
        toast({
          title: "Access Denied",
          description: "You need admin privileges to access this page.",
          variant: "destructive",
        })
        return
      }

      await loadEmployers()
    }

    loadData()
  }, [token, authLoading, isAuthenticated, user])

  const loadEmployers = async () => {
    setLoading(true)
    try {
      console.log("[Admin] Loading employers with user_type:", user?.user_type)
      const data = await apiClient.getEmployers(token!)
      console.log("[Admin] Loaded employers:", data)
      
      // Remove duplicates by ID
      const uniqueEmployers = data.reduce((acc: Employer[], current: Employer) => {
        const exists = acc.find(item => item.id === current.id)
        if (!exists) {
          acc.push(current)
        } else {
          console.warn("[Admin] Duplicate employer found:", current.id)
        }
        return acc
      }, [])
      
      console.log("[Admin] Unique employers:", uniqueEmployers.length)
      setEmployers(uniqueEmployers)
    } catch (error) {
      console.error("Failed to load employers:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load employers",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Helper function to decode JWT token
  const decodeJWT = (token: string) => {
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
      return JSON.parse(jsonPayload)
    } catch (e) {
      console.error('Failed to decode JWT:', e)
      return null
    }
  }

  const handleApprove = async (employerId: string) => {
    setProcessingId(employerId)
    try {
      console.log("[Admin] Approving employer:", employerId)
      console.log("[Admin] User object:", user)
      console.log("[Admin] Token:", token?.substring(0, 50) + "...")
      
      // Use the token from user object if available (has user_type)
      const adminToken = (user as any)?.token || token
      console.log("[Admin] Using token:", adminToken?.substring(0, 50) + "...")
      
      // Decode and log the token contents
      if (adminToken) {
        const decoded = decodeJWT(adminToken)
        console.log("[Admin] Decoded token:", decoded)
        console.log("[Admin] Token User_type:", decoded?.User_type || decoded?.user_type || 'NOT FOUND')
      }
      
      await apiClient.approveEmployer(employerId, adminToken!)
      toast({
        title: "Employer Approved",
        description: "The employer has been successfully approved and can now post job listings.",
      })
      await loadEmployers()
    } catch (error) {
      console.error("Failed to approve employer:", error)
      toast({
        title: "Approval Failed",
        description: error instanceof Error ? error.message : "Failed to approve employer. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (employerId: string) => {
    setProcessingId(employerId)
    try {
      console.log("[Admin] Rejecting employer:", employerId)
      
      // Use the token from user object if available
      const adminToken = (user as any)?.token || token
      
      await apiClient.rejectEmployer(employerId, adminToken!)
      toast({
        title: "Employer Rejected",
        description: "The employer registration has been rejected.",
      })
      await loadEmployers()
    } catch (error) {
      console.error("Failed to reject employer:", error)
      toast({
        title: "Rejection Failed",
        description: error instanceof Error ? error.message : "Failed to reject employer. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  const filteredEmployers = (employers ?? []).filter((employer) => {
    if (filter === "all") return true
    return employer.approval_status?.toLowerCase() === filter
  })

  const getStatusBadge = (status?: string) => {
    if (!status) return <Badge className="bg-yellow-500">Pending</Badge>
    switch (status.toLowerCase()) {
      case "approved":
        return <Badge className="bg-green-500">Approved</Badge>
      case "rejected":
        return <Badge className="bg-red-500">Rejected</Badge>
      case "pending":
        return <Badge className="bg-yellow-500">Pending</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  // Show loading while auth loads
  if (authLoading) {
    return (
      <DashboardLayout title="Employer Management">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  // Show error if not authenticated or not admin
  if (!isAuthenticated || !token || !user) {
    return (
      <DashboardLayout title="Employer Management">
        <div className="space-y-6">
          <Alert variant="destructive">
            <AlertDescription>Please log in to access this page</AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    )
  }

  if (user.user_type !== "ADMIN" && user.user_type !== "STUDENTSKA_SLUZBA") {
    return (
      <DashboardLayout title="Employer Management">
        <div className="space-y-6">
          <Alert variant="destructive">
            <AlertDescription>
              Access Denied: You need admin privileges. Your role: {user.user_type}
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Employer Management">
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Employer Management</h1>
            <p className="text-muted-foreground">Review and approve employer registrations</p>
            <p className="text-xs text-muted-foreground mt-1">Logged in as: {user.user_type}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>
            All ({employers.length})
          </Button>
          <Button variant={filter === "pending" ? "default" : "outline"} onClick={() => setFilter("pending")}>
            <Clock className="mr-2 h-4 w-4" />
            Pending (
            {employers.filter((e) => !e.approval_status || e.approval_status.toLowerCase() === "pending").length})
          </Button>
          <Button variant={filter === "approved" ? "default" : "outline"} onClick={() => setFilter("approved")}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Approved ({employers.filter((e) => e.approval_status?.toLowerCase() === "approved").length})
          </Button>
          <Button variant={filter === "rejected" ? "default" : "outline"} onClick={() => setFilter("rejected")}>
            <XCircle className="mr-2 h-4 w-4" />
            Rejected ({employers.filter((e) => e.approval_status?.toLowerCase() === "rejected").length})
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredEmployers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">No employers found</CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredEmployers.map((employer) => (
              <Card key={employer.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        {employer.firm_name}
                      </CardTitle>
                      <CardDescription>
                        {employer.first_name} {employer.last_name} • {employer.email}
                      </CardDescription>
                    </div>
                    {getStatusBadge(employer.approval_status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium">PIB</p>
                      <p className="text-muted-foreground">{employer.pib}</p>
                    </div>
                    <div>
                      <p className="font-medium">Matični broj</p>
                      <p className="text-muted-foreground">{employer.maticni_broj}</p>
                    </div>
                    <div>
                      <p className="font-medium">Delatnost</p>
                      <p className="text-muted-foreground">{employer.delatnost}</p>
                    </div>
                    <div>
                      <p className="font-medium">Phone</p>
                      <p className="text-muted-foreground">{employer.firm_phone}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="font-medium">Address</p>
                      <p className="text-muted-foreground">{employer.firm_address}</p>
                    </div>
                  </div>
                  {(!employer.approval_status || employer.approval_status.toLowerCase() === "pending") && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleApprove(employer.id)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        disabled={processingId === employer.id}
                      >
                        {processingId === employer.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Approving...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => handleReject(employer.id)}
                        variant="destructive"
                        className="flex-1"
                        disabled={processingId === employer.id}
                      >
                        {processingId === employer.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Rejecting...
                          </>
                        ) : (
                          <>
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  {employer.approved_at && (
                    <p className="text-xs text-muted-foreground">
                      {employer.approval_status} on {new Date(employer.approved_at).toLocaleString()}
                      {employer.approved_by && ` by ${employer.approved_by}`}
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
