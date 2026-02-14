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
  const id = params.id as string
  const { token } = useAuth()
  const [notification, setNotification] = useState<Notification | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token || !id) return
    let cancelled = false
    async function load() {
      try {
        const data = await apiClient.getNotificationById(id, token)
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

  const recipientLabel =
    notification?.recipient_type === "department"
      ? "Department"
      : notification?.recipient_type === "major"
        ? "Major"
        : notification?.recipient_type === "role"
          ? "Role"
          : "User"

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
        <Button variant="outline" className="mt-4" onClick={() => router.push("/dashboard/admin/notifications")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to notifications
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
            onClick={() => router.push("/dashboard/admin/notifications")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to notifications
          </Button>
          <Button onClick={() => router.push(`/dashboard/admin/notifications/edit/${id}`)}>
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
                  <Badge variant="outline">{recipientLabel}</Badge>
                  <span>{notification.recipient_value}</span>
                  <Badge variant={notification.seen ? "secondary" : "default"}>
                    {notification.seen ? "Seen" : "Unread"}
                  </Badge>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Content</h4>
              <p className="text-sm whitespace-pre-wrap">{notification.content}</p>
            </div>
            <dl className="grid gap-2 text-sm">
              <div>
                <dt className="font-medium text-muted-foreground">Recipient type</dt>
                <dd>{notification.recipient_type}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Recipient value</dt>
                <dd>{notification.recipient_value}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">ID</dt>
                <dd className="font-mono text-xs">{notification.id}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
