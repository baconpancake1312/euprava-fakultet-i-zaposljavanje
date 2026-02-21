"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
  FileText,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  Briefcase,
  Download,
  Mail,
  ChevronDown,
  ChevronRight,
  Users,
  Clock,
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
  profile_pic_base64?: string
}

interface Application {
  id: string
  applicant_id: string
  listing_id: string
  status: string
  submitted_at: string
  updated_at?: string
  candidate?: Candidate
}

interface JobListing {
  id: string
  position: string
  description: string
  is_internship?: boolean
  created_at: string
}

export default function EmployerApplicationsPage() {
  const { token, user, isLoading: authLoading, isAuthenticated } = useAuth()
  const { toast } = useToast()

  const [jobListings, setJobListings] = useState<JobListing[]>([])
  const [applicationsByListing, setApplicationsByListing] = useState<Record<string, Application[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [expandedListing, setExpandedListing] = useState<string | null>(null)
  const [loadingApps, setLoadingApps] = useState<string | null>(null)

  // Profile dialog
  const [profileDialog, setProfileDialog] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)

  // Message dialog
  const [messageDialog, setMessageDialog] = useState(false)
  const [messageTarget, setMessageTarget] = useState<{ candidateId: string; name: string; listingId?: string } | null>(null)
  const [messageContent, setMessageContent] = useState("")
  const [sendingMessage, setSendingMessage] = useState(false)

  const loadListings = useCallback(async () => {
    if (!token || !user?.id) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      // Resolve employer document ID
      let employerId = user.id
      try {
        const emp = await apiClient.getEmployerByUserId(user.id, token)
        if (emp && (emp as any).id) employerId = (emp as any).id
      } catch { /* fallback to user.id */ }

      // Get all listings and filter to this employer's
      const allListings = await apiClient.getJobListings(token)
      const myListings = (Array.isArray(allListings) ? allListings : []).filter((l: any) => {
        const pid = l.poster_id?.toString?.() || l.poster_id || ""
        return pid === employerId
      }) as JobListing[]

      setJobListings(myListings)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load job listings")
    } finally {
      setLoading(false)
    }
  }, [token, user])

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated || !token || !user) { setLoading(false); return }
    loadListings()
  }, [authLoading, isAuthenticated, token, user, loadListings])

  const loadApplicationsForListing = async (listingId: string) => {
    if (applicationsByListing[listingId]) {
      setExpandedListing(expandedListing === listingId ? null : listingId)
      return
    }
    setLoadingApps(listingId)
    setExpandedListing(listingId)
    try {
      const result = await apiClient.getApplicationsForJob(listingId, token!)
      const apps: Application[] = Array.isArray(result)
        ? result
        : (result as any)?.applications || []

      // Enrich with candidate info
      const allCandidates = await apiClient.getAllCandidates(token!).catch(() => [])
      const candidateList = Array.isArray(allCandidates) ? allCandidates : []

      const enriched = apps.map((app) => {
        const appId = app.applicant_id?.toString?.() || app.applicant_id || ""
        const candidate = candidateList.find((c: any) => {
          const cid = c.id || c._id || ""
          return cid === appId || (c.user && (c.user.id === appId || c.user._id === appId))
        }) as any
        if (candidate) {
          app.candidate = {
            id: candidate.id || candidate._id,
            first_name: candidate.first_name || candidate.user?.first_name,
            last_name: candidate.last_name || candidate.user?.last_name,
            email: candidate.email || candidate.user?.email,
            major: candidate.major,
            year: candidate.year,
            gpa: candidate.gpa,
            highschool_gpa: candidate.highschool_gpa,
            esbp: candidate.esbp,
            scholarship: candidate.scholarship,
            skills: candidate.skills,
            cv_base64: candidate.cv_base64,
            cv_file: candidate.cv_file,
          }
        }
        return app
      })

      setApplicationsByListing((prev) => ({ ...prev, [listingId]: enriched }))
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to load applications",
        variant: "destructive",
      })
      setExpandedListing(null)
    } finally {
      setLoadingApps(null)
    }
  }

  const handleToggleListing = (listingId: string) => {
    if (expandedListing === listingId) {
      setExpandedListing(null)
    } else {
      loadApplicationsForListing(listingId)
    }
  }

  const handleAccept = async (applicationId: string, listingId: string) => {
    setProcessingId(applicationId)
    try {
      await apiClient.acceptApplication(applicationId, token!)
      setApplicationsByListing((prev) => ({
        ...prev,
        [listingId]: (prev[listingId] || []).map((a) =>
          a.id === applicationId ? { ...a, status: "accepted" } : a
        ),
      }))
      toast({ title: "Application Accepted", description: "The application has been accepted." })
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to accept", variant: "destructive" })
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (applicationId: string, listingId: string) => {
    setProcessingId(applicationId)
    try {
      await apiClient.rejectApplication(applicationId, token!)
      setApplicationsByListing((prev) => ({
        ...prev,
        [listingId]: (prev[listingId] || []).map((a) =>
          a.id === applicationId ? { ...a, status: "rejected" } : a
        ),
      }))
      toast({ title: "Application Rejected", description: "The application has been rejected." })
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to reject", variant: "destructive" })
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
        { sender_id: user.id, receiver_id: messageTarget.candidateId, job_listing_id: messageTarget.listingId, content: messageContent.trim() },
        token!
      )
      toast({ title: "Message Sent", description: `Message sent to ${messageTarget.name}.` })
      setMessageDialog(false)
      setMessageContent("")
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to send message", variant: "destructive" })
    } finally {
      setSendingMessage(false)
    }
  }

  const downloadCV = (candidate: Candidate) => {
    const raw = candidate.cv_base64 || candidate.cv_file
    if (!raw) {
      toast({ title: "No CV", description: "This candidate has not uploaded a CV.", variant: "destructive" })
      return
    }
    try {
      // Strip data URI prefix if present (e.g. "data:application/pdf;base64,...")
      const base64 = raw.includes(",") ? raw.split(",")[1] : raw
      const mimeType = raw.startsWith("data:") ? raw.split(";")[0].replace("data:", "") : "application/pdf"
      const byteCharacters = atob(base64)
      const byteArray = new Uint8Array(Array.from(byteCharacters).map((c) => c.charCodeAt(0)))
      const blob = new Blob([byteArray], { type: mimeType })
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
      case "accepted": return <Badge className="bg-green-100 text-green-800">Accepted</Badge>
      case "rejected": return <Badge className="bg-red-100 text-red-800">Rejected</Badge>
      case "pending": return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      default: return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (authLoading) {
    return (
      <DashboardLayout title="Job Applications">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Job Applications">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Job Applications</h2>
          <p className="text-muted-foreground">Click on a position to view candidates who applied</p>
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
        ) : jobListings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No job listings yet</p>
              <p className="text-sm text-muted-foreground mt-2">Create job listings to start receiving applications</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {jobListings.map((listing) => {
              const isExpanded = expandedListing === listing.id
              const isLoadingThis = loadingApps === listing.id
              const apps = applicationsByListing[listing.id] || []
              const appCount = applicationsByListing[listing.id]?.length

              return (
                <Card key={listing.id} className={`transition-all ${isExpanded ? "border-primary" : "hover:border-primary/50"}`}>
                  {/* Listing header — clickable */}
                  <CardHeader
                    className="cursor-pointer select-none"
                    onClick={() => handleToggleListing(listing.id)}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Briefcase className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-base truncate">{listing.position}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-0.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(listing.created_at).toLocaleDateString()}
                            {listing.is_internship && (
                              <Badge variant="outline" className="text-xs ml-1">Internship</Badge>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {appCount !== undefined && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {appCount} applicant{appCount !== 1 ? "s" : ""}
                          </Badge>
                        )}
                        {isLoadingThis ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {/* Expanded applicants */}
                  {isExpanded && !isLoadingThis && (
                    <CardContent className="pt-0 border-t">
                      {apps.length === 0 ? (
                        <div className="py-6 text-center text-muted-foreground text-sm">
                          <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          No applications for this position yet.
                        </div>
                      ) : (
                        <div className="space-y-3 pt-4">
                          <p className="text-sm font-medium text-muted-foreground">
                            {apps.length} applicant{apps.length !== 1 ? "s" : ""}
                          </p>
                          {apps.map((application) => {
                            const candidate = application.candidate
                            const candidateName = candidate
                              ? `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim() || "Unknown"
                              : "Unknown Candidate"

                            return (
                              <div key={application.id} className="border rounded-lg p-4 space-y-3 bg-muted/20">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    {candidate?.profile_pic_base64 ? (
                                      <img
                                        src={candidate.profile_pic_base64}
                                        alt={candidateName}
                                        className="h-8 w-8 rounded-full object-cover border border-primary/20 shrink-0"
                                      />
                                    ) : (
                                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <User className="h-4 w-4 text-primary" />
                                      </div>
                                    )}
                                    <div>
                                      <p className="font-semibold text-sm">{candidateName}</p>
                                      {candidate?.email && (
                                        <p className="text-xs text-muted-foreground">{candidate.email}</p>
                                      )}
                                    </div>
                                  </div>
                                  {getStatusBadge(application.status)}
                                </div>

                                {/* Candidate quick info */}
                                {candidate && (
                                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                    {candidate.major && (
                                      <span>📚 {candidate.major}{candidate.year ? `, Y${candidate.year}` : ""}</span>
                                    )}
                                    {candidate.gpa !== undefined && candidate.gpa > 0 && (
                                      <span>🎓 GPA {candidate.gpa.toFixed(2)}</span>
                                    )}
                                    {candidate.skills && candidate.skills.length > 0 && (
                                      <span>🛠 {candidate.skills.slice(0, 3).join(", ")}{candidate.skills.length > 3 ? ` +${candidate.skills.length - 3}` : ""}</span>
                                    )}
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {new Date(application.submitted_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                )}

                                {/* Actions */}
                                <div className="flex flex-wrap gap-2">
                                  {candidate && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs"
                                      onClick={() => { setSelectedCandidate(candidate); setProfileDialog(true) }}
                                    >
                                      <User className="mr-1 h-3 w-3" />
                                      Profile
                                    </Button>
                                  )}
                                  {candidate && (candidate.cv_base64 || candidate.cv_file) && (
                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => downloadCV(candidate)}>
                                      <Download className="mr-1 h-3 w-3" />
                                      CV
                                    </Button>
                                  )}
                                  {candidate && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs"
                                      onClick={() => openMessageDialog(candidate.id, candidateName, listing.id)}
                                    >
                                      <Mail className="mr-1 h-3 w-3" />
                                      Message
                                    </Button>
                                  )}
                                  {application.status === "pending" && (
                                    <>
                                      <Button
                                        size="sm"
                                        className="h-7 text-xs bg-green-600 hover:bg-green-700"
                                        onClick={() => handleAccept(application.id, listing.id)}
                                        disabled={processingId === application.id}
                                      >
                                        {processingId === application.id ? (
                                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                        ) : (
                                          <CheckCircle className="mr-1 h-3 w-3" />
                                        )}
                                        Accept
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        className="h-7 text-xs"
                                        onClick={() => handleReject(application.id, listing.id)}
                                        disabled={processingId === application.id}
                                      >
                                        {processingId === application.id ? (
                                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                        ) : (
                                          <XCircle className="mr-1 h-3 w-3" />
                                        )}
                                        Reject
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  )}
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
              {selectedCandidate?.profile_pic_base64 ? (
                <img
                  src={selectedCandidate.profile_pic_base64}
                  alt={`${selectedCandidate.first_name} ${selectedCandidate.last_name}`}
                  className="h-5 w-5 rounded-full object-cover"
                />
              ) : (
                <User className="h-5 w-5" />
              )}
              Candidate Profile
            </DialogTitle>
          </DialogHeader>
          {selectedCandidate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">Name</p>
                  <p className="font-semibold">{selectedCandidate.first_name} {selectedCandidate.last_name}</p>
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
              {(selectedCandidate.cv_base64 || selectedCandidate.cv_file) ? (
                <Button className="w-full" variant="outline" onClick={() => downloadCV(selectedCandidate)}>
                  <Download className="mr-2 h-4 w-4" />
                  Download CV
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground text-center">No CV uploaded</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileDialog(false)}>Close</Button>
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
              <Label htmlFor="emp-message-content">Message</Label>
              <Textarea
                id="emp-message-content"
                placeholder="Write your message here..."
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                rows={5}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMessageDialog(false)}>Cancel</Button>
            <Button onClick={handleSendMessage} disabled={sendingMessage || !messageContent.trim()}>
              {sendingMessage ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</>
              ) : (
                <><Mail className="mr-2 h-4 w-4" />Send Message</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
