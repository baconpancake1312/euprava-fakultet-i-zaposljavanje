"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Loader2, Calendar } from "lucide-react"
import type { ExamPeriod } from "@/lib/types"

function isoToDateInput(iso: string): string {
  if (!iso) return ""
  try {
    const d = new Date(iso)
    return d.toISOString().slice(0, 10)
  } catch {
    return ""
  }
}

const currentYear = new Date().getFullYear()

export default function EditExamPeriodPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const { user, token, isAuthenticated } = useAuth()
  const [period, setPeriod] = useState<ExamPeriod | null>(null)
  const [name, setName] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [academicYear, setAcademicYear] = useState(currentYear)
  const [semester, setSemester] = useState<1 | 2>(1)
  const [isActive, setIsActive] = useState(true)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !user) return
    if (user.user_type !== "ADMIN" && user.user_type !== "STUDENTSKA_SLUZBA") {
      router.replace("/dashboard")
      return
    }
  }, [isAuthenticated, user, router])

  useEffect(() => {
    if (!token || !id) {
      setLoading(false)
      return
    }
    let cancelled = false
    async function fetchPeriod() {
      try {
        setLoading(true)
        const data = await apiClient.getExamPeriodById(id, token)
        const p = { ...data, id: (data as ExamPeriod & { _id?: string }).id || (data as { _id?: string })._id || id }
        if (cancelled) return
        setPeriod(p as ExamPeriod)
        setName(p.name ?? "")
        setStartDate(isoToDateInput(p.start_date))
        setEndDate(isoToDateInput(p.end_date))
        setAcademicYear(p.academic_year || currentYear)
        setSemester((p.semester === 1 || p.semester === 2 ? p.semester : 1) as 1 | 2)
        setIsActive(p.is_active ?? true)
      } catch (err) {
        console.error("Failed to load exam period", err)
        if (!cancelled) setPeriod(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchPeriod()
    return () => { cancelled = true }
  }, [token, id])

  const startISO = startDate ? `${startDate}T00:00:00.000Z` : ""
  const endISO = endDate ? `${endDate}T23:59:59.999Z` : ""

  const isValid =
    period != null &&
    name.trim().length > 0 &&
    startDate &&
    endDate &&
    new Date(endISO) >= new Date(startISO) &&
    (semester === 1 || semester === 2)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!isValid || !token || !period) return

    setIsSubmitting(true)
    try {
      const payload: ExamPeriod = {
        id: period.id,
        name: name.trim(),
        start_date: startISO,
        end_date: endISO,
        academic_year: academicYear,
        semester,
        is_active: isActive,
        created_at: period.created_at,
      }
      if (period.major_id !== undefined) payload.major_id = period.major_id
      await apiClient.updateExamPeriod(period.id, payload, token)
      router.push("/dashboard/admin/exam-periods")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update exam period"
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isAuthenticated || !user) return null
  if (user.user_type !== "ADMIN" && user.user_type !== "STUDENTSKA_SLUZBA") return null

  if (loading) {
    return (
      <DashboardLayout title="Edit Exam Period">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  if (!period) {
    return (
      <DashboardLayout title="Edit Exam Period">
        <div className="space-y-6">
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/admin/exam-periods")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Exam Periods
          </Button>
          <p className="text-muted-foreground">Exam period not found.</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Edit Exam Period">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard/admin/exam-periods")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Exam Periods
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Edit Exam Period</h2>
            <p className="text-muted-foreground">Update the date range and settings for this exam period.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-md bg-destructive/10 text-destructive px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Exam Period Details
              </CardTitle>
              <CardDescription>
                Only active periods allow new exam sessions to be scheduled within their date range.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Winter exams 2025"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Start date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End date *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>
              {startDate && endDate && new Date(endISO) < new Date(startISO) && (
                <p className="text-sm text-destructive">End date must be on or after start date.</p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="academic_year">Academic year *</Label>
                  <Input
                    id="academic_year"
                    type="number"
                    min={2000}
                    max={2100}
                    value={academicYear}
                    onChange={(e) => setAcademicYear(parseInt(e.target.value, 10) || currentYear)}
                  />
                </div>
                <div>
                  <Label htmlFor="semester">Semester *</Label>
                  <Select
                    value={String(semester)}
                    onValueChange={(v) => setSemester(Number(v) as 1 | 2)}
                  >
                    <SelectTrigger id="semester">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={isActive}
                  onCheckedChange={(checked) => setIsActive(checked === true)}
                />
                <Label htmlFor="is_active" className="font-normal cursor-pointer">
                  Active (allow scheduling exams in this period)
                </Label>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/admin/exam-periods")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
