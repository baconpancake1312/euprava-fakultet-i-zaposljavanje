"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Loader2,
  ArrowLeft,
  CheckCircle,
  XCircle,
  User,
  Briefcase,
  Calendar,
  Download,
  Mail,
  GraduationCap,
  FileText,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Candidate {
  id: string
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  major?: string
  year?: number
  gpa?: number
  highschool_gpa?: number
  esbp?: number
  scholarship?: boolean
  skills?: string[]
  cv_base64?: string
  cv_file?: string
}

interface Application {
  id: string
  applicant_id: string
  listing_id: string
  status: string
  submitted_at: string
  job_listing?: {
    id: string
    position: string
    description: string
  }
  candidate?: Candidate
}

interface JobListing {
  id: string
  position: string
  description: string
  poster_id: string
  approval_status: string
  created_at: string
}

interface Employer {
  id: string
  first_name: string
  last_name: string
  email: string
  firm_name: string
  approval_status: string
}

export default function AdminEmployerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const employerId = params.id as string
  const { user, token, isLoading: authLoading, isAuthenticated } = useAuth()
  const { toast } = useToast()

  const [employer, setEmployer] = useState<Employer | null>(null)
  const [jobListings, setJobListings] = useState<JobListing[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Message dialog
  const [messageDialog, setMessageDialog] = useState(false)
  const [messageTarget, setMessageTarget] = useState<{ candidateId: string; name: string; listingId?: string } | null>(null)
  const [messageContent, setMessageContent] = useState("")
  const [sendingMessage, setSendingMessage] = useState(false)

  // Candidate profile dialog
  const [profileDialog, setProfileDialog] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)

  const adminToken = (user as any)?.token || token

  const loadData = useCallback(async () => {
    if (!adminToken || !employerId) return
    setLoading(true)
    try {
      // Load employer info
      const emp = await apiClient.getEmployerById(employerId, adminToken)
      setEmployer(emp as Employer)

      // Load all job listings and filter by this employer
      const allListings = await apiClient.getJobListings(adminToken)
      const empListings = (allListings as JobListing[]).filter((l) => {
        const pid = (l.poster_id as any)?.toString?.() || l.poster_id || ""
        return pid === employerId
      })
      setJobListings(empListings)

      // Load applications for each job listing
      const allApplications: Application[] = []
      await Promise.all(
        empListings.map(async (listing) => {
          try {
            const result = await apiClient.getApplicationsForJob(listing.id, adminToken)
            const apps: Application[] = Array.isArray(result)
              ? result
              : (result as any)?.applications || []

            // Enrich with job listing info and candidate info
            await Promise.all(
              apps.map(async (app) => {
                app.job_listing = { id: listing.id, position: listing.position, description: listing.description }
                // Fetch candidate profile
                try {
                  const candidates = await apiClient.getAllCandidates(adminToken)
                  const candidateList = Array.isArray(candidates) ? candidates : []
                  const candidate = candidateList.find((c: any) => {
                    const cid = c.id || c._id || ""
                    const appId = app.applicant_id?.toString?.() || app.applicant_id || ""
                    return cid === appId || (c.user && (c.user.id === appId || c.user._id === appId))
                  })
                  if (candidate) {
                    app.candidate = {
                      id: (candidate as any).id || (candidate as any)._id,
                      first_name: (candidate as any).first_name || (candidate as any).user?.first_name,
                      last_name: (candidate as any).last_name || (candidate as any).user?.last_name,
                      email: (candidate as any).email || (candidate as any).user?.email,
                      major: (candidate as any).major,
                      year: (candidate as any).year,
                      gpa: (candidate as any).gpa,
                      highschool_gpa: (candidate as any).highschool_gpa,
                      esbp: (candidate as any).esbp,
                      scholarship: (candidate as any).scholarship,
                      skills: (candidate as any).skills,
                      cv_base64: (candidate as any).cv_base64,
                      cv_file: (candidate as any).cv_file,
                    }
                  }
                } catch {
                  // ignore
                }
                allApplications.push(app)
              })
            )
          } catch {
            // ignore listing errors
          }
        })
      )
      setApplications(allApplications)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [adminToken, employerId, toast])

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated || !user) return
    if (user.user_type !== "ADMIN" && user.user_type !== "STUDENTSKA_SLUZBA") return
    loadData()
  }, [authLoading, isAuthenticated, user, loadData])

  const handleAccept = async (applicationId: string) => {
    setProcessingId(applicationId)
    try {
      await apiClient.acceptApplication(applicationId, adminToken!)
      toast({ title: "Application Accepted", description: "The candidate has been accepted." })
      setApplications((prev) =>
        prev.map((a) => (a.id === applicationId ? { ...a, status: "accepted" } : a))
      )
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to accept",
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (applicationId: string) => {
    setProcessingId(applicationId)
    try {
      await apiClient.rejectApplication(applicationId, adminToken!)
      toast({ title: "Application Rejected", description: "The candidate has been rejected." })
      setApplications((prev) =>
        prev.map((a) => (a.id === applicationId ? { ...a, status: "rejected" } : a))
      )
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reject",
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  const openMessageDialog = (candidateId: string, name: string, listingId?: string) => {
    setMessageTarget({ candidateId, name, listingId })
    setMessageContent("")
    setMessageDialog(true)
  }

  const handleSendMessage = async () => {
    if (!messageTarget || !messageContent.trim() || !user) return
    setSendingMessage(true)
    try {
      await apiClient.sendMessageToCandidate(
        {
          sender_id: user.id,
          receiver_id: messageTarget.candidateId,
          job_listing_id: messageTarget.listingId,
          content: messageContent.trim(),
        },
        adminToken!
      )
      toast({ title: "Message Sent", description: `Message sent to ${messageTarget.name}.` })
      setMessageDialog(false)
      setMessageContent("")
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      })
    } finally {
      setSendingMessage(false)
    }
  }

  const downloadCV = (candidate: Candidate) => {
    const base64 = candidate.cv_base64 || candidate.cv_file
    if (!base64) {
      toast({ title: "No CV", description: "This candidate has not uploaded a CV.", variant: "destructive" })
      return
    }
    try {
      const byteCharacters = atob(base64)
      const byteNumbers = Array.from(byteCharacters).map((c) => c.charCodeAt(0))
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `cv_${candidate.first_name || "candidate"}_${candidate.last_name || ""}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      toast({ title: "Download Failed", description: "Could not download the CV file.", variant: "destructive" })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "accepted":
        return <Badge className="bg-green-500 text-white">Accepted</Badge>
      case "rejected":
        return <Badge className="bg-red-500 text-white">Rejected</Badge>
      case "pending":
        return <Badge className="bg-yellow-500 text-white">Pending</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (authLoading) {
    return (
      <DashboardLayout title="Employer Applications">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  if (!isAuthenticated || !user || (user.user_type !== "ADMIN" && user.user_type !== "STUDENTSKA_SLUZBA")) {
    return (
      <DashboardLayout title="Employer Applications">
        <Alert variant="destructive">
          <AlertDescription>Access denied. Admin privileges required.</AlertDescription>
        </Alert>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Employer Applications">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/admin/employers")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Employers
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {employer ? employer.firm_name : "Employer"} — Applications
            </h1>
            {employer && (
              <p className="text-muted-foreground">
                {employer.first_name} {employer.last_name} • {employer.email}
              </p>
            )}
          </div>
        </div>

        {/* Job Listings Summary */}
        {jobListings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Job Listings ({jobListings.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {jobListings.map((listing) => (
                  <Badge key={listing.id} variant="outline" className="text-sm py-1 px-3">
                    {listing.position}
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({applications.filter((a) => a.listing_id?.toString() === listing.id).length} applicants)
                    </span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Applications */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : applications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No applications found for this employer's job listings.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              All Applications ({applications.length})
            </h2>
            {applications.map((application) => {
              const candidate = application.candidate
              const candidateName = candidate
                ? `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim() || "Unknown Candidate"
                : "Unknown Candidate"

              return (
                <Card key={application.id} className="hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          <User className="h-5 w-5 text-primary" />
                          {candidateName}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Briefcase className="h-4 w-4" />
                          Applied for: {application.job_listing?.position || "Unknown Position"}
                        </CardDescription>
                      </div>
                      {getStatusBadge(application.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Candidate basic info */}
                    {candidate && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm bg-muted/30 rounded-lg p-3">
                        {candidate.email && (
                          <div>
                            <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Email</p>
                            <p>{candidate.email}</p>
                          </div>
                        )}
                        {candidate.major && (
                          <div>
                            <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Major</p>
                            <p>{candidate.major}</p>
                          </div>
                        )}
                        {candidate.year !== undefined && candidate.year > 0 && (
                          <div>
                            <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Year</p>
                            <p>Year {candidate.year}</p>
                          </div>
                        )}
                        {candidate.gpa !== undefined && candidate.gpa > 0 && (
                          <div>
                            <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">GPA</p>
                            <p>{candidate.gpa.toFixed(2)}</p>
                          </div>
                        )}
                        {candidate.skills && candidate.skills.length > 0 && (
                          <div className="col-span-2 md:col-span-3">
                            <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-1">Skills</p>
                            <div className="flex flex-wrap gap-1">
                              {candidate.skills.slice(0, 6).map((skill, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">{skill}</Badge>
                              ))}
                              {candidate.skills.length > 6 && (
                                <Badge variant="outline" className="text-xs">+{candidate.skills.length - 6} more</Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Applied {new Date(application.submitted_at).toLocaleDateString()}</span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {candidate && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedCandidate(candidate)
                            setProfileDialog(true)
                          }}
                        >
                          <User className="mr-2 h-4 w-4" />
                          View Profile
                        </Button>
                      )}
                      {candidate && (candidate.cv_base64 || candidate.cv_file) && (
                        <Button size="sm" variant="outline" onClick={() => downloadCV(candidate)}>
                          <Download className="mr-2 h-4 w-4" />
                          Download CV
                        </Button>
                      )}
                      {candidate && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            openMessageDialog(
                              candidate.id,
                              candidateName,
                              application.listing_id?.toString()
                            )
                          }
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          Send Message
                        </Button>
                      )}
                      {application.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleAccept(application.id)}
                            disabled={processingId === application.id}
                          >
                            {processingId === application.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="mr-2 h-4 w-4" />
                            )}
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(application.id)}
                            disabled={processingId === application.id}
                          >
                            {processingId === application.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="mr-2 h-4 w-4" />
                            )}
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Candidate Profile Dialog */}
      <Dialog open={profileDialog} onOpenChange={setProfileDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Candidate Profile
            </DialogTitle>
          </DialogHeader>
          {selectedCandidate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">Name</p>
                  <p className="font-semibold">
                    {selectedCandidate.first_name} {selectedCandidate.last_name}
                  </p>
                </div>
                {selectedCandidate.email && (
                  <div>
                    <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">Email</p>
                    <p>{selectedCandidate.email}</p>
                  </div>
                )}
                {selectedCandidate.major && (
                  <div>
                    <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">Major</p>
                    <p>{selectedCandidate.major}</p>
                  </div>
                )}
                {selectedCandidate.year !== undefined && selectedCandidate.year > 0 && (
                  <div>
                    <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">Year</p>
                    <p>Year {selectedCandidate.year}</p>
                  </div>
                )}
                {selectedCandidate.gpa !== undefined && selectedCandidate.gpa > 0 && (
                  <div>
                    <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">University GPA</p>
                    <p>{selectedCandidate.gpa.toFixed(2)}</p>
                  </div>
                )}
                {selectedCandidate.highschool_gpa !== undefined && selectedCandidate.highschool_gpa > 0 && (
                  <div>
                    <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">High School GPA</p>
                    <p>{selectedCandidate.highschool_gpa.toFixed(2)}</p>
                  </div>
                )}
                {selectedCandidate.esbp !== undefined && selectedCandidate.esbp > 0 && (
                  <div>
                    <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">ESBP Points</p>
                    <p>{selectedCandidate.esbp}</p>
                  </div>
                )}
                {selectedCandidate.scholarship !== undefined && (
                  <div>
                    <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">Scholarship</p>
                    <p>{selectedCandidate.scholarship ? "Yes" : "No"}</p>
                  </div>
                )}
              </div>
              {selectedCandidate.skills && selectedCandidate.skills.length > 0 && (
                <div>
                  <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide mb-2">Skills</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedCandidate.skills.map((skill, i) => (
                      <Badge key={i} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {(selectedCandidate.cv_base64 || selectedCandidate.cv_file) && (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => downloadCV(selectedCandidate)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download CV
                </Button>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Message Dialog */}
      <Dialog open={messageDialog} onOpenChange={setMessageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Send Message to {messageTarget?.name}
            </DialogTitle>
            <DialogDescription>
              Write a message or letter to this candidate regarding their application.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="message-content">Message</Label>
              <Textarea
                id="message-content"
                placeholder="Write your message here..."
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                rows={5}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMessageDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendMessage} disabled={sendingMessage || !messageContent.trim()}>
              {sendingMessage ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Message
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
