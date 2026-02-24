"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type BenefitClaim = {
  id: string
  candidate_id: string
  reason: string
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
  submitted: "secondary",
  approved: "default",
  rejected: "destructive",
}

export default function AdminBenefitClaimsPage() {
  const router = useRouter()
  const { user, token, isAuthenticated } = useAuth()
  const [claims, setClaims] = useState<BenefitClaim[]>([])
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
        const [claimsData, candidatesData] = await Promise.all([
          apiClient.getAllBenefitClaims(token),
          apiClient.getCandidates(token).catch(() => []),
        ])
        setClaims(Array.isArray(claimsData) ? claimsData : [])
        const map: Record<string, Candidate> = {}
        if (Array.isArray(candidatesData)) {
          for (const c of candidatesData as Candidate[]) {
            const cid = c.id ?? c._id ?? ""
            if (cid) map[cid] = c
          }
        }
        setCandidateMap(map)
      } catch (e) {
        console.error("Failed to load benefit claims", e)
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
      await apiClient.updateBenefitClaimStatus(id, status, token)
      setClaims((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)))
    } catch (e) {
      console.error("Failed to update claim", e)
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
    <DashboardLayout title="Benefit Claims">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Monetary Benefit Claims</h2>
          <p className="text-muted-foreground text-sm">
            Review and approve or reject candidate requests for monetary benefits.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All claims</CardTitle>
            <CardDescription>{claims.length} total</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : claims.length === 0 ? (
              <p className="text-sm text-muted-foreground">No benefit claims yet.</p>
            ) : (
              <div className="space-y-3">
                {claims.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-col gap-2 rounded-md border p-4 md:flex-row md:items-start md:justify-between"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">{candidateName(c.candidate_id)}</span>
                        <Badge variant={statusVariant[c.status] ?? "outline"} className="capitalize">
                          {c.status || "unknown"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground break-words">{c.reason}</p>
                      {formatDate(c.created_at) && (
                        <p className="text-xs text-muted-foreground">
                          Submitted: {formatDate(c.created_at)}
                          {formatDate(c.updated_at) && ` • Updated: ${formatDate(c.updated_at)}`}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0 mt-2 md:mt-0">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={updatingId === c.id || c.status === "approved"}
                        onClick={() => handleUpdate(c.id, "approved")}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={updatingId === c.id || c.status === "rejected"}
                        onClick={() => handleUpdate(c.id, "rejected")}
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
