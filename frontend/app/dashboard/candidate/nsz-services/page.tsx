"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, HandCoins, Mail, CheckCircle2, MessageSquare, ChevronDown, ChevronUp } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// ─── Predefined benefit types ─────────────────────────────────────────────────
const PREDEFINED_BENEFITS = [
  { key: "unemployment", label: "Novčana naknada za nezaposlene", description: "Naknada za period nezaposlenosti (do 12 meseci)." },
  { key: "retraining", label: "Naknada za prekvalifikaciju", description: "Podrška za pohađanje kurseva i obuka." },
  { key: "disability", label: "Naknada za invalidnost", description: "Finansijska podrška licima sa invaliditetom." },
  { key: "parental", label: "Roditeljski dodatak", description: "Jednokratna ili mesečna naknada za roditelje." },
  { key: "custom", label: "Poseban zahtev (custom)", description: "Opišite razlog koji nije pokriven gornjim opcijama." },
]

interface BenefitClaim {
  id: string
  reason: string
  status: string
  created_at: string
  updated_at?: string
}

interface StateCommunication {
  id: string
  subject: string
  message: string
  response?: string
  status: string
  created_at: string
  updated_at?: string
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  submitted: "secondary",
  approved: "default",
  rejected: "destructive",
  open: "secondary",
  answered: "default",
  closed: "outline",
}

const statusLabel: Record<string, string> = {
  submitted: "Submitted",
  approved: "Approved ✓",
  rejected: "Rejected",
  open: "Open",
  answered: "Answered ✓",
  closed: "Closed",
}

