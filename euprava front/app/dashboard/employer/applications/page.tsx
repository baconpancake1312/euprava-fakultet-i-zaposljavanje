"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, FileText, User, Calendar } from "lucide-react"

interface Application {
  id: string
  applicant_id: string
  listing_id: string
  status: string
  submitted_at: string
}

interface JobListing {
  id: string
  position: string
  poster_id: string
}

export default function EmployerApplicationsPage() {
  const router = useRouter()
  const { user, token, isAuthenticated, isLoading } = useAuth()
  const [applications, setApplications] = useState<Application[]>([])
  const [listings, setListings] = useState<JobListing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
      return
    }

    if (token && user) {
      loadApplications()
    }
  }, [isAuthenticated, isLoading, router, token, user])

  const loadApplications = async () => {
    try {
      const [allApplications, allListings] = await Promise.all([
        apiClient.getApplications(token!),
        apiClient.getJobListings(token!),
      ])

      // Filter listings posted by this employer
      const myListings = allListings.filter((listing: JobListing) => listing.poster_id === user?.id)
      const myListingIds = myListings.map((l: JobListing) => l.id)

      // Filter applications for this employer's listings
      const myApplications = allApplications.filter((app: Application) => myListingIds.includes(app.listing_id))

      setListings(myListings)
      setApplications(myApplications)
    } catch (error) {
      console.error("Failed to load applications:", error)
    } finally {
      setLoading(false)
    }
  }

  const getListingTitle = (listingId: string) => {
    const listing = listings.find((l) => l.id === listingId)
    return listing?.position || "Unknown Position"
  }

  if (isLoading || loading) {
    return (
      <DashboardLayout title="Applications">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Applications">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Job Applications</h2>
          <p className="text-muted-foreground">Review applications from candidates</p>
        </div>

        {applications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No applications yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {applications.map((application) => (
              <Card key={application.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Applicant ID: {application.applicant_id.slice(0, 12)}...
                      </CardTitle>
                      <CardDescription>{getListingTitle(application.listing_id)}</CardDescription>
                    </div>
                    <Badge variant={application.status === "Pending" ? "secondary" : "default"}>
                      {application.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Submitted {new Date(application.submitted_at).toLocaleDateString()}
                    </div>
                    <Button size="sm">View Details</Button>
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
