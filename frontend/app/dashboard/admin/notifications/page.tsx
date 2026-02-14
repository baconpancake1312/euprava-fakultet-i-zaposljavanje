"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Loader2, Bell, Pencil, Trash2, Building2, ChevronDown, ChevronRight, GraduationCap, Users, UserCircle, Plus, Eye, Receipt } from "lucide-react"
import type { Notification, Major, Student, Professor } from "@/lib/types"

interface DepartmentRef {
  id: string
  name: string
}

export default function AdminNotificationsPage() {
  const router = useRouter()
  const { token } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [majors, setMajors] = useState<Major[]>([])
  const [departments, setDepartments] = useState<DepartmentRef[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [professors, setProfessors] = useState<Professor[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedDeptId, setExpandedDeptId] = useState<string | null>(null)
  const [expandedMajorIds, setExpandedMajorIds] = useState<Set<string>>(new Set())
  const [expandedRole, setExpandedRole] = useState<string | null>(null)
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)

  useEffect(() => {
    if (token) {
      loadData()
    }
  }, [token])

  const loadData = async () => {
    try {
      const authToken: string = token!
      const [notificationsData, majorsData, departmentsData, studentsData, professorsData] = await Promise.all([
        apiClient.getAllNotifications(authToken),
        apiClient.getAllMajors(authToken),
        apiClient.getAllDepartments(authToken),
        apiClient.getAllStudents(authToken),
        apiClient.getAllProfessors(authToken),
      ])
      
      setNotifications(Array.isArray(notificationsData) ? notificationsData : [])
      setMajors(Array.isArray(majorsData) ? majorsData : [])
      setDepartments(
        Array.isArray(departmentsData)
          ? departmentsData.map((d: { id: string; name: string }) => ({
              id: d.id,
              name: d.name,
            }))
          : []
      )
      setStudents(Array.isArray(studentsData) ? studentsData : [])
      setProfessors(Array.isArray(professorsData) ? professorsData : [])
    } catch (error) {
      console.error("Failed to load data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Group majors by department
  const majorsByDepartmentId = useMemo(() => {
    const map: Record<string, Major[]> = {}
    for (const major of majors) {
      const deptId = major.department_id ?? ""
      if (!deptId) continue
      if (!map[deptId]) map[deptId] = []
      map[deptId].push(major)
    }
    return map
  }, [majors])

  // Group notifications by recipient type and value
  const notificationsByDepartment = useMemo(() => {
    const map: Record<string, Notification[]> = {}
    for (const notification of notifications) {
      if (notification.recipient_type === "department") {
        const deptId = notification.recipient_value
        if (!map[deptId]) map[deptId] = []
        map[deptId].push(notification)
      }
    }
    return map
  }, [notifications])

  const notificationsByMajor = useMemo(() => {
    const map: Record<string, Notification[]> = {}
    for (const notification of notifications) {
      if (notification.recipient_type === "major") {
        const majorId = notification.recipient_value
        if (!map[majorId]) map[majorId] = []
        map[majorId].push(notification)
      }
    }
    return map
  }, [notifications])

  const notificationsByRole = useMemo(() => {
    const map: Record<string, Notification[]> = {}
    for (const notification of notifications) {
      if (notification.recipient_type === "role") {
        const role = notification.recipient_value
        if (!map[role]) map[role] = []
        map[role].push(notification)
      }
    }
    return map
  }, [notifications])

  const notificationsByUserId = useMemo(() => {
    const map: Record<string, Notification[]> = {}
    for (const notification of notifications) {
      if (notification.recipient_type === "id") {
        const userId = notification.recipient_value
        if (!map[userId]) map[userId] = []
        map[userId].push(notification)
      }
    }
    return map
  }, [notifications])

  // Helper functions to get names
  const getDepartmentName = (id: string) => {
    return departments.find(d => d.id === id)?.name || `Department ${id}`
  }

  const getMajorName = (id: string) => {
    return majors.find(m => m.id === id)?.name || `Major ${id}`
  }

  const getUserName = (id: string) => {
    const student = students.find(s => s.id === id)
    if (student) return `${student.first_name} ${student.last_name} (Student)`
    const professor = professors.find(p => p.id === id)
    if (professor) return `${professor.first_name} ${professor.last_name} (Professor)`
    return `User ${id}`
  }

  const formatRole = (value: string) =>
    value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

  const getRecipientLabel = (notification: Notification): string => {
    
        const student = students.find((s) => s.id === notification.recipient_id)
        const professor = professors.find((p) => p.id === notification.recipient_id)
        if (student !== undefined){
          return `Student ${student.first_name} ${student.last_name}`
        }else if (professor !== undefined){
          return `Professor ${professor.first_name} ${professor.last_name}` 
        }else{
          return formatRole(notification.recipient_id ?? "")
        }
        
    }

  const toggleMajor = (majorId: string) => {
    setExpandedMajorIds((prev) => {
      const next = new Set(prev)
      if (next.has(majorId)) {
        next.delete(majorId)
      } else {
        next.add(majorId)
      }
      return next
    })
  }

  const handleDelete = async (id: string) => {
    if (!token) return
    if (!confirm("Delete this notification? This cannot be undone.")) {
      return
    }
    try {
      await apiClient.deleteNotification(id, token)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    } catch (error) {
      console.error("Failed to delete notification:", error)
      alert("Failed to delete notification")
    }
  }

  const handleEdit = (id: string) => {
    router.push(`/dashboard/admin/notifications/edit/${id}`)
  }

  const handleView = (id: string) => {
    router.push(`/dashboard/admin/notifications/${id}`)
  }

  // Get all unique user IDs that have notifications
  const userIdsWithNotifications = Object.keys(notificationsByUserId)
  const rolesWithNotifications = Object.keys(notificationsByRole)

  return (
    <DashboardLayout title="Notification Management">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Notification Management</h1>
            <p className="text-muted-foreground">View and manage all notifications organized by department, major, role, and user</p>
          </div>
          <Button onClick={() => router.push("/dashboard/admin/notifications/create")}>
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
            <CardContent className="py-12 text-center text-muted-foreground">
              No notifications found
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-1">
            {/* Notifications by Department */}
            {departments.map((dept) => {
              const deptNotifications = notificationsByDepartment[dept.id] ?? []
              const deptMajors = majorsByDepartmentId[dept.id] ?? []
              const majorNotifications = deptMajors.reduce(
                (acc, major) => acc + (notificationsByMajor[major.id]?.length ?? 0),
                0
              )
              const totalNotifications = deptNotifications.length + majorNotifications
              
              if (totalNotifications === 0) return null
              
              const isExpanded = expandedDeptId === dept.id
              return (
                <Collapsible
                  key={dept.id}
                  open={isExpanded}
                  onOpenChange={(open) => setExpandedDeptId(open ? dept.id : null)}
                >
                  <Card>
                    <div className="flex items-center gap-2 w-full px-4 py-3 rounded-t-lg">
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="flex items-center gap-3 flex-1 min-w-0 text-left hover:bg-muted/50 transition-colors rounded py-1 -my-1 -ml-2 pl-2"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                          )}
                          <Building2 className="h-5 w-5 shrink-0 text-muted-foreground" />
                          <span className="font-semibold truncate">{dept.name}</span>
                          <span className="text-sm text-muted-foreground shrink-0">
                            ({totalNotifications} notification{totalNotifications !== 1 ? "s" : ""})
                          </span>
                        </button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-3 px-4">
                        {/* Department-level notifications */}
                        {deptNotifications.length > 0 && (
                          <div className="pl-8 pt-2 space-y-3 mb-3">
                            {deptNotifications.map((notification) => (
                              <Card key={notification.id}>
                                <CardHeader>
                                  <div className="flex items-start justify-between">
                                    <div className="space-y-1 flex-1">
                                      <CardTitle className="flex items-center gap-2">
                                        <Bell className="h-5 w-5" />
                                        {notification.title}
                                      </CardTitle>
                                      <CardDescription>
                                        <Badge variant="outline" className="mr-2">Department</Badge>
                                        {dept.name}
                                        <span className="block mt-1 text-muted-foreground">
                                          Recipient: {getRecipientLabel(notification)}
                                        </span>
                                      </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => handleView(notification.id)}
                                        title="View"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => handleEdit(notification.id)}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => handleDelete(notification.id)}
                                        className="text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </CardHeader>
                                <CardContent>
                                  <p className="text-sm text-muted-foreground">{notification.content}</p>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}

                        {/* Major-level notifications */}
                        {deptMajors.length > 0 && (
                          <ul className="space-y-3 pl-8">
                            {deptMajors.map((major) => {
                              const majorNotifications = notificationsByMajor[major.id] ?? []
                              if (majorNotifications.length === 0) return null
                              
                              const isMajorExpanded = expandedMajorIds.has(major.id)
                              return (
                                <li key={major.id} className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Collapsible
                                      open={isMajorExpanded}
                                      onOpenChange={() => toggleMajor(major.id)}
                                    >
                                      <CollapsibleTrigger asChild>
                                        <button
                                          type="button"
                                          className="flex items-center gap-2 flex-1 min-w-0 text-left hover:bg-muted/50 transition-colors rounded py-1 px-2 -ml-2"
                                        >
                                          {isMajorExpanded ? (
                                            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                                          ) : (
                                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                                          )}
                                          <GraduationCap className="h-4 w-4 shrink-0 text-muted-foreground" />
                                          <span className="text-sm font-medium flex-1 min-w-0 truncate">{major.name}</span>
                                          <span className="text-xs text-muted-foreground shrink-0">
                                            ({majorNotifications.length} notification{majorNotifications.length !== 1 ? "s" : ""})
                                          </span>
                                        </button>
                                      </CollapsibleTrigger>
                                      <CollapsibleContent>
                                        <div className="pl-6 pt-2 space-y-3">
                                          {majorNotifications.map((notification) => (
                                            <Card key={notification.id}>
                                              <CardHeader>
                                                <div className="flex items-start justify-between">
                                                  <div className="space-y-1 flex-1">
                                                    <CardTitle className="flex items-center gap-2">
                                                      <Bell className="h-5 w-5" />
                                                      {notification.title}
                                                    </CardTitle>
                                                    <CardDescription>
                                                      <Badge variant="outline" className="mr-2">Major</Badge>
                                                      {major.name}
                                                      <span className="block mt-1 text-muted-foreground">
                                                        Recipient: {getRecipientLabel(notification)}
                                                      </span>
                                                    </CardDescription>
                                                  </div>
                                                  <div className="flex items-center gap-1">
                                                    <Button
                                                      variant="outline"
                                                      size="icon"
                                                      onClick={() => handleView(notification.id)}
                                                      title="View"
                                                    >
                                                      <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                      variant="outline"
                                                      size="icon"
                                                      onClick={() => handleEdit(notification.id)}
                                                    >
                                                      <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                      variant="outline"
                                                      size="icon"
                                                      onClick={() => handleDelete(notification.id)}
                                                      className="text-destructive hover:text-destructive"
                                                    >
                                                      <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                  </div>
                                                </div>
                                              </CardHeader>
                                              <CardContent>
                                                <p className="text-sm text-muted-foreground">{notification.content}</p>
                                              </CardContent>
                                            </Card>
                                          ))}
                                        </div>
                                      </CollapsibleContent>
                                    </Collapsible>
                                  </div>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              )
            })}

            {/* Notifications by Role */}
            {rolesWithNotifications.length > 0 && (
              <Collapsible
                open={expandedRole !== null}
                onOpenChange={(open) => setExpandedRole(open ? "" : null)}
              >
                <Card>
                  <div className="flex items-center gap-2 w-full px-4 py-3 rounded-t-lg">
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center gap-3 flex-1 min-w-0 text-left hover:bg-muted/50 transition-colors rounded py-1 -my-1 -ml-2 pl-2"
                      >
                        {expandedRole !== null ? (
                          <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                        )}
                        <UserCircle className="h-5 w-5 shrink-0 text-muted-foreground" />
                        <span className="font-semibold truncate">Role-based Notifications</span>
                        <span className="text-sm text-muted-foreground shrink-0">
                          ({rolesWithNotifications.reduce((sum, role) => sum + notificationsByRole[role].length, 0)} notification{rolesWithNotifications.reduce((sum, role) => sum + notificationsByRole[role].length, 0) !== 1 ? "s" : ""})
                        </span>
                      </button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-3 px-4">
                      <div className="pl-8 pt-2 space-y-3">
                        {rolesWithNotifications.map((role) => {
                          const roleNotifications = notificationsByRole[role]
                          return (
                            <div key={role} className="space-y-2">
                              <div className="flex items-center gap-2 py-1">
                                <Badge variant="secondary" className="text-sm font-medium">
                                  {role}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  ({roleNotifications.length} notification{roleNotifications.length !== 1 ? "s" : ""})
                                </span>
                              </div>
                              <div className="pl-4 space-y-3">
                                {roleNotifications.map((notification) => (
                                  <Card key={notification.id}>
                                    <CardHeader>
                                      <div className="flex items-start justify-between">
                                        <div className="space-y-1 flex-1">
                                          <CardTitle className="flex items-center gap-2">
                                            <Bell className="h-5 w-5" />
                                            {notification.title}
                                          </CardTitle>
                                          <CardDescription>
                                            <Badge variant="outline" className="mr-2">Role</Badge>
                                            {role}
                                            <span className="block mt-1 text-muted-foreground">
                                              Recipient: {getRecipientLabel(notification)}
                                            </span>
                                          </CardDescription>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => handleView(notification.id)}
                                            title="View"
                                          >
                                            <Eye className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => handleEdit(notification.id)}
                                          >
                                            <Pencil className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => handleDelete(notification.id)}
                                            className="text-destructive hover:text-destructive"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    </CardHeader>
                                    <CardContent>
                                      <p className="text-sm text-muted-foreground">{notification.content}</p>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

            {/* Notifications by User ID */}
            {userIdsWithNotifications.length > 0 && (
              <Collapsible
                open={expandedUserId !== null}
                onOpenChange={(open) => setExpandedUserId(open ? "" : null)}
              >
                <Card>
                  <div className="flex items-center gap-2 w-full px-4 py-3 rounded-t-lg">
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center gap-3 flex-1 min-w-0 text-left hover:bg-muted/50 transition-colors rounded py-1 -my-1 -ml-2 pl-2"
                      >
                        {expandedUserId !== null ? (
                          <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                        )}
                        <Users className="h-5 w-5 shrink-0 text-muted-foreground" />
                        <span className="font-semibold truncate">User-specific Notifications</span>
                        <span className="text-sm text-muted-foreground shrink-0">
                          ({userIdsWithNotifications.reduce((sum, userId) => sum + notificationsByUserId[userId].length, 0)} notification{userIdsWithNotifications.reduce((sum, userId) => sum + notificationsByUserId[userId].length, 0) !== 1 ? "s" : ""})
                        </span>
                      </button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-3 px-4">
                      <div className="pl-8 pt-2 space-y-3">
                        {userIdsWithNotifications.map((userId) => {
                          const userNotifications = notificationsByUserId[userId]
                          const userName = getUserName(userId)
                          return (
                            <div key={userId} className="space-y-2">
                              <div className="flex items-center gap-2 py-1">
                                <span className="text-sm font-medium">{userName}</span>
                                <span className="text-xs text-muted-foreground">
                                  ({userNotifications.length} notification{userNotifications.length !== 1 ? "s" : ""})
                                </span>
                              </div>
                              <div className="pl-4 space-y-3">
                                {userNotifications.map((notification) => (
                                  <Card key={notification.id}>
                                    <CardHeader>
                                      <div className="flex items-start justify-between">
                                        <div className="space-y-1 flex-1">
                                          <CardTitle className="flex items-center gap-2">
                                            <Bell className="h-5 w-5" />
                                            {notification.title}
                                          </CardTitle>
                                          <CardDescription>
                                            <Badge variant="outline" className="mr-2">User</Badge>
                                            {userName}
                                            <span className="block mt-1 text-muted-foreground">
                                              Recipient: {getRecipientLabel(notification)}
                                            </span>
                                          </CardDescription>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => handleView(notification.id)}
                                            title="View"
                                          >
                                            <Eye className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => handleEdit(notification.id)}
                                          >
                                            <Pencil className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => handleDelete(notification.id)}
                                            className="text-destructive hover:text-destructive"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    </CardHeader>
                                    <CardContent>
                                      <p className="text-sm text-muted-foreground">{notification.content}</p>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
