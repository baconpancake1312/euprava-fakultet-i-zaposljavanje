"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

export default function ScheduleInterviewPage() {
  const { token, user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [form, setForm] = useState({
    candidate_id: "",
    job_listing_id: "",
    scheduled_time: "",
    notes: "",
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id || !token) return
    setLoading(true)
    try {
      await apiClient.createInterview({
        employer_id: user.id,
        candidate_id: form.candidate_id,
        job_listing_id: form.job_listing_id,
        scheduled_time: new Date(form.scheduled_time).toISOString(),
        notes: form.notes,
        status: "scheduled",
      }, token)
      toast({ title: "Interview scheduled!" })
      router.push("/dashboard/employer/interviews")
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Schedule Interview</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="candidate_id">Candidate ID</Label>
              <Input name="candidate_id" value={form.candidate_id} onChange={handleChange} required />
            </div>
            <div>
              <Label htmlFor="job_listing_id">Job Listing ID</Label>
              <Input name="job_listing_id" value={form.job_listing_id} onChange={handleChange} required />
            </div>
            <div>
              <Label htmlFor="scheduled_time">Scheduled Time</Label>
              <Input name="scheduled_time" type="datetime-local" value={form.scheduled_time} onChange={handleChange} required />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea name="notes" value={form.notes} onChange={handleChange} />
            </div>
            <Button type="submit" disabled={loading} className="w-full">{loading ? "Scheduling..." : "Schedule Interview"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
