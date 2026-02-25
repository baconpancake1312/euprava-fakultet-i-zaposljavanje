"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

type StateCommunication = {
  id: string
  candidate_id: string
  subject: string
  message: string
  response?: string
  status: string
  created_at?: string
  updated_at?: string
}

type Candidate = {
  id?: string
  _id?: string
  first_name?: string
  last_name?: string
  full_name?: string
  name?: string
  email?: string
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  open: "secondary",
  answered: "default",
  closed: "outline",
}

export default function AdminCommunicationsPage() {
  const router = useRouter()
  const { user, token, isAuthenticated } = useAuth()
  const [items, setItems] = useState<StateCommunication[]>([])
  const [candidateMap, setCandidateMap] = useState<Record<string, Candidate>>({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [draftResponses, setDraftResponses] = useState<Record<string, string>>({})

  useEffect(() => {
    if (
      !isAuthenticated ||
      (user?.user_type !== "ADMIN" && user?.user_type !== "ADMINISTRATOR" && (user?.user_type as string) !== "EMPLOYMENT_SERVICE")
    ) {
      router.push("/login")
    }
  }, [isAuthenticated, user, router])

  useEffect(() => {
    const load = async () => {
      if (!token) return
      try {
        const [commsData, candidatesData] = await Promise.all([
          apiClient.getAllStateCommunications(token),
          apiClient.getCandidates(token).catch(() => []),
        ])
        setItems(Array.isArray(commsData) ? commsData : [])
        const map: Record<string, Candidate> = {}
        if (Array.isArray(candidatesData)) {
          for (const c of candidatesData as Candidate[]) {
            const cid = c.id ?? c._id ?? ""
            if (cid) map[cid] = c
          }
        }
        setCandidateMap(map)
      } catch (e) {
        console.error("Failed to load communications", e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  const candidateName = (id: string) => {
    const c = candidateMap[id]
    if (!c) return id
    return (
      c.full_name ||
      c.name ||
      [c.first_name, c.last_name].filter(Boolean).join(" ") ||
      c.email ||
      id
    )
  }

  const handleSave = async (item: StateCommunication, newStatus: "answered" | "closed") => {
    if (!token) return
    setSavingId(item.id)
    const response = draftResponses[item.id] ?? item.response ?? ""
    try {
      await apiClient.updateStateCommunication(item.id, { status: newStatus, response }, token)
      setItems((prev) =>
        prev.map((c) =>
          c.id === item.id ? { ...c, status: newStatus, response, updated_at: new Date().toISOString() } : c,
        ),
      )
    } catch (e) {
      console.error("Failed to update communication", e)
    } finally {
      setSavingId(null)
    }
  }

  const formatDate = (value?: string) => {
    if (!value) return ""
    const d = new Date(value)
    if (isNaN(d.getTime()) || d.getFullYear() < 2000) return ""
    return d.toLocaleDateString()
  }

  return (
    <DashboardLayout title="Administrative Communications">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Administrative Communications</h2>
          <p className="text-muted-foreground text-sm">
            Read candidate messages to the state and send back responses.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All messages</CardTitle>
            <CardDescription>{items.length} total</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No communications yet.</p>
            ) : (
              <div className="space-y-4">
                {items.map((c) => (
                  <div key={c.id} className="rounded-md border p-4 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold">{c.subject}</span>
                          <Badge variant={statusVariant[c.status] ?? "outline"} className="capitalize">
                            {c.status || "unknown"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          From: <span className="font-medium text-foreground">{candidateName(c.candidate_id)}</span>
                        </p>
                        {formatDate(c.created_at) && (
                          <p className="text-xs text-muted-foreground">
                            {formatDate(c.created_at)}
                            {formatDate(c.updated_at) && ` • Updated: ${formatDate(c.updated_at)}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-sm border-l-2 pl-3 text-muted-foreground whitespace-pre-wrap">{c.message}</p>
                    <div className="space-y-2">
                      <Textarea
                        rows={3}
                        placeholder="Write a response to the candidate…"
                        value={draftResponses[c.id] ?? c.response ?? ""}
                        onChange={(e) =>
                          setDraftResponses((prev) => ({ ...prev, [c.id]: e.target.value }))
                        }
                      />
                      <div className="flex flex-wrap gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={savingId === c.id}
                          onClick={() => handleSave(c, "answered")}
                        >
                          Send response
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={savingId === c.id}
                          onClick={() => handleSave(c, "closed")}
                        >
                          Close
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
