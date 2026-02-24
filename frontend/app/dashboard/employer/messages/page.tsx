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
  ArrowUp,
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
  otherUserProfilePic?: string
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
          let otherUserProfilePic: string | undefined
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
            if (cMatch.profile_pic_base64) {
              otherUserProfilePic = cMatch.profile_pic_base64
            }
          }

          return { otherUserId: otherId, otherUserName, candidateProfile, otherUserProfilePic, lastMessage: last, unreadCount, job_position, messages: sorted }
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

  const { lastMessage: wsMessage } = useChatSocket(employerId)

  useEffect(() => {
    if (!wsMessage) return
    loadMessages()
  }, [wsMessage, loadMessages])

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
      <div className="flex h-[calc(100vh-8rem)] border rounded-xl overflow-hidden">
        <div className="w-64 border-r flex flex-col">
          <div className="px-3 py-2 border-b flex items-center justify-between">
            <span className="font-medium text-sm flex items-center gap-2">Chats</span>
              </div>
              <div className="flex-1 overflow-y-auto">
                {conversations.map((conv) => (
                  <button
                    key={conv.otherUserId}
                className={`w-full px-3 py-2 text-left text-sm border-b hover:bg-muted/60 ${
                  selectedConv?.otherUserId === conv.otherUserId ? "bg-muted" : ""
                    }`}
                    onClick={() => handleSelectConv(conv)}
                  >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{conv.otherUserName}</span>
                          {conv.unreadCount > 0 && (
                    <Badge className="text-[10px] px-1 py-0">{conv.unreadCount}</Badge>
                          )}
                        </div>
                {conv.lastMessage && (
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {conv.lastMessage.is_sent ? "You: " : ""}
                    {conv.lastMessage.content}
                          </p>
                        )}
                  </button>
                ))}
            {!loading && conversations.length === 0 && (
              <div className="p-3 text-xs text-muted-foreground">No messages yet.</div>
                        )}
                      </div>
                    </div>

        {/* Chat panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedConv ? (
            <>
              <div className="p-3 border-b flex items-center gap-2 text-sm">
                <User className="h-4 w-4" />
                <span className="font-medium truncate">{selectedConv.otherUserName}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-muted/10">
                      {selectedConv.messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.is_sent ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[70%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap break-words ${
                        msg.is_sent ? "bg-primary text-primary-foreground" : "bg-background border"
                              }`}
                            >
                      {msg.content}
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                    <div className="p-3 border-t bg-background shrink-0">
                      <div className="flex gap-2 items-end">
                        <Textarea
                    placeholder="Send msg"
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
                    {sendingMessage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowUp className="h-4 w-4" />
                    )}
                        </Button>
                      </div>
                    </div>
                </>
              ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  <div className="text-center">
                <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p>Select a conversation to start chatting</p>
                  </div>
                </div>
              )}
            </div>
      </div>
    </DashboardLayout>
  )
}
