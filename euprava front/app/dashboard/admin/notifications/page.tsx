"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Bell, Plus, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Notification {
  id: string
  title: string
  message: string
  type?: string
  created_at?: string
  target_audience?: string
}

export default function AdminNotificationsPage() {
  const { token } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      loadNotifications()
    }
  }, [token])

  const loadNotifications = async () => {
    try {
      const data = await apiClient.getAllNotifications(token!)
      setNotifications(data)
    } catch (error) {
      console.error("Failed to load notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await apiClient.deleteNotification(id, token!)
      loadNotifications()
    } catch (error) {
      console.error("Failed to delete notification:", error)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Notification Management</h1>
            <p className="text-muted-foreground">Create and manage system notifications</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Notification
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          </div>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">No notifications found</CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {notifications.map((notification) => (
              <Card key={notification.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        {notification.title}
                      </CardTitle>
                      {notification.target_audience && (
                        <CardDescription>Target: {notification.target_audience}</CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {notification.type && <Badge>{notification.type}</Badge>}
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(notification.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                  {notification.created_at && (
                    <p className="text-xs text-muted-foreground">
                      Created: {new Date(notification.created_at).toLocaleString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
