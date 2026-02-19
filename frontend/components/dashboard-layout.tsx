"use client"

import type React from "react"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  LogOut,
  User,
  Menu,
  Home,
  Briefcase,
  FileText,
  Users,
  Building,
  Calendar,
  BookOpen,
  Settings,
  GraduationCap,
  Bell,
  CheckCheck,
  Trash2,
  Bookmark,
} from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { apiClient } from "@/lib/api-client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { Notification } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface DashboardLayoutProps {
  children: React.ReactNode
  title: string
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { user, logout, token } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [loggingOut, setLoggingOut] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)

  const loadNotifications = useCallback(async () => {
    if (!token || !user?.id) return
    try {
      setNotificationsLoading(true)
      const data = await apiClient.getUserNotifications(user.id, token)
      const list = Array.isArray(data) ? data : []
      setNotifications(
        list.map((n: Notification) => ({
          ...n,
          seen: n.seen !== false,
        }))
      )
    } catch (error) {
      console.error("Failed to load notifications:", error)
      setNotifications([])
    } finally {
      setNotificationsLoading(false)
    }
  }, [token, user?.id])

  useEffect(() => {
    if (!token || !user) return
    loadNotifications()
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [token, user, loadNotifications])

  const handleMarkAsSeen = async (notificationId: string) => {
    if (!token) return
    try {
      await apiClient.markNotificationAsSeen(notificationId, token)
      const id = String(notificationId)
      setNotifications((prev) =>
        prev.map((n) => (String(n.id) === id ? { ...n, seen: true } : n))
      )
    } catch (error) {
      console.error("Failed to mark notification as seen:", error)
    }
  }

  const handleView = (id: string) => {
    router.push(`/dashboard/user/notifications/${String(id)}`)
  }

  const handleNotificationClick = (e: React.MouseEvent, notification: Notification) => {
    e.preventDefault()
    e.stopPropagation()
    const id = String(notification.id)
    if (!notification.seen) {
      void handleMarkAsSeen(id)
    }
    handleView(id)
  }

  const handleDeleteNotification = async (e: React.MouseEvent | React.PointerEvent, notificationId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!token) return
    try {
      await apiClient.deleteNotification(notificationId, token)
      const id = String(notificationId)
      setNotifications((prev) => prev.filter((n) => String(n.id) !== id))
    } catch (error) {
      console.error("Failed to delete notification:", error)
    }
  }

  const handleMarkAsReadClick = async (e: React.MouseEvent | React.PointerEvent, notificationId: string) => {
    e.preventDefault()
    e.stopPropagation()
    await handleMarkAsSeen(notificationId)
  }

  const unseenCount = notifications.filter((n) => n.seen === false).length

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      if (token) {
        await apiClient.logout(token)
      }
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      logout()
      router.push("/login")
    }
  }

  const getNavigationLinks = () => {
    const userType = user?.user_type?.toLowerCase()

    switch (userType) {
      case "student":
        return [
          { href: "/dashboard/student", label: "Dashboard", icon: Home },
          { href: "/dashboard/student/courses", label: "Courses", icon: BookOpen },
          { href: "/dashboard/student/exams", label: "Exams", icon: Calendar },
          { href: "/dashboard/student/internships", label: "Internships", icon: Briefcase },
        ]
      case "employer":
        return [
          { href: "/dashboard/employer", label: "Dashboard", icon: Home },
          { href: "/dashboard/employer/job-listings", label: "Job Listings", icon: Briefcase },
          { href: "/dashboard/employer/applications", label: "Applications", icon: FileText },
          { href: "/dashboard/employer/company", label: "Company", icon: Building },
        ]
      case "candidate":
        return [
          { href: "/dashboard/candidate", label: "Dashboard", icon: Home },
          { href: "/dashboard/candidate/job-search", label: "Job Search", icon: Briefcase },
          { href: "/dashboard/candidate/saved-jobs", label: "Saved Jobs", icon: Bookmark },
          { href: "/dashboard/candidate/applications", label: "My Applications", icon: FileText },
          { href: "/dashboard/candidate/profile", label: "Profile", icon: User },
        ]
      case "professor":
        return [
          { href: "/dashboard/professor", label: "Dashboard", icon: Home },
          { href: "/dashboard/profile", label: "Profile", icon: User },
        ]
      case "admin":
        return [
          { href: "/dashboard/admin", label: "Dashboard", icon: Home },
          { href: "/dashboard/admin/students", label: "Students", icon: Users },
          { href: "/dashboard/admin/professors", label: "Professors", icon: Users },
          { href: "/dashboard/admin/employers", label: "Employers", icon: Building },
          { href: "/dashboard/admin/job-listings", label: "Job Listings", icon: Briefcase },
          { href: "/dashboard/admin/subjects", label: "Departments & Majors", icon: BookOpen },
          { href: "/dashboard/admin/notifications", label: "Notifications", icon: Bell },
        ]
      default:
        return [{ href: "/dashboard", label: "Dashboard", icon: Home }]
    }
  }

  const navigationLinks = getNavigationLinks()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50 overflow-visible">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <span className="text-lg font-semibold">euprava</span>
              </Link>

              <nav className="hidden md:flex items-center gap-1">
                {navigationLinks.map((link) => {
                  const Icon = link.icon
                  const isActive = pathname === link.href
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        }`}
                    >
                      <Icon className="h-4 w-4" />
                      {link.label}
                    </Link>
                  )
                })}
              </nav>
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                    
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Navigation</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {navigationLinks.map((link) => {
                    const Icon = link.icon
                    return (
                      <DropdownMenuItem key={link.href} onClick={() => router.push(link.href)}>
                        <Icon className="mr-2 h-4 w-4" />
                        {link.label}
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-[3px] hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 size-9"
                        title="Notifications"
                      >
                        <Bell className="h-5 w-5" />
                      </button>
                    </DropdownMenuTrigger>
                    {unseenCount > 0 && (
                      <Badge
                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs font-bold rounded-full border-2 border-background pointer-events-none"
                      >
                        {unseenCount > 99 ? "99+" : unseenCount}
                      </Badge>
                    )}
                  <DropdownMenuContent 
                    align="end" 
                    className="w-80 !opacity-100 !visible"
                    sideOffset={8}
                  >
                    <DropdownMenuLabel className="flex items-center justify-between">
                      <span>Notifications</span>
                      {unseenCount > 0 && (
                        <Badge variant="destructive" className="ml-2">
                          {unseenCount} new
                        </Badge>
                      )}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <div className="max-h-[280px] overflow-y-auto overscroll-contain">
                      {notificationsLoading ? (
                        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                          Loading notifications...
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                          No notifications
                        </div>
                      ) : (
                        <div className="py-1">
                          {[...notifications].map((notification) => (
                            <div
                              key={notification.id}
                              className={cn(
                                "flex items-start justify-between w-full gap-2 p-3 border-b last:border-b-0",
                                !notification.seen && "bg-accent/50"
                              )}
                            >
                              <div
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={(e) => handleNotificationClick(e, notification)}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <p
                                    className={cn(
                                      "text-sm truncate",
                                      !notification.seen ? "font-semibold" : "font-medium"
                                    )}
                                  >
                                    {notification.title}
                                  </p>
                                  {!notification.seen && (
                                    <div className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2 break-words">
                                  {notification.content}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 self-center">
                                {!notification.seen && (
                                  <button
                                    type="button"
                                    className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent cursor-pointer border-0 bg-transparent p-0"
                                    title="Mark as read"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      handleMarkAsReadClick(e, notification.id)
                                    }}
                                  >
                                    <CheckCheck className="h-4 w-4 shrink-0" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent cursor-pointer border-0 bg-transparent p-0 text-destructive hover:text-destructive"
                                  title="Delete"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    handleDeleteNotification(e, notification.id)
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 shrink-0" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
