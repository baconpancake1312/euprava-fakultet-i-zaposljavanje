"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
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
  User,
  Download,
  Mail,
  Search,
  GraduationCap,
  Briefcase,
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

export default function EmployerCandidatesPage() {
  const { token, user, isLoading: authLoading, isAuthenticated } = useAuth()
  const { toast } = useToast()

  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [filtered, setFiltered] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // Profile dialog
  const [profileDialog, setProfileDialog] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)

  // Message dialog
  const [messageDialog, setMessageDialog] = useState(false)
  const [messageTarget, setMessageTarget] = useState<{ candidateId: string; name: string } | null>(null)
  const [messageContent, setMessageContent] = useState("")
  const [sendingMessage, setSendingMessage] = useState(false)

  const loadCandidates = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await apiClient.getAllCandidates(token)
      const list = Array.isArray(data) ? data : []
      const mapped: Candidate[] = list.map((c: any) => ({
        id: c.id || c._id,
        first_name: c.first_name || c.user?.first_name,
        last_name: c.last_name || c.user?.last_name,
        email: c.email || c.user?.email,
        major: c.major,
        year: c.year,
        gpa: c.gpa,
        highschool_gpa: c.highschool_gpa,
        esbp: c.esbp,
        scholarship: c.scholarship,
        skills: c.skills,
        cv_base64: c.cv_base64,
        cv_file: c.cv_file,
      }))
      setCandidates(mapped)
      setFiltered(mapped)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load candidates",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [token, toast])

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated || !token) return
    loadCandidates()
  }, [authLoading, isAuthenticated, token, loadCandidates])

  useEffect(() => {
    const q = searchQuery.toLowerCase()
    if (!q) {
      setFiltered(candidates)
      return
    }
    setFiltered(
      candidates.filter((c) => {
        const name = `${c.first_name || ""} ${c.last_name || ""}`.toLowerCase()
        const email = (c.email || "").toLowerCase()
        const major = (c.major || "").toLowerCase()
        const skills = (c.skills || []).join(" ").toLowerCase()
        return name.includes(q) || email.includes(q) || major.includes(q) || skills.includes(q)
      })
    )
  }, [searchQuery, candidates])

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

  const openMessageDialog = (candidate: Candidate) => {
    const name = `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim() || "Candidate"
    setMessageTarget({ candidateId: candidate.id, name })
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
          content: messageContent.trim(),
        },
        token!
      )
      toast({ title: "Message Sent", description: `Message sent to ${messageTarget.name}.` })
      setMessageDialog(false)
      setMessageContent("")
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to send message",
        variant: "destructive",
      })
    } finally {
      setSendingMessage(false)
    }
  }

  if (authLoading) {
    return (
      <DashboardLayout title="Candidates">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  if (!isAuthenticated || !token) {
    return (
      <DashboardLayout title="Candidates">
        <Alert variant="destructive">
          <AlertDescription>Please log in to access this page.</AlertDescription>
        </Alert>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Candidates">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Candidate Profiles</h2>
          <p className="text-muted-foreground">Browse all candidates, view their profiles and download CVs</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, major or skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{searchQuery ? "No candidates match your search." : "No candidates found."}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((candidate) => {
              const name =
                `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim() || "Unknown"
              return (
                <Card key={candidate.id} className="hover:border-primary/50 transition-colors flex flex-col">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{name}</p>
                        {candidate.email && (
                          <p className="text-xs text-muted-foreground truncate">{candidate.email}</p>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-3">
                    {/* Academic info */}
                    <div className="space-y-1 text-sm">
                      {candidate.major && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">
                            {candidate.major}
                            {candidate.year ? `, Year ${candidate.year}` : ""}
                          </span>
                        </div>
                      )}
                      {candidate.gpa !== undefined && candidate.gpa > 0 && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Briefcase className="h-3.5 w-3.5 shrink-0" />
                          <span>GPA: {candidate.gpa.toFixed(2)}</span>
                        </div>
                      )}
                    </div>

                    {/* Skills */}
                    {candidate.skills && candidate.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {candidate.skills.slice(0, 4).map((skill, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {candidate.skills.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{candidate.skills.length - 4}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setSelectedCandidate(candidate)
                          setProfileDialog(true)
                        }}
                      >
                        <User className="mr-1.5 h-3.5 w-3.5" />
                        Profile
                      </Button>
                      {(candidate.cv_base64 || candidate.cv_file) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => downloadCV(candidate)}
                        >
                          <Download className="mr-1.5 h-3.5 w-3.5" />
                          CV
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => openMessageDialog(candidate)}
                      >
                        <Mail className="mr-1.5 h-3.5 w-3.5" />
                        Message
                      </Button>
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
                    <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                      University GPA
                    </p>
                    <p>{selectedCandidate.gpa.toFixed(2)}</p>
                  </div>
                )}
                {selectedCandidate.highschool_gpa !== undefined && selectedCandidate.highschool_gpa > 0 && (
                  <div>
                    <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                      High School GPA
                    </p>
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
                      <Badge key={i} variant="secondary">
                        {skill}
                      </Badge>
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
            <Button variant="outline" onClick={() => setProfileDialog(false)}>
              Close
            </Button>
            {selectedCandidate && (
              <Button
                onClick={() => {
                  setProfileDialog(false)
                  openMessageDialog(selectedCandidate)
                }}
              >
                <Mail className="mr-2 h-4 w-4" />
                Send Message
              </Button>
            )}
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
              Write a message or letter to this candidate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="cand-message-content">Message</Label>
              <Textarea
                id="cand-message-content"
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
