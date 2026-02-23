"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Loader2 } from "lucide-react"
import type { GraduationRequest } from "@/lib/types"

function formatDate(iso: string | undefined): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" })
  } catch {
    return iso
  }
}

export default function EditGraduationRequestPage() {
  const router = useRouter()
  const params = useParams()
  const requestId = params.id as string
  const { user, token, isAuthenticated } = useAuth()
  const [request, setRequest] = useState<(GraduationRequest & { _id?: string; student_name?: string }) | null>(null)
  const [status, setStatus] = useState("Pending")
  const [comments, setComments] = useState("")
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !user) return
    if (user.user_type !== "ADMIN" && user.user_type !== "ADMINISTRATOR" && user.user_type !== "STUDENTSKA_SLUZBA") {
      router.replace("/dashboard")
      return
    }
  }, [isAuthenticated, user, router])

  useEffect(() => {
    if (!token || !requestId) {
      setLoading(false)
      return
    }
    let cancelled = false
    async function loadRequest() {
      try {
        setLoading(true)
        const [requestsData, studentsData] = await Promise.all([
          apiClient.getGraduationRequests(token),
          apiClient.getAllStudents(token),
        ])
        if (cancelled) return
        const list = Array.isArray(requestsData) ? requestsData : []
        const students = Array.isArray(studentsData) ? studentsData : []
        const studentMap: Record<string, string> = {}
        students.forEach((s: { id?: string; _id?: string; first_name?: string; last_name?: string }) => {
          const id = (s.id ?? s._id ?? "").toString()
          if (id) studentMap[id] = [s.first_name, s.last_name].filter(Boolean).join(" ").trim() || "—"
        })
        const req = list.find(
          (r: GraduationRequest & { _id?: string }) =>
            (r.id ?? r._id ?? "").toString() === requestId
        ) as (GraduationRequest & { _id?: string }) | undefined
        if (!req) {
          setRequest(null)
          setLoading(false)
          return
        }
        const studentId = (req.student_id ?? "").toString()
        setRequest({
          ...req,
          id: (req.id ?? req._id ?? "").toString(),
          student_id: studentId,
          student_name: studentMap[studentId] ?? "—",
        })
        setStatus(req.status ?? "Pending")
        setComments(req.comments ?? "")
      } catch (err) {
        console.error("Failed to load graduation request", err)
        if (!cancelled) setRequest(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadRequest()
    return () => { cancelled = true }
  }, [token, requestId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !request) return
    setError(null)
    setIsSubmitting(true)
    try {
      await apiClient.updateGraduationRequest(
        requestId,
        {
          status,
          comments,
          student_id: request.student_id,
          requested_at: request.requested_at,
        },
        token
      )
      router.push("/dashboard/admin/graduation-requests")
    } catch (err) {
      console.error("Failed to update graduation request", err)
      setError(err instanceof Error ? err.message : "Failed to update")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isAuthenticated || !user) return null
  if (user.user_type !== "ADMIN" && user.user_type !== "ADMINISTRATOR" && user.user_type !== "STUDENTSKA_SLUZBA") {
    return null
  }

  if (loading) {
    return (
      <DashboardLayout title="Edit Graduation Request">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  if (!request) {
    return (
      <DashboardLayout title="Edit Graduation Request">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Graduation request not found.
          </CardContent>
        </Card>
        <Button variant="ghost" className="mt-4" onClick={() => router.push("/dashboard/admin/graduation-requests")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to list
        </Button>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Edit Graduation Request">
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard/admin/graduation-requests")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to list
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Edit graduation request</CardTitle>
            <CardDescription>
              Student: {request.student_name} · Requested: {formatDate(request.requested_at)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="comments">Comments</Label>
                <Textarea
                  id="comments"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Optional comments for the student"
                  rows={4}
                  className="resize-none"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save changes"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/dashboard/admin/graduation-requests")}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
