"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Bell, Pencil, Loader2 } from "lucide-react"
import type { Notification } from "@/lib/types"

export default function ViewNotificationPage() {
  const router = useRouter()
  const params = useParams()
  const id = typeof params.id === "string" ? params.id : null
  const { token } = useAuth()
  const [notification, setNotification] = useState<Notification | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token || !id) return
    const notificationId = id
    const authToken = token
    let cancelled = false
    async function load() {
      try {
        const data = await apiClient.getNotificationById(notificationId, authToken)
        if (!cancelled) setNotification(data)
      } catch (e) {
        console.error("Failed to load notification:", e)
        if (!cancelled) setNotification(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [token, id])

  const formatRole = (value: string) =>
    value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

  const recipientLabel =
    notification?.recipient_type === "department"
      ? "Sent to the whole Department"
      : notification?.recipient_type === "major"
        ? "Sent to students of the Major"
        : notification?.recipient_type === "role"
          ? `Sent to every ${notification?.recipient_value ? formatRole(notification.recipient_value) : "role"}`
          : "Sent to you only"

  if (loading) {
    return (
      <DashboardLayout title="Notification">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  if (!notification) {
    return (
      <DashboardLayout title="Notification">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Notification not found.
          </CardContent>
        </Card>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Return
        </Button>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="View Notification">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return
          </Button>
          <Button onClick={() => router.push(`/dashboard/admin/notifications/edit/${notification.id}`)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  {notification.title}
                </CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-2">
                  <Badge variant={notification.seen ? "secondary" : "default"}>
                    {notification.seen ? "Seen" : "Unread"}
                  </Badge>
                </CardDescription>
                <CardDescription className="flex flex-wrap items-center gap-2">{recipientLabel}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Content</h4>
              <p className="text-sm whitespace-pre-wrap">{notification.content}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
