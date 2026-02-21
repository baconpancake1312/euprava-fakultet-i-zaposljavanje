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
      <div className="space-y-6 animate-fadeIn">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Welcome back, {user?.first_name}!
            </h2>
            <p className="text-muted-foreground mt-1">Manage your job listings and find the best candidates</p>
          </div>
          <div className="flex items-center gap-2">
            {employerData?.approval_status && (
              <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                employerData.approval_status.toLowerCase() === 'approved' 
                  ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                  : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
              }`}>
                {employerData.approval_status}
              </div>
            )}
          </div>
        </div>

        {/* Only show profile completion prompt if profile is NOT approved */}
        {needsProfileCompletion && !isApproved && (
          <div className="animate-slideIn">
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
          </div>
        )}

        {/* Quick Stats */}
        {employerData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-scaleIn">
            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Company Status</p>
                    <p className="text-2xl font-bold mt-1">
                      {employerData.approval_status || "Pending"}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Company Name</p>
                    <p className="text-lg font-bold mt-1 truncate">
                      {employerData.firm_name || "Not set"}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Briefcase className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">PIB Status</p>
                    <p className="text-2xl font-bold mt-1">
                      {employerData.pib ? "✓" : "Missing"}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Business Activity</p>
                    <p className="text-lg font-bold mt-1 truncate">
                      {employerData.delatnost || "Not set"}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-purple-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Action Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card
            className="border-2 hover:border-primary/50 transition-all cursor-pointer group hover:shadow-xl hover:scale-[1.02]"
            onClick={() => router.push("/dashboard/employer/job-listings")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 group-hover:scale-110 transition-transform">
                  <Briefcase className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Job Listings</CardTitle>
                  <CardDescription>Manage postings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Create, edit, and view your job listings</p>
            </CardContent>
          </Card>

          <Card
            className="border-2 hover:border-primary/50 transition-all cursor-pointer group hover:shadow-xl hover:scale-[1.02]"
            onClick={() => router.push("/dashboard/employer/applications")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/10 group-hover:scale-110 transition-transform">
                  <FileText className="h-7 w-7 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-xl">Applications</CardTitle>
                  <CardDescription>Review candidates</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">View and manage job applications</p>
            </CardContent>
          </Card>

          <Card
            className="border-2 hover:border-primary/50 transition-all cursor-pointer group hover:shadow-xl hover:scale-[1.02]"
            onClick={() => router.push("/dashboard/employer/internships")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-green-500/10 group-hover:scale-110 transition-transform">
                  <Users className="h-7 w-7 text-green-500" />
                </div>
                <div>
                  <CardTitle className="text-xl">Internships</CardTitle>
                  <CardDescription>Post opportunities</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Create internship positions for students</p>
            </CardContent>
          </Card>

          <Card
            className="border-2 hover:border-primary/50 transition-all cursor-pointer group hover:shadow-xl hover:scale-[1.02]"
            onClick={() => router.push("/dashboard/employer/company")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/10 group-hover:scale-110 transition-transform">
                  <Building className="h-7 w-7 text-purple-500" />
                </div>
                <div>
                  <CardTitle className="text-xl">Company Profile</CardTitle>
                  <CardDescription>Manage details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Update company information and settings</p>
            </CardContent>
          </Card>
        </div>

        {/* Company Information Card */}
        {employerData && (
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <Building className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Company Information</CardTitle>
                  <CardDescription>Your business details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Company Name</p>
                  <p className="text-lg font-semibold">{employerData.firm_name || "Not set"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Approval Status</p>
                  <p className="text-lg font-semibold">{employerData.approval_status || "Pending"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">PIB (Tax ID)</p>
                  <p className="text-lg font-semibold">{employerData.pib || "Not set"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Registration Number</p>
                  <p className="text-lg font-semibold">{employerData.maticni_broj || "Not set"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Business Activity</p>
                  <p className="text-lg font-semibold">{employerData.delatnost || "Not set"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Address</p>
                  <p className="text-lg font-semibold">{employerData.adresa || "Not set"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
