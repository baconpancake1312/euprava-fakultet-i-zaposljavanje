"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type CompetitionApplication = {
  id: string
  candidate_id: string
  title: string
  issuer?: string
  status: string
  submitted_at?: string
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
  submitted: "secondary",
  approved: "default",
  rejected: "destructive",
}

export default function AdminCompetitionsPage() {
  const router = useRouter()
  const { user, token, isAuthenticated } = useAuth()
  const [apps, setApps] = useState<CompetitionApplication[]>([])
  const [candidateMap, setCandidateMap] = useState<Record<string, Candidate>>({})
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

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
        const [appsData, candidatesData] = await Promise.all([
          apiClient.getAllStateCompetitionApplications(token),
          apiClient.getCandidates(token).catch(() => []),
        ])
        setApps(Array.isArray(appsData) ? appsData : [])
        const map: Record<string, Candidate> = {}
        if (Array.isArray(candidatesData)) {
          for (const c of candidatesData as Candidate[]) {
            const cid = c.id ?? c._id ?? ""
            if (cid) map[cid] = c
          }
        }
        setCandidateMap(map)
      } catch (e) {
        console.error("Failed to load competition applications", e)
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

  const handleUpdate = async (id: string, status: "approved" | "rejected") => {
    if (!token) return
    setUpdatingId(id)
    try {
      await apiClient.updateStateCompetitionApplicationStatus(id, status, token)
      setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)))
    } catch (e) {
      console.error("Failed to update competition application", e)
    } finally {
      setUpdatingId(null)
    }
  }

  const formatDate = (value?: string) => {
    if (!value) return ""
    const d = new Date(value)
    if (isNaN(d.getTime()) || d.getFullYear() < 2000) return ""
    return d.toLocaleDateString()
  }

  return (
    <DashboardLayout title="Competition Applications">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Competition Applications</h2>
          <p className="text-muted-foreground text-sm">
            Approve or reject candidate applications for state and employer competitions.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All applications</CardTitle>
            <CardDescription>{apps.length} total</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : apps.length === 0 ? (
              <p className="text-sm text-muted-foreground">No competition applications yet.</p>
            ) : (
              <div className="space-y-3">
                {apps.map((a) => (
                  <div
                    key={a.id}
                    className="flex flex-col gap-2 rounded-md border p-4 md:flex-row md:items-start md:justify-between"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">{a.title}</span>
                        {a.issuer && (
                          <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{a.issuer}</span>
                        )}
                        <Badge variant={statusVariant[a.status] ?? "outline"} className="capitalize">
                          {a.status || "unknown"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Applicant: <span className="font-medium text-foreground">{candidateName(a.candidate_id)}</span>
                      </p>
                      {formatDate(a.submitted_at) && (
                        <p className="text-xs text-muted-foreground">
                          Submitted: {formatDate(a.submitted_at)}
                          {formatDate(a.updated_at) && ` • Updated: ${formatDate(a.updated_at)}`}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0 mt-2 md:mt-0">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={updatingId === a.id || a.status === "approved"}
                        onClick={() => handleUpdate(a.id, "approved")}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={updatingId === a.id || a.status === "rejected"}
                        onClick={() => handleUpdate(a.id, "rejected")}
                      >
                        Reject
                      </Button>
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
