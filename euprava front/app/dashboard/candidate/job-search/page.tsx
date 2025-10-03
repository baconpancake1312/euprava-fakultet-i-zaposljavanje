"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Briefcase, Building, Calendar, Search } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

export default function CandidateJobSearchPage() {
  const { token, user } = useAuth()
  const [listings, setListings] = useState<any[]>([])
  const [filteredListings, setFilteredListings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [applying, setApplying] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadListings()
  }, [])

  useEffect(() => {
    if (searchTerm) {
      const filtered = listings.filter(
        (listing) =>
          listing.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
          listing.description.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setFilteredListings(filtered)
    } else {
      setFilteredListings(listings)
    }
  }, [searchTerm, listings])

  const loadListings = async () => {
    try {
      if (!token) throw new Error("Not authenticated")
      const data = await apiClient.getJobListings(token)
      console.log("[v0] Total listings fetched:", data.length)
      const approved = data.filter((listing: any) => listing.approval_status?.toLowerCase() === "approved")
      console.log("[v0] Approved listings:", approved.length)
      setListings(approved)
      setFilteredListings(approved)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load job listings")
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async (listingId: string) => {
    setApplying(listingId)
    try {
      if (!token || !user?.id) throw new Error("Not authenticated")
      await apiClient.applyToJob(listingId, { applicant_id: user.id }, token)
      toast({
        title: "Application Submitted",
        description: "Your application has been successfully submitted to the employer.",
      })
      setError("")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to apply"
      setError(errorMessage)
      toast({
        title: "Application Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setApplying(null)
    }
  }

  return (
    <DashboardLayout title="Job Search">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Job Search</h2>
          <p className="text-muted-foreground">Find your next career opportunity</p>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs by title or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
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
        ) : filteredListings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? "No jobs found matching your search" : "No approved job listings available at the moment"}
              </p>
              <p className="text-sm text-muted-foreground mt-2">Check back later for new opportunities</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {filteredListings.map((listing) => (
              <Card key={listing.id} className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-primary" />
                        {listing.position}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Building className="h-4 w-4" />
                        Company
                      </CardDescription>
                    </div>
                    {listing.is_internship && <Badge variant="secondary">Internship</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-3">{listing.description}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Posted {new Date(listing.created_at).toLocaleDateString()}</span>
                  </div>
                  <Button onClick={() => handleApply(listing.id)} disabled={applying === listing.id} className="w-full">
                    {applying === listing.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Applying...
                      </>
                    ) : (
                      "Apply Now"
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
