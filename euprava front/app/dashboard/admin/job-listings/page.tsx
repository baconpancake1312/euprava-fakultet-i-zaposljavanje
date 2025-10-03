"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface JobListing {
  id: string
  poster_id: string
  position: string
  description: string
  created_at: string
  expire_at: string
  is_internship: boolean
  approval_status: string
  approved_at?: string
  approved_by?: string
}

export default function AdminJobListingsPage() {
  const { user, token } = useAuth()
  const [listings, setListings] = useState<JobListing[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all")
  const [processingId, setProcessingId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (token) {
      loadListings()
    }
  }, [token])

  const loadListings = async () => {
    try {
      const data = await apiClient.getJobListings(token!)
      setListings(data)
    } catch (error) {
      console.error("Failed to load job listings:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (listingId: string) => {
    setProcessingId(listingId)
    try {
      await apiClient.updateJobListing(
        listingId,
        {
          approval_status: "Approved",
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        },
        token!,
      )
      toast({
        title: "Job Listing Approved",
        description: "The job listing is now visible to candidates and students.",
      })
      loadListings()
    } catch (error) {
      console.error("Failed to approve listing:", error)
      toast({
        title: "Approval Failed",
        description: error instanceof Error ? error.message : "Failed to approve job listing. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (listingId: string) => {
    setProcessingId(listingId)
    try {
      await apiClient.updateJobListing(
        listingId,
        {
          approval_status: "Rejected",
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        },
        token!,
      )
      toast({
        title: "Job Listing Rejected",
        description: "The job listing has been rejected and will not be visible to users.",
      })
      loadListings()
    } catch (error) {
      console.error("Failed to reject listing:", error)
      toast({
        title: "Rejection Failed",
        description: error instanceof Error ? error.message : "Failed to reject job listing. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  const filteredListings = listings.filter((listing) => {
    if (filter === "all") return true
    return listing.approval_status.toLowerCase() === filter
  })

  const getStatusBadge = (status: string) => {
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
    <DashboardLayout title="Job Listings Management">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Job Listings Management</h1>
          <p className="text-muted-foreground">Review and approve job listings</p>
        </div>

        <div className="flex gap-2">
          <Button variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>
            All ({listings.length})
          </Button>
          <Button variant={filter === "pending" ? "default" : "outline"} onClick={() => setFilter("pending")}>
            <Clock className="mr-2 h-4 w-4" />
            Pending ({listings.filter((l) => l.approval_status.toLowerCase() === "pending").length})
          </Button>
          <Button variant={filter === "approved" ? "default" : "outline"} onClick={() => setFilter("approved")}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Approved ({listings.filter((l) => l.approval_status.toLowerCase() === "approved").length})
          </Button>
          <Button variant={filter === "rejected" ? "default" : "outline"} onClick={() => setFilter("rejected")}>
            <XCircle className="mr-2 h-4 w-4" />
            Rejected ({listings.filter((l) => l.approval_status.toLowerCase() === "rejected").length})
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : filteredListings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">No job listings found</CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredListings.map((listing) => (
              <Card key={listing.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle>{listing.position}</CardTitle>
                      <CardDescription>
                        Posted by: {listing.poster_id}
                        {listing.is_internship && " • Internship"}
                      </CardDescription>
                    </div>
                    {getStatusBadge(listing.approval_status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm">{listing.description}</p>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Created: {new Date(listing.created_at).toLocaleDateString()}</span>
                    <span>Expires: {new Date(listing.expire_at).toLocaleDateString()}</span>
                  </div>
                  {listing.approval_status.toLowerCase() === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleApprove(listing.id)}
                        className="flex-1"
                        disabled={processingId === listing.id}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        {processingId === listing.id ? "Approving..." : "Approve"}
                      </Button>
                      <Button
                        onClick={() => handleReject(listing.id)}
                        variant="destructive"
                        className="flex-1"
                        disabled={processingId === listing.id}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        {processingId === listing.id ? "Rejecting..." : "Reject"}
                      </Button>
                    </div>
                  )}
                  {listing.approved_at && (
                    <p className="text-xs text-muted-foreground">
                      {listing.approval_status} on {new Date(listing.approved_at).toLocaleString()}
                      {listing.approved_by && ` by ${listing.approved_by}`}
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