export default function CandidateNSZServicesPage() {
  const router = useRouter()
  const { user, token, isAuthenticated, isLoading: authLoading } = useAuth()
  const { toast } = useToast()

  const [candidateId, setCandidateId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [claims, setClaims] = useState<BenefitClaim[]>([])
  const [communications, setCommunications] = useState<StateCommunication[]>([])

  // Benefit claim form
  const [selectedBenefit, setSelectedBenefit] = useState<string | null>(null)
  const [customReason, setCustomReason] = useState("")
  const [submittingClaim, setSubmittingClaim] = useState(false)

  // Communication form
  const [commSubject, setCommSubject] = useState("")
  const [commMessage, setCommMessage] = useState("")
  const [submittingComm, setSubmittingComm] = useState(false)

  // Expand/collapse history
  const [showAllClaims, setShowAllClaims] = useState(false)
  const [showAllComms, setShowAllComms] = useState(false)

  // ── Load data ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated || !user || !token) {
      setLoading(false)
      setError("Please log in as a candidate.")
      return
    }

    const load = async () => {
      try {
        const candidates = (await apiClient.getAllCandidates(token)) as any[]
        const candidate = candidates.find(
          (c: any) => c.email === user.email || c.id === user.id || c.user_id === user.id,
        )
        if (!candidate?.id) {
          setError("Candidate profile not found. Please complete your profile first.")
          setLoading(false)
          return
        }
        const cid = candidate.id as string
        setCandidateId(cid)

        const [claimsRes, commsRes] = await Promise.all([
          apiClient.getBenefitClaimsForCandidate(cid, token),
          apiClient.getStateCommunicationsForCandidate(cid, token),
        ])

        setClaims(Array.isArray(claimsRes) ? (claimsRes as BenefitClaim[]) : [])
        setCommunications(Array.isArray(commsRes) ? (commsRes as StateCommunication[]) : [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load services data.")
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [authLoading, isAuthenticated, token, user])

  // ── Notifications ─────────────────────────────────────────────────────────
  const approvedClaims = claims.filter((c) => c.status === "approved")
  const rejectedClaims = claims.filter((c) => c.status === "rejected")
  const answeredComms = communications.filter((c) => c.status === "answered" && c.response)

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSubmitClaim = async () => {
    if (!candidateId || !token) return
    const reason =
      selectedBenefit === "custom"
        ? customReason.trim()
        : PREDEFINED_BENEFITS.find((b) => b.key === selectedBenefit)?.label ?? ""
    if (!reason) return
    setSubmittingClaim(true)
    try {
      const created = await apiClient.createBenefitClaim({ candidate_id: candidateId, reason }, token)
      setClaims((prev) => [created as BenefitClaim, ...prev])
      setSelectedBenefit(null)
      setCustomReason("")
      toast({ title: "Request submitted", description: "Your benefit claim has been submitted for review." })
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to submit.", variant: "destructive" })
    } finally {
      setSubmittingClaim(false)
    }
  }

  const handleSubmitComm = async () => {
    if (!candidateId || !token || !commSubject.trim() || !commMessage.trim()) return
    setSubmittingComm(true)
    try {
      const created = await apiClient.createStateCommunication(
        { candidate_id: candidateId, subject: commSubject.trim(), message: commMessage.trim() },
        token,
      )
      setCommunications((prev) => [created as StateCommunication, ...prev])
      setCommSubject("")
      setCommMessage("")
      toast({ title: "Message sent", description: "Your message has been sent to the state." })
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to send.", variant: "destructive" })
    } finally {
      setSubmittingComm(false)
    }
  }

  const formatDate = (val?: string) => {
    if (!val) return ""
    const d = new Date(val)
    if (isNaN(d.getTime()) || d.getFullYear() < 2000) return ""
    return d.toLocaleDateString("sr-RS")
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (authLoading || loading) {
    return (
      <DashboardLayout title="Government Services">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  const visibleClaims = showAllClaims ? claims : claims.slice(0, 3)
  const visibleComms = showAllComms ? communications : communications.slice(0, 3)

  return (
    <DashboardLayout title="Government Services">
      <div className="space-y-6 max-w-3xl">
        <div>
          <h2 className="text-2xl font-semibold">Government Services</h2>
          <p className="text-sm text-muted-foreground">
            Submit benefit claims and communicate with the state employment office.
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* ── Status notifications ───────────────────────────────────────── */}
        {approvedClaims.length > 0 && (
          <Alert className="border-green-500/40 bg-green-50 dark:bg-green-950/20">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-700 dark:text-green-400">Benefit claim approved</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-400">
              {approvedClaims.length === 1
                ? `"${approvedClaims[0].reason}" was approved.`
                : `${approvedClaims.length} benefit claims have been approved.`}
            </AlertDescription>
          </Alert>
        )}

        {rejectedClaims.length > 0 && (
          <Alert variant="destructive">
            <AlertTitle>Benefit claim rejected</AlertTitle>
            <AlertDescription>
              {rejectedClaims.length === 1
                ? `"${rejectedClaims[0].reason}" was rejected.`
                : `${rejectedClaims.length} benefit claims were rejected.`}
            </AlertDescription>
          </Alert>
        )}

        {answeredComms.length > 0 && (
          <Alert className="border-blue-500/40 bg-blue-50 dark:bg-blue-950/20">
            <MessageSquare className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-700 dark:text-blue-400">You have a government response</AlertTitle>
            <AlertDescription className="text-blue-700 dark:text-blue-400 space-y-1">
              {answeredComms.map((c) => (
                <div key={c.id}>
                  <span className="font-medium">{c.subject}:</span> {c.response}
                </div>
              ))}
            </AlertDescription>
          </Alert>
        )}

        {/* ── Benefit Claims ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HandCoins className="h-4 w-4 text-[#FF5A5F]" />
              Novčana naknada
            </CardTitle>
            <CardDescription>
              Select a benefit type or describe a custom request. The government will review and respond.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Predefined options */}
            <div className="grid gap-2">
              {PREDEFINED_BENEFITS.map((b) => (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => setSelectedBenefit(b.key === selectedBenefit ? null : b.key)}
                  className={`text-left rounded-md border px-3 py-2.5 transition-colors ${
                    selectedBenefit === b.key
                      ? "border-[#FF5A5F] bg-[#FF5A5F]/5"
                      : "border-border hover:border-muted-foreground/40"
                  }`}
                >
                  <p className="text-sm font-medium">{b.label}</p>
                  <p className="text-xs text-muted-foreground">{b.description}</p>
                </button>
              ))}
            </div>

            {/* Custom reason input shown only when "custom" is selected */}
            {selectedBenefit === "custom" && (
              <Textarea
                placeholder="Describe your reason for requesting a benefit..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={3}
              />
            )}

            <Button
              onClick={handleSubmitClaim}
              disabled={
                submittingClaim ||
                !selectedBenefit ||
                (selectedBenefit === "custom" && !customReason.trim())
              }
              className="w-full bg-[#FF5A5F] hover:bg-[#e04e53] text-white"
            >
              {submittingClaim ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit request"}
            </Button>

            {/* History */}
            {claims.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your requests</p>
                <div className="space-y-2">
                  {visibleClaims.map((c) => (
                    <div key={c.id} className="flex items-start justify-between gap-3 text-sm rounded-md border px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">{c.reason}</p>
                        {formatDate(c.created_at) && (
                          <p className="text-xs text-muted-foreground">{formatDate(c.created_at)}</p>
                        )}
                      </div>
                      <Badge variant={statusVariant[c.status] ?? "outline"} className="shrink-0 capitalize">
                        {statusLabel[c.status] ?? c.status}
                      </Badge>
                    </div>
                  ))}
                </div>
                {claims.length > 3 && (
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setShowAllClaims((v) => !v)}
                  >
                    {showAllClaims ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {showAllClaims ? "Show less" : `Show all ${claims.length}`}
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── State Communications ───────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-[#FF5A5F]" />
              Komunikacija sa državom
            </CardTitle>
            <CardDescription>
              Send a message or inquiry to the state employment office. You will be notified when they respond.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Subject"
              value={commSubject}
              onChange={(e) => setCommSubject(e.target.value)}
            />
            <Textarea
              placeholder="Write your message..."
              value={commMessage}
              onChange={(e) => setCommMessage(e.target.value)}
              rows={4}
            />
            <Button
              onClick={handleSubmitComm}
              disabled={submittingComm || !commSubject.trim() || !commMessage.trim()}
              className="w-full bg-[#FF5A5F] hover:bg-[#e04e53] text-white"
            >
              {submittingComm ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send message"}
            </Button>

            {/* History */}
            {communications.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your messages</p>
                <div className="space-y-3">
                  {visibleComms.map((c) => (
                    <div key={c.id} className="rounded-md border px-3 py-2 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">{c.subject}</p>
                        <Badge variant={statusVariant[c.status] ?? "outline"} className="shrink-0 capitalize">
                          {statusLabel[c.status] ?? c.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{c.message}</p>
                      {c.response && (
                        <div className="rounded bg-muted px-2 py-1.5">
                          <p className="text-xs font-semibold text-muted-foreground mb-0.5">Government response:</p>
                          <p className="text-xs">{c.response}</p>
                        </div>
                      )}
                      {formatDate(c.created_at) && (
                        <p className="text-xs text-muted-foreground">{formatDate(c.created_at)}</p>
                      )}
                    </div>
                  ))}
                </div>
                {communications.length > 3 && (
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setShowAllComms((v) => !v)}
                  >
                    {showAllComms ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {showAllComms ? "Show less" : `Show all ${communications.length}`}
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
