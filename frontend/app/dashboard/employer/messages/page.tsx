"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { useChatSocket } from "@/hooks/use-chat-socket"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import {
  Loader2,
  Mail,
  Send,
  User,
  Briefcase,
  Clock,
  RefreshCw,
  MessageSquare,
  Building2,
  MapPin,
  Phone,
  AtSign,
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
  sender_name?: string
  receiver_name?: string
  job_position?: string
  is_sent?: boolean
}

interface CandidateProfile {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  city?: string
  country?: string
}

interface Conversation {
  otherUserId: string
  otherUserName: string
  candidateProfile?: CandidateProfile
  lastMessage: Message
  unreadCount: number
  job_position?: string
  messages: Message[]
}

const ZERO_OID = "000000000000000000000000"

function isValidOid(id?: string): boolean {
  if (!id) return false
  const s = id.toString().replace(/-/g, "")
  return s.length === 24 && s !== ZERO_OID
}

export default function EmployerMessagesPage() {
  const { user, token, isLoading: authLoading, isAuthenticated } = useAuth()
  const { toast } = useToast()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [messageContent, setMessageContent] = useState("")
  const [sendingMessage, setSendingMessage] = useState(false)
  const [employerId, setEmployerId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const resolveEmployerId = useCallback(async (): Promise<string | null> => {
    if (!user || !token) return null
    try {
      const emp = await apiClient.getEmployerByUserId(user.id, token) as any
      return emp ? (emp.id || emp._id || user.id) : user.id
    } catch {
      return user.id
    }
  }, [user, token])

  const loadMessages = useCallback(async (resolvedId?: string) => {
    if (!token || !user) return
    setLoading(true)
    setError("")
    try {
      const uid = resolvedId || employerId || user.id

      const [inboxData, sentData] = await Promise.all([
        apiClient.getInboxMessages(uid, token).catch(() => []),
        apiClient.getSentMessages(uid, token).catch(() => []),
      ])

      const inboxMessages: Message[] = Array.isArray(inboxData) ? inboxData.map(m => ({ ...m, is_sent: false })) : []
      const sentMessages: Message[] = Array.isArray(sentData) ? sentData.map(m => ({ ...m, is_sent: true })) : []
      const raw: Message[] = [...inboxMessages, ...sentMessages]

      let allEmployers: any[] = []
      try {
        const empRes = await fetch(
          `${process.env.NEXT_PUBLIC_EMPLOYMENT_API_URL || "http://localhost:8089"}/employers`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (empRes.ok) allEmployers = await empRes.json()
        if (!Array.isArray(allEmployers)) allEmployers = []
      } catch { /* ignore */ }

      let allCandidates: any[] = []
      try {
        const cRes = await apiClient.getAllCandidates(token)
        allCandidates = Array.isArray(cRes) ? cRes : []
      } catch { /* ignore */ }

      // Cache per-load so each unknown ID is only fetched once
      const nameCache = new Map<string, string>()

      const getNameForUserId = async (userId: string): Promise<string> => {
        const uid2 = userId?.toString?.() || ""
        if (!isValidOid(uid2)) return "Unknown"

        if (nameCache.has(uid2)) return nameCache.get(uid2)!

        const empMatch = allEmployers.find((e: any) => (e.id || e._id || "") === uid2) as any
        if (empMatch) {
          const name = empMatch.firm_name || `${empMatch.first_name || ""} ${empMatch.last_name || ""}`.trim() || "Employer"
          nameCache.set(uid2, name)
          return name
        }

        const cMatch = allCandidates.find((c: any) => (c.id || c._id || "") === uid2) as any
        if (cMatch) {
          const name = `${cMatch.first_name || ""} ${cMatch.last_name || ""}`.trim() || "Candidate"
          nameCache.set(uid2, name)
          return name
        }

        // Only fall back to individual fetch if not found in bulk lists
        try {
          const emp = await apiClient.getEmployerByUserId(uid2, token) as any
          if (emp) {
            const name = emp.firm_name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || "Employer"
            nameCache.set(uid2, name)
            return name
          }
        } catch { /* not an employer */ }

        nameCache.set(uid2, "Unknown")
        return "Unknown"
      }

      const enriched = await Promise.all(
        raw.map(async (msg) => {
          const sid = msg.sender_id?.toString?.() || ""
          const rid = msg.receiver_id?.toString?.() || ""
          const sender_name = await getNameForUserId(sid)
          const receiver_name = await getNameForUserId(rid)
          let job_position: string | undefined
          const jid = msg.job_listing_id?.toString?.() || ""
          if (isValidOid(jid)) {
            try {
              const listing = await apiClient.getJobListingById(jid, token) as any
              if (listing) job_position = listing.position
            } catch { /* ignore */ }
          }
          return { ...msg, sender_name, receiver_name, job_position }
        })
      )

      enriched.sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime())

      const convMap = new Map<string, Message[]>()
      enriched.forEach((msg) => {
        const otherId = (msg.is_sent ? msg.receiver_id : msg.sender_id)?.toString() || ""
        if (!convMap.has(otherId)) convMap.set(otherId, [])
        convMap.get(otherId)!.push(msg)
      })

      const convs: Conversation[] = await Promise.all(
        Array.from(convMap.entries()).map(async ([otherId, msgs]) => {
          const sorted = [...msgs].sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime())
          const last = sorted[sorted.length - 1]
          const otherUserName = (last.is_sent ? last.receiver_name : last.sender_name) || "Unknown"
          const unreadCount = sorted.filter(m => !m.read && !m.is_sent).length
          const job_position = sorted.find(m => m.job_position)?.job_position

          // Try to get candidate profile
          let candidateProfile: CandidateProfile | undefined
          const cMatch = allCandidates.find((c: any) => (c.id || c._id || "") === otherId) as any
          if (cMatch) {
            candidateProfile = {
              first_name: cMatch.first_name,
              last_name: cMatch.last_name,
              email: cMatch.email,
              phone: cMatch.phone,
              city: cMatch.city,
              country: cMatch.country,
            }
          }

          return { otherUserId: otherId, otherUserName, candidateProfile, lastMessage: last, unreadCount, job_position, messages: sorted }
        })
      )

      convs.sort((a, b) => new Date(b.lastMessage.sent_at).getTime() - new Date(a.lastMessage.sent_at).getTime())
      setConversations(convs)

      setSelectedConv(prev => {
        if (!prev) return convs[0] ?? null
        return convs.find(c => c.otherUserId === prev.otherUserId) ?? prev
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages")
    } finally {
      setLoading(false)
    }
  }, [token, user, employerId])

  const initialLoadDone = useRef(false)

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated || !token || !user) { setLoading(false); return }
    if (initialLoadDone.current) return
    initialLoadDone.current = true

    resolveEmployerId().then((id) => {
      if (id) setEmployerId(id)
      loadMessages(id || undefined)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, token, user])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [selectedConv?.messages.length])

  const handleSelectConv = async (conv: Conversation) => {
    setSelectedConv(conv)
    setMessageContent("")
    if (conv.unreadCount > 0 && token && employerId) {
      try {
        await apiClient.markMessagesAsRead(conv.otherUserId, employerId, token)
        setConversations(prev => prev.map(c =>
          c.otherUserId === conv.otherUserId
            ? { ...c, unreadCount: 0, messages: c.messages.map(m => !m.is_sent ? { ...m, read: true } : m) }
            : c
        ))
      } catch { /* ignore */ }
    }
  }

  const handleSendMessage = async () => {
    if (!messageContent.trim() || !selectedConv || !user || !token || !employerId) return
    setSendingMessage(true)
    try {
      await apiClient.sendMessageToCandidate(
        {
          sender_id: employerId,
          receiver_id: selectedConv.otherUserId,
          job_listing_id: selectedConv.messages.find(m => isValidOid(m.job_listing_id))?.job_listing_id,
          content: messageContent.trim(),
        },
        token
      )
      setMessageContent("")
      await loadMessages()
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

  // ── Real-time WebSocket delivery ──────────────────────────────────────────
  const { lastMessage: wsMessage } = useChatSocket(employerId)

  useEffect(() => {
    if (!wsMessage) return
    loadMessages()
  }, [wsMessage, loadMessages])

  const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0)

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
              {totalUnread > 0 && (
                <Badge className="bg-primary text-white ml-1">{totalUnread} new</Badge>
              )}
            </h2>
            <p className="text-muted-foreground text-sm">Chat with candidates</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => loadMessages()} disabled={loading}>
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
        ) : conversations.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Mail className="h-14 w-14 mx-auto text-muted-foreground mb-4 opacity-40" />
              <p className="text-lg font-medium text-muted-foreground">No messages yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Messages you send to candidates will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex gap-0 overflow-hidden border rounded-xl" style={{ height: "calc(100vh - 13rem)" }}>
            {/* Sidebar */}
            <div className="w-64 shrink-0 border-r flex flex-col overflow-hidden bg-muted/20">
              <div className="p-3 border-b bg-muted/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Conversations</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {conversations.map((conv) => (
                  <button
                    key={conv.otherUserId}
                    className={`w-full text-left p-3 border-b transition-colors hover:bg-muted/50 ${
                      selectedConv?.otherUserId === conv.otherUserId
                        ? "bg-primary/10 border-l-2 border-l-primary"
                        : ""
                    }`}
                    onClick={() => handleSelectConv(conv)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm truncate ${conv.unreadCount > 0 ? "font-semibold" : "font-medium"}`}>
                            {conv.otherUserName}
                          </p>
                          {conv.unreadCount > 0 && (
                            <Badge variant="default" className="h-4 min-w-4 px-1 text-xs ml-1 shrink-0">
                              {conv.unreadCount}
                            </Badge>
                          )}
                        </div>
                        {conv.job_position && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                            <Briefcase className="h-3 w-3 shrink-0" />
                            {conv.job_position}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {conv.lastMessage.is_sent ? "You: " : ""}{conv.lastMessage.content}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" />
                          {new Date(conv.lastMessage.sent_at).toLocaleDateString("en-GB", {
                            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat + profile panel */}
            <div className="flex-1 flex overflow-hidden">
              {selectedConv ? (
                <>
                  {/* Chat column */}
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Chat header */}
                    <div className="p-4 border-b bg-background flex items-center gap-3 shrink-0">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{selectedConv.otherUserName}</p>
                        {selectedConv.job_position && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            {selectedConv.job_position}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10">
                      {selectedConv.messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.is_sent ? "justify-end" : "justify-start"}`}>
                          <div className="max-w-[70%] space-y-1">
                            <div
                              className={`rounded-2xl px-4 py-2.5 ${
                                msg.is_sent
                                  ? "bg-primary text-primary-foreground rounded-br-sm"
                                  : "bg-background border rounded-bl-sm"
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                            </div>
                            <p className={`text-xs text-muted-foreground ${msg.is_sent ? "text-right" : "text-left"}`}>
                              {new Date(msg.sent_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-3 border-t bg-background shrink-0">
                      <div className="flex gap-2 items-end">
                        <Textarea
                          placeholder={`Message ${selectedConv.otherUserName}...`}
                          value={messageContent}
                          onChange={(e) => setMessageContent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault()
                              handleSendMessage()
                            }
                          }}
                          rows={2}
                          className="resize-none"
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={sendingMessage || !messageContent.trim()}
                          size="icon"
                          className="shrink-0 h-10 w-10"
                        >
                          {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Candidate profile panel */}
                  {selectedConv.candidateProfile && (
                    <div className="w-56 shrink-0 border-l flex flex-col overflow-y-auto bg-muted/10">
                      <div className="p-3 border-b bg-muted/30">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Candidate Profile</p>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="flex flex-col items-center gap-2 pb-3 border-b">
                          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-7 w-7 text-primary" />
                          </div>
                          <p className="font-semibold text-sm text-center">{selectedConv.otherUserName}</p>
                        </div>
                        {selectedConv.candidateProfile.email && (
                          <div className="flex items-start gap-1.5">
                            <AtSign className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs text-muted-foreground">Email</p>
                              <p className="text-xs font-medium break-all">{selectedConv.candidateProfile.email}</p>
                            </div>
                          </div>
                        )}
                        {selectedConv.candidateProfile.phone && (
                          <div className="flex items-start gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs text-muted-foreground">Phone</p>
                              <p className="text-xs font-medium">{selectedConv.candidateProfile.phone}</p>
                            </div>
                          </div>
                        )}
                        {(selectedConv.candidateProfile.city || selectedConv.candidateProfile.country) && (
                          <div className="flex items-start gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs text-muted-foreground">Location</p>
                              <p className="text-xs font-medium">
                                {[selectedConv.candidateProfile.city, selectedConv.candidateProfile.country].filter(Boolean).join(", ")}
                              </p>
                            </div>
                          </div>
                        )}
                        {selectedConv.job_position && (
                          <div className="flex items-start gap-1.5">
                            <Briefcase className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs text-muted-foreground">Applied for</p>
                              <p className="text-xs font-medium">{selectedConv.job_position}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Select a conversation to start chatting</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
