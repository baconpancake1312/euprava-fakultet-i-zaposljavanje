"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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

const currentYear = new Date().getFullYear()

export default function CreateExamPeriodPage() {
  const router = useRouter()
  const { user, token, isAuthenticated } = useAuth()
  const [name, setName] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [academicYear, setAcademicYear] = useState(currentYear)
  const [semester, setSemester] = useState<1 | 2>(1)
  const [isActive, setIsActive] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !user) return
    if (user.user_type !== "ADMIN" && user.user_type !== "ADMINISTRATOR" && user.user_type !== "STUDENTSKA_SLUZBA") {
      router.replace("/dashboard")
    }
  }, [isAuthenticated, user, router])

  const startISO = startDate ? `${startDate}T00:00:00.000Z` : ""
  const endISO = endDate ? `${endDate}T23:59:59.999Z` : ""

  const isValid =
    name.trim().length > 0 &&
    startDate &&
    endDate &&
    new Date(endISO) >= new Date(startISO) &&
    (semester === 1 || semester === 2)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!isValid || !token) return

    setIsSubmitting(true)
    try {
      await apiClient.createExamPeriod(
        {
          name: name.trim(),
          start_date: startISO,
          end_date: endISO,
          academic_year: academicYear,
          semester,
          is_active: isActive,
        },
        token
      )
      router.push("/dashboard/admin/exam-periods")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create exam period"
      const body = err && typeof err === "object" && "response" in err ? (err as { response?: { error?: string } }).response?.error : null
      setError(body || message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isAuthenticated || !user) return null
  if (user.user_type !== "ADMIN" && user.user_type !== "ADMINISTRATOR" && user.user_type !== "STUDENTSKA_SLUZBA") return null

  return (
    <DashboardLayout title="Create Exam Period">
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
            <h2 className="text-3xl font-bold tracking-tight">Create Exam Period</h2>
            <p className="text-muted-foreground">
              Define a date range when professors can schedule exams.
            </p>
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
                  Creating...
                </>
              ) : (
                "Create Exam Period"
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
