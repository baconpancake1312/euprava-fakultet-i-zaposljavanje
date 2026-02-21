"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ProfileCompletionPrompt } from "@/components/profile-completion-prompt"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Search, User, Loader2 } from "lucide-react"
import { apiClient } from "@/lib/api-client"

export default function CandidateDashboard() {
  const router = useRouter()
  const { user, token, isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(true)
  const [candidateData, setCandidateData] = useState<any>(null)
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || user?.user_type !== "CANDIDATE") {
      router.push("/login")
      return
    }

    checkCandidateProfile()
  }, [isAuthenticated, user, router])

  const checkCandidateProfile = async () => {
    try {
      if (!token || !user?.id) return

      const data = await apiClient.getCandidateById(user.id, token)
      setCandidateData(data)

      // Check if profile needs completion
      const missingFields = []
      if (!data.cv_file && !data.cv_base64) missingFields.push("cv")
      if (!data.skills || data.skills.length === 0) missingFields.push("skills")

      setNeedsProfileCompletion(missingFields.length > 0)
    } catch (error) {
      // Candidate profile doesn't exist yet
      setNeedsProfileCompletion(true)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
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
      <div className="space-y-6 animate-fadeIn">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Welcome back, {user?.first_name}!
            </h2>
            <p className="text-muted-foreground mt-1">Find your next career opportunity</p>
          </div>
          <div className="flex items-center gap-2">
            {candidateData?.approval_status && (
              <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                candidateData.approval_status.toLowerCase() === 'approved' 
                  ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                  : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
              }`}>
                {candidateData.approval_status}
              </div>
            )}
          </div>
        </div>

        {/* Only show profile completion prompt if profile is NOT approved */}
        {needsProfileCompletion && !isApproved && (
          <div className="animate-slideIn">
            <ProfileCompletionPrompt
              title="Complete Your Candidate Profile"
              description="To apply for jobs, please complete your profile with your CV and skills."
              missingFields={["CV/Resume", "Skills and Expertise"]}
              onComplete={() => router.push("/dashboard/candidate/complete-profile")}
            />
          </div>
        )}

        {/* Quick Stats */}
        {candidateData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-scaleIn">
            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Profile Status</p>
                    <p className="text-2xl font-bold mt-1">
                      {candidateData.cv_file || candidateData.cv_base64 ? "Complete" : "Incomplete"}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">CV Status</p>
                    <p className="text-2xl font-bold mt-1">
                      {candidateData.cv_file || candidateData.cv_base64 ? "Uploaded" : "Missing"}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Skills Listed</p>
                    <p className="text-2xl font-bold mt-1">
                      {candidateData.skills?.length || 0}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Search className="h-6 w-6 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Ready to Apply</p>
                    <p className="text-2xl font-bold mt-1">
                      {(candidateData.cv_file || candidateData.cv_base64) && candidateData.skills?.length > 0 ? "Yes" : "No"}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-purple-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Action Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card
            className="border-2 hover:border-primary/50 transition-all cursor-pointer group hover:shadow-xl hover:scale-[1.02]"
            onClick={() => router.push("/dashboard/candidate/job-search")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 group-hover:scale-110 transition-transform">
                  <Search className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Job Search</CardTitle>
                  <CardDescription>Find opportunities</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Browse available job listings and internships that match your profile</p>
            </CardContent>
          </Card>

          <Card
            className="border-2 hover:border-primary/50 transition-all cursor-pointer group hover:shadow-xl hover:scale-[1.02]"
            onClick={() => router.push("/dashboard/candidate/applications")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/10 group-hover:scale-110 transition-transform">
                  <FileText className="h-7 w-7 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-xl">My Applications</CardTitle>
                  <CardDescription>Track your progress</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">View status and manage your job applications</p>
            </CardContent>
          </Card>

          <Card
            className="border-2 hover:border-primary/50 transition-all cursor-pointer group hover:shadow-xl hover:scale-[1.02]"
            onClick={() => router.push("/dashboard/candidate/profile")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/10 group-hover:scale-110 transition-transform">
                  <User className="h-7 w-7 text-purple-500" />
                </div>
                <div>
                  <CardTitle className="text-xl">My Profile</CardTitle>
                  <CardDescription>Update information</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Manage your CV, skills, and preferences</p>
            </CardContent>
          </Card>
        </div>

        {/* Skills Section */}
        {candidateData && candidateData.skills && candidateData.skills.length > 0 && (
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <Search className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Your Skills</CardTitle>
                  <CardDescription>Skills on your profile</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {candidateData.skills.map((skill: string, index: number) => (
                  <span 
                    key={index} 
                    className="px-4 py-2 bg-gradient-to-r from-primary/10 to-primary/5 text-primary rounded-full text-sm font-medium border border-primary/20 hover:border-primary/40 transition-colors"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
