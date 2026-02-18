"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ProfileCompletionPrompt } from "@/components/profile-completion-prompt"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Search, User, Loader2 } from "lucide-react"
import { apiClient } from "@/lib/api-client"

export default function CandidateDashboard() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, token, isAuthenticated, isLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [candidateData, setCandidateData] = useState<any>(null)
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false)
  const [isApproved, setIsApproved] = useState(false)
  const [hasRedirected, setHasRedirected] = useState(false)

  useEffect(() => {
    // Wait for auth to load before checking
    if (isLoading) return

    if (!isAuthenticated || user?.user_type !== "CANDIDATE") {
      router.push("/login")
      return
    }

    // Only check profile if we haven't redirected yet
    if (!hasRedirected) {
      checkCandidateProfile()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading, user, router, pathname, hasRedirected])

  const checkCandidateProfile = async () => {
    try {
      if (!token || !user?.id) {
        setLoading(false)
        return
      }

      const data = await apiClient.getCandidateById(user.id, token)
      setCandidateData(data)

      // Check approval status (handle both "approved" and "Approved")
      const approvalStatus = data.approval_status?.toLowerCase()
      const approved = approvalStatus === "approved"
      setIsApproved(approved)

      // If approved and we're on the dashboard page, redirect to profile page
      // Only redirect if we're actually on the dashboard route and haven't redirected yet
      if (approved && pathname === "/dashboard/candidate" && !hasRedirected) {
        setHasRedirected(true)
        router.replace("/dashboard/candidate/profile")
        return
      }

      // Check if profile needs completion (only if not approved)
      const missingFields = []
      if (!data.cv_file && !data.cv_base64) missingFields.push("cv")
      if (!data.skills || data.skills.length === 0) missingFields.push("skills")

      setNeedsProfileCompletion(missingFields.length > 0)
    } catch (error) {
      // Candidate profile doesn't exist yet - show dashboard to complete profile
      setIsApproved(false)
      setNeedsProfileCompletion(true)
    } finally {
      setLoading(false)
    }
  }

  // Show loading while auth is loading or while checking candidate profile
  if (isLoading || loading) {
    return (
      <DashboardLayout title="Candidate Dashboard">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  // If approved and redirecting, show loading
  if (isApproved && hasRedirected) {
    return (
      <DashboardLayout title="Candidate Dashboard">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Candidate Dashboard">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Welcome, {user?.first_name}!</h2>
          <p className="text-muted-foreground">Find your next career opportunity</p>
        </div>

        {/* Only show profile completion prompt if profile is NOT approved */}
        {needsProfileCompletion && !isApproved && (
          <ProfileCompletionPrompt
            title="Complete Your Candidate Profile"
            description="To apply for jobs, please complete your profile with your CV and skills."
            missingFields={["CV/Resume", "Skills and Expertise"]}
            onComplete={() => router.push("/dashboard/candidate/complete-profile")}
          />
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card
            className="hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => router.push("/dashboard/candidate/job-search")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Search className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Job Search</CardTitle>
                  <CardDescription>Find opportunities</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Browse available job listings and internships</p>
            </CardContent>
          </Card>

          <Card
            className="hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => router.push("/dashboard/candidate/applications")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>My Applications</CardTitle>
                  <CardDescription>Track your progress</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">View status of your job applications</p>
            </CardContent>
          </Card>

          <Card
            className="hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => router.push("/dashboard/candidate/profile")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <User className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <CardTitle>My Profile</CardTitle>
                  <CardDescription>Update information</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Manage your CV, skills, and preferences</p>
            </CardContent>
          </Card>
        </div>

        {candidateData && (
          <Card>
            <CardHeader>
              <CardTitle>Profile Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">CV Status</p>
                  <p className="text-lg font-semibold">
                    {candidateData.cv_file || candidateData.cv_base64 ? "Uploaded" : "Not uploaded"}
                  </p>
                </div>
                {candidateData.skills && candidateData.skills.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {candidateData.skills.map((skill: string, index: number) => (
                        <span key={index} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
