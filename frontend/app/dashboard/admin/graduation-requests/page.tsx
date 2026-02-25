"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Loader2, GraduationCap, Pencil, Trash2 } from "lucide-react"
import type { GraduationRequest } from "@/lib/types"

function formatDate(iso: string | undefined): string {
  if (!iso) return "—"
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { dateStyle: "medium" })
  } catch {
    return iso
  }
}

type RequestRow = GraduationRequest & { _id?: string; student_name?: string }

export default function AdminGraduationRequestsPage() {
  const router = useRouter()
  const { user, token, isAuthenticated } = useAuth()
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadData = async () => {
    if (!token) return
    try {
      setLoading(true)
      const [requestsData, studentsData] = await Promise.all([
        apiClient.getGraduationRequests(token),
        apiClient.getAllStudents(token),
      ])
      const students = Array.isArray(studentsData) ? studentsData : []
      const studentMap: Record<string, string> = {}
      students.forEach((s: { id?: string; _id?: string; first_name?: string; last_name?: string }) => {
        const id = (s.id ?? s._id ?? "").toString()
        if (id) studentMap[id] = [s.first_name, s.last_name].filter(Boolean).join(" ").trim() || "—"
      })
      const normalized: RequestRow[] = (Array.isArray(requestsData) ? requestsData : []).map(
        (r: GraduationRequest & { _id?: string }) => {
          const id = (r.id ?? r._id ?? "").toString()
          const studentId = (r.student_id ?? (r as { student_id?: string }).student_id ?? "").toString()
          return {
            ...r,
            id,
            student_id: studentId,
            student_name: studentMap[studentId] ?? "—",
          }
        }
      )
      setRequests(normalized)
    } catch (err) {
      console.error("Failed to load graduation requests", err)
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!token || !user) {
      setLoading(false)
      return
    }
    if (user.user_type !== "ADMIN" && user.user_type !== "ADMINISTRATOR" && user.user_type !== "STUDENTSKA_SLUZBA") {
      setLoading(false)
      router.replace("/dashboard")
      return
    }
    loadData()
  }, [token, user, router])

  const handleDelete = async (req: RequestRow) => {
    if (!token) return
    setDeletingId(req.id)
    try {
      await apiClient.deleteGraduationRequest(req.id, token)
      setRequests((prev) => prev.filter((r) => r.id !== req.id))
    } catch (err) {
      console.error("Failed to delete graduation request", err)
    } finally {
      setDeletingId(null)
    }
  }

  if (!isAuthenticated || !user) return null
  if (user.user_type !== "ADMIN" && user.user_type !== "ADMINISTRATOR" && user.user_type !== "STUDENTSKA_SLUZBA") {
    return null
  }

  return (
    <DashboardLayout title="Graduation Requests">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Graduation Requests</h1>
          <p className="text-muted-foreground">
            View, edit, and delete student graduation requests.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : requests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No graduation requests yet.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-4 font-medium">Student</th>
                      <th className="text-left p-4 font-medium">Requested</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Comments</th>
                      <th className="text-right p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((req) => (
                      <tr key={req.id} className="border-b last:border-0">
                        <td className="p-4">{req.student_name ?? "—"}</td>
                        <td className="p-4 text-muted-foreground">{formatDate(req.requested_at)}</td>
                        <td className="p-4">
                          <Badge
                            variant={
                              req.status === "Approved"
                                ? "default"
                                : req.status === "Rejected"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {req.status ?? "Pending"}
                          </Badge>
                        </td>
                        <td className="p-4 text-muted-foreground max-w-xs truncate">
                          {req.comments || "—"}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => router.push(`/dashboard/admin/graduation-requests/edit/${req.id}`)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  title="Delete"
                                  disabled={deletingId === req.id}
                                >
                                  {deletingId === req.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete graduation request</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this graduation request for {req.student_name}?
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(req)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
