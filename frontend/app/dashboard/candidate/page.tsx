"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ProfileCompletionPrompt } from "@/components/profile-completion-prompt"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, Search, User, Loader2, MessageSquare, CheckCircle2, XCircle } from "lucide-react"
import { apiClient } from "@/lib/api-client"

export default function CandidateDashboard() {
  const router = useRouter()
  const { user, token, isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(true)
  const [candidateData, setCandidateData] = useState<any>(null)
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [decisionSummary, setDecisionSummary] = useState<{ accepted: number; rejected: number }>({ accepted: 0, rejected: 0 })
  const lastNotifState = useRef<{ unread: number; accepted: number; rejected: number }>({ unread: 0, accepted: 0, rejected: 0 })

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
      // If approved, profile is considered complete regardless of fields
      const isApproved = data.approval_status?.toLowerCase() === 'approved'
      
      if (isApproved) {
        setNeedsProfileCompletion(false)
      } else {
        // Only check for missing fields if not approved
        const missingFields = []
        if (!data.cv_file && !data.cv_base64) missingFields.push("cv")
        if (!data.skills || data.skills.length === 0) missingFields.push("skills")

        setNeedsProfileCompletion(missingFields.length > 0)
      }

      // Unread messages
      try {
        const inbox = await apiClient.getInboxMessages(user.id, token)
        const msgs = Array.isArray(inbox) ? inbox : []
        setUnreadMessages(msgs.filter((m: any) => !m.read).length)
      } catch {
        setUnreadMessages(0)
      }

      // Application decisions
      try {
        const apps = await apiClient.getApplicationsByCandidate(user.id, token)
        const list = Array.isArray(apps) ? apps : []
        const accepted = list.filter((a: any) => a.status?.toLowerCase() === "accepted").length
        const rejected = list.filter((a: any) => a.status?.toLowerCase() === "rejected").length
        setDecisionSummary({ accepted, rejected })
      } catch {
        setDecisionSummary({ accepted: 0, rejected: 0 })
      }
    } catch (error) {
      // Candidate profile doesn't exist yet
      setNeedsProfileCompletion(true)
    } finally {
      setLoading(false)
    }
  }

  // Browser taskbar / system notifications for unread messages + decisions
  useEffect(() => {
    if (typeof window === "undefined" || typeof Notification === "undefined") return

    const shouldNotify =
      unreadMessages !== lastNotifState.current.unread ||
      decisionSummary.accepted !== lastNotifState.current.accepted ||
      decisionSummary.rejected !== lastNotifState.current.rejected

    if (!shouldNotify) return

    lastNotifState.current = {
      unread: unreadMessages,
      accepted: decisionSummary.accepted,
      rejected: decisionSummary.rejected,
    }

    const triggerNotifications = () => {
      if (unreadMessages > 0) {
        new Notification("New messages", {
          body: `You have ${unreadMessages} unread message${unreadMessages > 1 ? "s" : ""}.`,
        })
      }
      if (decisionSummary.accepted > 0 || decisionSummary.rejected > 0) {
        const parts: string[] = []
        if (decisionSummary.accepted > 0) {
          parts.push(`${decisionSummary.accepted} accepted`)
        }
        if (decisionSummary.rejected > 0) {
          parts.push(`${decisionSummary.rejected} rejected`)
        }
        new Notification("Application updates", {
          body: `Decisions on your applications: ${parts.join(", ")}.`,
        })
      }
    }

    if (Notification.permission === "granted") {
      triggerNotifications()
    } else if (Notification.permission === "default") {
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") triggerNotifications()
      })
    }
  }, [unreadMessages, decisionSummary.accepted, decisionSummary.rejected])

  if (loading) {
    return (
      <DashboardLayout title="Candidate Dashboard">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#FF5A5F]" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Candidate Dashboard">
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold">Candidate dashboard</h2>
          <p className="text-sm text-muted-foreground">See your profile status, applications and messages at a glance.</p>
        </div>

        {/* Only show profile completion prompt if profile is NOT approved */}
        {needsProfileCompletion && candidateData?.approval_status?.toLowerCase() !== 'approved' && (
          <div className="animate-slideIn">
            <ProfileCompletionPrompt
              title="Complete Your Candidate Profile"
              description="To apply for jobs, please complete your profile with your CV and skills."
              missingFields={["CV/Resume", "Skills and Expertise"]}
              onComplete={() => router.push("/dashboard/candidate/complete-profile")}
            />
          </div>
        )}

        {/* Notifications */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {unreadMessages > 0 && (
            <Alert>
              <MessageSquare className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between gap-4">
                <span>
                  You have <span className="font-semibold">{unreadMessages}</span> unread message
                  {unreadMessages > 1 ? "s" : ""}. Check your messages.
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-xs underline"
                    onClick={() => router.push("/dashboard/candidate/messages")}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    className="text-xs underline"
                    onClick={() => {
                      setUnreadMessages(0)
                      if (typeof window !== "undefined") {
                        window.dispatchEvent(
                          new CustomEvent("candidate-local-notification", {
                            detail: { type: "msg", unread: 0 },
                          })
                        )
                      }
                    }}
                  >
                    Mark read
                  </button>
                </div>
              </AlertDescription>
            </Alert>
          )}
          {(decisionSummary.accepted > 0 || decisionSummary.rejected > 0) && (
            <Alert>
              {decisionSummary.accepted > 0 ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertDescription className="flex items-center justify-between gap-4">
                <span>
                  {decisionSummary.accepted > 0 && (
                    <span className="mr-2">
                      <span className="font-semibold">{decisionSummary.accepted}</span> application
                      {decisionSummary.accepted > 1 ? "s" : ""} accepted.
                    </span>
                  )}
                  {decisionSummary.rejected > 0 && (
                    <span>
                      <span className="font-semibold">{decisionSummary.rejected}</span> application
                      {decisionSummary.rejected > 1 ? "s" : ""} rejected.
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  className="text-xs underline"
                  onClick={() => {
                    setDecisionSummary({ accepted: 0, rejected: 0 })
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(
                        new CustomEvent("candidate-local-notification", {
                          detail: { type: "app", accepted: 0, rejected: 0 },
                        })
                      )
                    }
                  }}
                >
                  Dismiss
                </button>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Quick stats */}
        {candidateData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Profile Status</p>
                    <p className="text-2xl font-bold mt-1">
                      {candidateData.cv_file || candidateData.cv_base64 ? "Complete" : "Incomplete"}
                    </p>
                  </div>
                  <div className="h-9 w-9 rounded-full bg-[#FF5A5F]/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-[#FF5A5F]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">CV Status</p>
                    <p className="text-2xl font-bold mt-1">
                      {candidateData.cv_file || candidateData.cv_base64 ? "Uploaded" : "Missing"}
                    </p>
                  </div>
                  <div className="h-9 w-9 rounded-full bg-[#FF5A5F]/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-[#FF5A5F]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Skills Listed</p>
                    <p className="text-2xl font-bold mt-1">
                      {candidateData.skills?.length || 0}
                    </p>
                  </div>
                  <div className="h-9 w-9 rounded-full bg-[#FF5A5F]/10 flex items-center justify-center">
                    <Search className="h-5 w-5 text-[#FF5A5F]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Ready to Apply</p>
                    <p className="text-2xl font-bold mt-1">
                      {(candidateData.cv_file || candidateData.cv_base64) && candidateData.skills?.length > 0 ? "Yes" : "No"}
                    </p>
                  </div>
                  <div className="h-9 w-9 rounded-full bg-[#FF5A5F]/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-[#FF5A5F]" />
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
            onClick={() => router.push("/dashboard/candidate/job-search")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-[#FF5A5F]/10 flex items-center justify-center">
                  <Search className="h-5 w-5 text-[#FF5A5F]" />
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
            className="cursor-pointer"
            onClick={() => router.push("/dashboard/candidate/applications")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-[#FF5A5F]/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-[#FF5A5F]" />
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
            className="cursor-pointer"
            onClick={() => router.push("/dashboard/candidate/profile")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-[#FF5A5F]/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-[#FF5A5F]" />
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

      </div>
    </DashboardLayout>
  )
}
