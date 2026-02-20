"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import {
  Loader2,
  Mail,
  MailOpen,
  Send,
  User,
  Briefcase,
  Clock,
  RefreshCw,
  MessageSquare,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Message {
  id: string
  sender_id: string
  receiver_id: string
  job_listing_id?: string
  content: string
  sent_at: string
  read: boolean
  // enriched
  sender_name?: string
  job_position?: string
}

// Zero ObjectID — means "no value" in Go's bson
const ZERO_OID = "000000000000000000000000"

function isValidOid(id?: string): boolean {
  if (!id) return false
  const s = id.toString().replace(/-/g, "")
  return s.length === 24 && s !== ZERO_OID
}

export default function CandidateMessagesPage() {
  const { user, token, isLoading: authLoading, isAuthenticated } = useAuth()
  const { toast } = useToast()

  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [sendingReply, setSendingReply] = useState(false)
  const [candidateId, setCandidateId] = useState<string | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Resolve the candidate's employment-service ID
  const resolveCandidateId = useCallback(async (): Promise<string | null> => {
    if (!user || !token) return null
    try {
      const all = await apiClient.getAllCandidates(token)
      const list = Array.isArray(all) ? all : []
      const found = list.find((c: any) => {
        const email = c.email || c.user?.email || ""
        const cid = c.id || c._id || ""
        return (
          email === user.email ||
          cid === user.id ||
          (c.user && (c.user.id === user.id || c.user._id === user.id))
        )
      }) as any
      return found ? (found.id || found._id) : user.id
    } catch {
      return user.id
    }
  }, [user, token])

  const loadMessages = useCallback(async (resolvedId?: string) => {
    if (!token || !user) return
    setLoading(true)
    setError("")
    try {
      const uid = resolvedId || candidateId || user.id
      const data = await apiClient.getInboxMessages(uid, token)
      const raw: Message[] = Array.isArray(data) ? data : []

      // Pre-fetch all employers once to avoid N+1 calls
      let allEmployers: any[] = []
      try {
        const empData = await apiClient.getJobListings(token) // reuse token; fetch employers separately
        // Actually fetch employers list
      } catch { /* ignore */ }
      try {
        const empRes = await fetch(
          `${process.env.NEXT_PUBLIC_EMPLOYMENT_API_URL || "http://localhost:8089"}/employers`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (empRes.ok) allEmployers = await empRes.json()
        if (!Array.isArray(allEmployers)) allEmployers = []
      } catch { /* ignore */ }

      // Pre-fetch all candidates once
      let allCandidates: any[] = []
      try {
        const cRes = await apiClient.getAllCandidates(token)
        allCandidates = Array.isArray(cRes) ? cRes : []
      } catch { /* ignore */ }

      // Enrich each message
      const enriched = await Promise.all(
        raw.map(async (msg) => {
          let sender_name = ""
          let job_position: string | undefined

          const sid = msg.sender_id?.toString?.() || ""

          // 1. Try matching from pre-fetched employers list (flat doc: _id = auth user id)
          const empMatch = allEmployers.find((e: any) => {
            const eid = e.id || e._id || ""
            return eid === sid
          }) as any
          if (empMatch) {
            sender_name = empMatch.firm_name || `${empMatch.first_name || ""} ${empMatch.last_name || ""}`.trim() || "Employer"
          }

          // 2. Try /employers/user/:id (auth user id lookup)
          if (!sender_name && isValidOid(sid)) {
            try {
              const emp = await apiClient.getEmployerByUserId(sid, token) as any
              if (emp) {
                sender_name = emp.firm_name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || "Employer"
              }
            } catch { /* not an employer */ }
          }

          // 3. Try candidates
          if (!sender_name) {
            const cMatch = allCandidates.find((c: any) => {
              const cid = c.id || c._id || ""
              return cid === sid
            }) as any
            if (cMatch) {
              sender_name = `${cMatch.first_name || ""} ${cMatch.last_name || ""}`.trim() || "Candidate"
            }
          }

          // 4. Fallback
          if (!sender_name) sender_name = "Unknown Sender"

          // Job listing title — skip zero ObjectID
          const jid = msg.job_listing_id?.toString?.() || ""
          if (isValidOid(jid)) {
            try {
              const listing = await apiClient.getJobListingById(jid, token) as any
              if (listing) job_position = listing.position
            } catch { /* ignore */ }
          }

          return { ...msg, sender_name, job_position }
        })
      )

      // Sort newest first
      enriched.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())
      setMessages(enriched)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages")
    } finally {
      setLoading(false)
    }
  }, [token, user, candidateId])

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated || !token || !user) { setLoading(false); return }

    resolveCandidateId().then((id) => {
      if (id) setCandidateId(id)
      loadMessages(id || undefined)
    })
  }, [authLoading, isAuthenticated, token, user, resolveCandidateId, loadMessages])

  const handleSelectMessage = async (msg: Message) => {
    setSelectedMessage(msg)
    setReplyContent("")

    // Mark as read if unread
    if (!msg.read && token && candidateId) {
      try {
        await apiClient.markMessagesAsRead(msg.sender_id, candidateId, token)
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, read: true } : m))
        )
      } catch { /* ignore */ }
    }
  }

  const handleSendReply = async () => {
    if (!replyContent.trim() || !selectedMessage || !user || !token) return
    setSendingReply(true)
    try {
      await apiClient.sendMessageToCandidate(
        {
          sender_id: candidateId || user.id,
          receiver_id: selectedMessage.sender_id,
          job_listing_id: isValidOid(selectedMessage.job_listing_id) ? selectedMessage.job_listing_id : undefined,
          content: replyContent.trim(),
        },
        token
      )
      toast({ title: "Reply Sent", description: `Your reply was sent to ${selectedMessage.sender_name}.` })
      setReplyContent("")
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to send reply",
        variant: "destructive",
      })
    } finally {
      setSendingReply(false)
    }
  }

  const unreadCount = messages.filter((m) => !m.read).length

  if (authLoading) {
    return (
      <DashboardLayout title="Messages">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <DashboardLayout title="Messages">
        <Alert variant="destructive">
          <AlertDescription>Please log in to view your messages.</AlertDescription>
        </Alert>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Messages">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="h-6 w-6" />
              Messages
              {unreadCount > 0 && (
                <Badge className="bg-primary text-white ml-1">{unreadCount} new</Badge>
              )}
            </h2>
            <p className="text-muted-foreground text-sm">Messages from employers about your applications</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadMessages()}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Mail className="h-14 w-14 mx-auto text-muted-foreground mb-4 opacity-40" />
              <p className="text-lg font-medium text-muted-foreground">No messages yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                When employers contact you about your applications, messages will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            {/* Message list */}
            <div className="lg:col-span-1 space-y-2">
              {messages.map((msg) => (
                <Card
                  key={msg.id}
                  className={`cursor-pointer transition-all hover:border-primary/60 ${
                    selectedMessage?.id === msg.id
                      ? "border-primary bg-primary/5"
                      : !msg.read
                      ? "border-primary/30 bg-primary/5"
                      : ""
                  }`}
                  onClick={() => handleSelectMessage(msg)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        {msg.read ? (
                          <MailOpen className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Mail className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-sm truncate ${!msg.read ? "font-semibold" : "font-medium"}`}>
                            {msg.sender_name}
                          </p>
                          {!msg.read && (
                            <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                          )}
                        </div>
                        {msg.job_position && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Briefcase className="h-3 w-3" />
                            {msg.job_position}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {msg.content}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1.5">
                          <Clock className="h-3 w-3" />
                          {new Date(msg.sent_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Message detail */}
            <div className="lg:col-span-2">
              {selectedMessage ? (
                <Card>
                  <CardHeader className="border-b pb-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base">{selectedMessage.sender_name}</CardTitle>
                        {selectedMessage.job_position && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Briefcase className="h-3.5 w-3.5" />
                            Regarding: <span className="font-medium ml-1">{selectedMessage.job_position}</span>
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          {new Date(selectedMessage.sent_at).toLocaleDateString("en-GB", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4" ref={contentRef}>
                    {/* Message body */}
                    <div className="bg-muted/30 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap">
                      {selectedMessage.content}
                    </div>

                    {/* Reply box */}
                    <div className="space-y-2 pt-2 border-t">
                      <p className="text-sm font-medium">Reply</p>
                      <Textarea
                        placeholder={`Reply to ${selectedMessage.sender_name}...`}
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        rows={4}
                        className="resize-none"
                      />
                      <div className="flex justify-end">
                        <Button
                          onClick={handleSendReply}
                          disabled={sendingReply || !replyContent.trim()}
                          size="sm"
                        >
                          {sendingReply ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</>
                          ) : (
                            <><Send className="mr-2 h-4 w-4" />Send Reply</>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-16 text-center text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Select a message to read it</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
