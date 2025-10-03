"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Clock, Building2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

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
  const { user, token } = useAuth()
  const [employers, setEmployers] = useState<Employer[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all")
  const [processingId, setProcessingId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (token) {
      loadEmployers()
    }
  }, [token])

  const loadEmployers = async () => {
    try {
      const data = await apiClient.getEmployers(token!)
      setEmployers(data)
    } catch (error) {
      console.error("Failed to load employers:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (employerId: string) => {
    setProcessingId(employerId)
    try {
      await apiClient.approveEmployer(employerId, token!)
      toast({
        title: "Employer Approved",
        description: "The employer has been successfully approved and can now post job listings.",
      })
      loadEmployers()
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
      await apiClient.updateEmployer(
        employerId,
        {
          approval_status: "Rejected",
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        },
        token!,
      )
      toast({
        title: "Employer Rejected",
        description: "The employer registration has been rejected.",
      })
      loadEmployers()
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

  const filteredEmployers = employers.filter((employer) => {
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

  return (
    <DashboardLayout title="Employer Management">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Employer Management</h1>
          <p className="text-muted-foreground">Review and approve employer registrations</p>
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
          <div className="text-center py-12">Loading...</div>
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
                        className="flex-1"
                        disabled={processingId === employer.id}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        {processingId === employer.id ? "Approving..." : "Approve"}
                      </Button>
                      <Button
                        onClick={() => handleReject(employer.id)}
                        variant="destructive"
                        className="flex-1"
                        disabled={processingId === employer.id}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        {processingId === employer.id ? "Rejecting..." : "Reject"}
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
