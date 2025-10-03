"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ProfileCompletionPrompt } from "@/components/profile-completion-prompt"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Briefcase, Users, FileText, Building, Loader2 } from "lucide-react"
import { apiClient } from "@/lib/api-client"

export default function EmployerDashboard() {
  const router = useRouter()
  const { user, token, isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(true)
  const [employerData, setEmployerData] = useState<any>(null)
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || user?.user_type !== "EMPLOYER") {
      router.push("/login")
      return
    }

    checkEmployerProfile()
  }, [isAuthenticated, user, router])

  const checkEmployerProfile = async () => {
    try {
      if (!token || !user?.id) return

      const data = await apiClient.getEmployerById(user.id, token)
      setEmployerData(data)

      // Check if profile needs completion
      const missingFields = []
      if (!data.firm_name) missingFields.push("firm_name")
      if (!data.pib) missingFields.push("pib")
      if (!data.maticni_broj) missingFields.push("maticni_broj")

      setNeedsProfileCompletion(missingFields.length > 0)
    } catch (error) {
      // Employer profile doesn't exist yet
      setNeedsProfileCompletion(true)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Employer Dashboard">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Employer Dashboard">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Welcome, {user?.first_name}!</h2>
          <p className="text-muted-foreground">Manage your job listings and find the best candidates</p>
        </div>

        {needsProfileCompletion && (
          <ProfileCompletionPrompt
            title="Complete Your Employer Profile"
            description="To post job listings and access employment services, please complete your company profile."
            missingFields={[
              "Company Name",
              "PIB (Tax ID)",
              "Registration Number",
              "Business Activity",
              "Company Address",
            ]}
            onComplete={() => router.push("/dashboard/employer/complete-profile")}
          />
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card
            className="hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => router.push("/dashboard/employer/job-listings")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Briefcase className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Job Listings</CardTitle>
                  <CardDescription>Manage your postings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Create, edit, and view your job listings</p>
            </CardContent>
          </Card>

          <Card
            className="hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => router.push("/dashboard/employer/applications")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Applications</CardTitle>
                  <CardDescription>Review candidates</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">View and manage job applications</p>
            </CardContent>
          </Card>

          <Card
            className="hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => router.push("/dashboard/employer/internships")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Users className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <CardTitle>Internships</CardTitle>
                  <CardDescription>Post opportunities</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Create internship positions for students</p>
            </CardContent>
          </Card>

          <Card
            className="hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => router.push("/dashboard/employer/company")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Building className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Company Profile</CardTitle>
                  <CardDescription>Manage details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Update company information and settings</p>
            </CardContent>
          </Card>
        </div>

        {employerData && (
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Company Name</p>
                  <p className="text-lg font-semibold">{employerData.firm_name || "Not set"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Approval Status</p>
                  <p className="text-lg font-semibold">{employerData.approval_status || "Pending"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">PIB</p>
                  <p className="text-lg font-semibold">{employerData.pib || "Not set"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Business Activity</p>
                  <p className="text-lg font-semibold">{employerData.delatnost || "Not set"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
