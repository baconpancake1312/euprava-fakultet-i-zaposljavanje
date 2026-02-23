"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Calendar, Plus, Pencil } from "lucide-react"
import type { ExamPeriod } from "@/lib/types"

function formatDate(iso: string): string {
  if (!iso) return "—"
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { dateStyle: "medium" })
  } catch {
    return iso
  }
}

export default function AdminExamPeriodsPage() {
  const router = useRouter()
  const { user, token, isAuthenticated } = useAuth()
  const [periods, setPeriods] = useState<ExamPeriod[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token || !user) {
      setLoading(false)
      return
    }
    if (user.user_type !== "ADMIN" && user.user_type !== "STUDENTSKA_SLUZBA") {
      setLoading(false)
      router.replace("/dashboard")
      return
    }

    const loadData = async () => {
      try {
        setLoading(true)
        const data = await apiClient.getAllExamPeriods(token)
        const normalized = (Array.isArray(data) ? data : []).map((p: ExamPeriod & { _id?: string }) => ({
          ...p,
          id: p.id || (p as { _id?: string })._id || "",
        }))
        setPeriods(normalized)
      } catch (err) {
        console.error("Failed to load exam periods", err)
        setPeriods([])
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [token, user, router])

  if (!isAuthenticated || !user) return null

  if (user.user_type !== "ADMIN" && user.user_type !== "STUDENTSKA_SLUZBA") {
    return null
  }

  return (
    <DashboardLayout title="Exam Periods">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Exam Periods</h1>
            <p className="text-muted-foreground">
              Define date ranges when exams can be scheduled. Professors can create exam sessions with a date in an active period.
            </p>
          </div>
          <Button onClick={() => router.push("/dashboard/admin/exam-periods/create")}>
            <Plus className="mr-2 h-4 w-4" />
            Add Exam Period
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : periods.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No exam periods yet. Create one to define when exams can be scheduled.
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {periods.map((period) => (
              <Card key={period.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {period.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={period.is_active ? "default" : "secondary"}>
                        {period.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => router.push(`/dashboard/admin/exam-periods/edit/${period.id}`)}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="font-medium">Date range</p>
                      <p className="text-muted-foreground">
                        {formatDate(period.start_date)} – {formatDate(period.end_date)}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Academic year / Semester</p>
                      <p className="text-muted-foreground">
                        {period.academic_year} · Semester {period.semester}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
