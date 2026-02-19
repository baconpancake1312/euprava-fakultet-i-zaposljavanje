"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Briefcase, Plus, Calendar, CheckCircle, Clock, XCircle, Pencil, Trash2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

export default function EmployerJobListingsPage() {
  const router = useRouter()
  const { token, user, isLoading: authLoading, isAuthenticated } = useAuth()
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [employerId, setEmployerId] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      if (authLoading) return

      if (!isAuthenticated || !token || !user) {
        setLoading(false)
        setError("Please log in to view your job listings")
        return
      }

      await loadListings()
    }

    loadData()
  }, [token, user, authLoading, isAuthenticated])

  const loadListings = async () => {
    setLoading(true)
    try {
      if (!token || !user?.id) throw new Error("Not authenticated")
      
      // Get employer profile to find employer ID
      const employer = await apiClient.getEmployerByUserId(user.id, token)
      setEmployerId(employer.id)
      
      // Get all job listings and filter by employer ID
      const data = await apiClient.getJobListings(token)
      const myListings = data.filter((listing: any) => 
        listing.poster_id === employer.id || listing.poster_id === user.id
      )
      setListings(myListings)
    } catch (err) {
      console.error("Error loading job listings:", err)
      setError(err instanceof Error ? err.message : "Failed to load job listings")
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "Pending":
        return <Clock className="h-4 w-4 text-yellow-500" />
      case "Rejected":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const handleDelete = async (listingId: string) => {
    if (!confirm("Are you sure you want to delete this job listing? This action cannot be undone.")) {
      return
    }

    setDeletingId(listingId)
    try {
      await apiClient.deleteJobListing(listingId, token!)
      setListings(prev => prev.filter(listing => listing.id !== listingId))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete job listing")
    } finally {
      setDeletingId(null)
    }
  }

  // Show loading while auth loads
  if (authLoading) {
    return (
      <DashboardLayout title="Job Listings">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  // Show error if not authenticated
  if (!isAuthenticated || !token || !user) {
    return (
      <DashboardLayout title="Job Listings">
        <div className="space-y-6">
          <Alert variant="destructive">
            <AlertDescription>Please log in to view your job listings</AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Job Listings">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Job Listings</h2>
            <p className="text-muted-foreground">Manage your job postings</p>
          </div>
          <Button onClick={() => router.push("/dashboard/employer/job-listings/create")}>
            <Plus className="mr-2 h-4 w-4" />
            Create Listing
          </Button>
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
        ) : listings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No job listings yet</p>
              <Button onClick={() => router.push("/dashboard/employer/job-listings/create")}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Listing
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {listings.map((listing) => (
              <Card key={listing.id} className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-primary" />
                        {listing.position}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {listing.is_internship ? "Internship" : "Full-time Position"}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {listing.approval_status === "Approved" && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {listing.approval_status === "Pending" && <Clock className="h-4 w-4 text-yellow-500" />}
                      {listing.approval_status === "Rejected" && <XCircle className="h-4 w-4 text-red-500" />}
                      <Badge variant={listing.approval_status === "Approved" ? "default" : "secondary"}>
                        {listing.approval_status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-3">{listing.description}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Posted {new Date(listing.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {listing.expire_at && (
                    <div className="text-sm text-muted-foreground">
                      Expires: {new Date(listing.expire_at).toLocaleDateString()}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 bg-transparent"
                      onClick={() => router.push(`/dashboard/employer/job-listings/${listing.id}/edit`)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 bg-transparent"
                      onClick={() => router.push(`/dashboard/employer/job-listings/${listing.id}`)}
                    >
                      View Details
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(listing.id)}
                      disabled={deletingId === listing.id}
                    >
                      {deletingId === listing.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
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
