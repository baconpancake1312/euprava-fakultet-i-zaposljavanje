"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ProfileCompletionPrompt } from "@/components/profile-completion-prompt"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Briefcase, Users, FileText, Building, Loader2, MessageSquare, BarChart3, RefreshCw } from "lucide-react"
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
    
    // Refresh profile data periodically to check for approval status updates
    const interval = setInterval(() => {
      if (token && user?.id) {
        checkEmployerProfile()
      }
    }, 10000) // Check every 10 seconds

    // Also refresh when page comes into focus (user switches back to tab)
    const handleFocus = () => {
      if (token && user?.id) {
        checkEmployerProfile()
      }
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
    }
  }, [isAuthenticated, user, router, token])

  const checkEmployerProfile = async () => {
    try {
      if (!token || !user?.id) return

      const data = await apiClient.getEmployerByUserId(user.id, token)
      setEmployerData(data)

      // Check if profile needs completion
      // If approved, profile is considered complete regardless of fields
      const isApproved = data.approval_status?.toLowerCase() === 'approved'
      
      if (isApproved) {
        setNeedsProfileCompletion(false)
      } else {
        // Only check for missing fields if not approved
        const missingFields = []
        if (!data.firm_name) missingFields.push("firm_name")
        if (!data.pib) missingFields.push("pib")
        if (!data.maticni_broj) missingFields.push("maticni_broj")

        setNeedsProfileCompletion(missingFields.length > 0)
      }
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
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold">Employer dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Quick access to your job listings, applications, messages and company profile.
          </p>
        </div>

        {/* Only show profile completion prompt if profile is NOT approved */}
        {needsProfileCompletion && employerData?.approval_status?.toLowerCase() !== 'approved' && (
          <div className="animate-slideIn">
            <ProfileCompletionPrompt
              title="Complete Your Employer Profile"
              description="To post job listings and access employment services, please complete your company profile."
              missingFields={[
                "Company Name",
                "PIB (Tax ID)",
                "Registration Number",
                "Company Address",
              ]}
              onComplete={() => router.push("/dashboard/employer/complete-profile")}
            />
          </div>
        )}

        {/* Quick stats */}
        {employerData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-[#FF5A5F]/10 flex items-center justify-center">
                    <Building className="h-5 w-5 text-[#FF5A5F]" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Company status
                    </p>
                    <p className="text-lg font-semibold mt-1">
                      {employerData.approval_status || "Pending"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-[#FF5A5F]/10 flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-[#FF5A5F]" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Company name
                    </p>
                    <p className="text-lg font-semibold mt-1 truncate">
                      {employerData.firm_name || "Not set"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card
            className="cursor-pointer"
            onClick={() => router.push("/dashboard/employer/job-listings")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-[#FF5A5F]/10 flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-[#FF5A5F]" />
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
            className="cursor-pointer"
            onClick={() => router.push("/dashboard/employer/applications")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-[#FF5A5F]/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-[#FF5A5F]" />
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
            className="cursor-pointer"
            onClick={() => router.push("/dashboard/employer/company")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-[#FF5A5F]/10 flex items-center justify-center">
                  <Building className="h-5 w-5 text-[#FF5A5F]" />
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

        {/* Other */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card
            className="cursor-pointer"
            onClick={() => router.push("/dashboard/employer/messages")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-[#FF5A5F]/10 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-[#FF5A5F]" />
                </div>
                <div>
                  <CardTitle className="text-xl">Messages</CardTitle>
                  <CardDescription>Communicate</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Chat with candidates and manage conversations</p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer"
            onClick={() => router.push("/dashboard/employer/internships")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-[#FF5A5F]/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-[#FF5A5F]" />
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
            className="cursor-pointer"
            onClick={() => router.push("/dashboard/employer/analytics")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-[#FF5A5F]/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-[#FF5A5F]" />
                </div>
                <div>
                  <CardTitle className="text-xl">Analytics</CardTitle>
                  <CardDescription>View insights</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Track job performance and candidate metrics</p>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
