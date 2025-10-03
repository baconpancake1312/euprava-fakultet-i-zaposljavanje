"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Briefcase, Building, Calendar } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

export default function StudentInternshipsPage() {
  const { token, user } = useAuth()
  const [internships, setInternships] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [applying, setApplying] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadInternships()
  }, [])

  const loadInternships = async () => {
    try {
      if (!token) throw new Error("Not authenticated")
      const data = await apiClient.getJobListings(token)
      console.log("[v0] Total listings fetched:", data.length)
      const approvedInternships = data.filter(
        (listing: any) => listing.is_internship && listing.approval_status?.toLowerCase() === "approved",
      )
      console.log("[v0] Approved internships:", approvedInternships.length)
      setInternships(approvedInternships)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load internships")
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async (internshipId: string) => {
    setApplying(internshipId)
    try {
      if (!token || !user?.id) throw new Error("Not authenticated")
      await apiClient.applyToJob(internshipId, { applicant_id: user.id }, token)
      toast({
        title: "Application Submitted",
        description: "Your internship application has been successfully submitted.",
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
    <DashboardLayout title="Internships">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Internship Opportunities</h2>
          <p className="text-muted-foreground">Browse and apply for approved internship positions</p>
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
        ) : internships.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No approved internships available at the moment</p>
              <p className="text-sm text-muted-foreground mt-2">
                Internships must be approved by administrators before they appear here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {internships.map((internship) => (
              <Card key={internship.id} className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-primary" />
                        {internship.position}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Building className="h-4 w-4" />
                        Employer ID: {internship.poster_id.slice(0, 8)}...
                      </CardDescription>
                    </div>
                    <Badge className="bg-green-500">Approved</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{internship.description}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Posted {new Date(internship.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {internship.expire_at && (
                    <div className="text-sm text-muted-foreground">
                      Expires: {new Date(internship.expire_at).toLocaleDateString()}
                    </div>
                  )}
                  <Button
                    onClick={() => handleApply(internship.id)}
                    disabled={applying === internship.id}
                    className="w-full"
                  >
                    {applying === internship.id ? (
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
