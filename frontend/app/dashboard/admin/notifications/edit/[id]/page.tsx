"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { EntityFormPage } from "@/components/entity/entityFormPage"
import { NotificationFields } from "../../create/notificationFields"
import type { Notification, Major, Student, Professor } from "@/lib/types"

interface DepartmentRef {
  id: string
  name: string
}

export default function EditNotificationPage() {
  const router = useRouter()
  const params = useParams()
  const notificationId = params.id as string

  const { token } = useAuth()

  const [notification, setNotification] = useState<Notification | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    recipient_type: "department" as "id" | "role" | "department" | "major",
    recipient_value: "",
  })
  const [departments, setDepartments] = useState<DepartmentRef[]>([])
  const [majors, setMajors] = useState<Major[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [professors, setProfessors] = useState<Professor[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!token || !notificationId) return

    const authToken: string = token

    let cancelled = false

    async function loadData() {
      try {
        const [
          notificationData,
          departmentsData,
          majorsData,
          studentsData,
          professorsData,
        ] = await Promise.all([
          apiClient.getNotificationById(notificationId, authToken),
          apiClient.getAllDepartments(authToken),
          apiClient.getAllMajors(authToken),
          apiClient.getAllStudents(authToken),
          apiClient.getAllProfessors(authToken),
        ])

        if (cancelled) return

        setNotification(notificationData)
        setFormData({
          title: notificationData.title ?? "",
          content: notificationData.content ?? "",
          recipient_type: notificationData.recipient_type ?? "department",
          recipient_value: notificationData.recipient_value ?? "",
        })

        setDepartments(
          Array.isArray(departmentsData)
            ? departmentsData.map((d: { id: string; name: string }) => ({
                id: d.id,
                name: d.name,
              }))
            : []
        )
        setMajors(Array.isArray(majorsData) ? majorsData : [])
        setStudents(Array.isArray(studentsData) ? studentsData : [])
        setProfessors(Array.isArray(professorsData) ? professorsData : [])
      } catch (e) {
        console.error("Failed to load notification data:", e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [token, notificationId])

  const isValid =
    !!notification &&
    formData.title.trim().length > 0 &&
    formData.content.trim().length > 0 &&
    formData.recipient_type.length > 0 &&
    formData.recipient_value.length > 0

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value }
      // Reset recipient_value when recipient_type changes
      if (field === "recipient_type") {
        updated.recipient_value = ""
      }
      return updated
    })
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!token || !notification || !isValid) return

    setIsSubmitting(true)
    try {
      await apiClient.updateNotification(notificationId, formData, token)
      router.push("/dashboard/admin/notifications")
    } catch (err) {
      console.error("Failed to update notification:", err)
      alert("Failed to update notification. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading || !notification) {
    return (
      <EntityFormPage
        title="Edit Notification"
        description="Edit an existing notification"
        mainTitle="Notification Details"
        submitLabel="Save Changes"
        submitDisabled
        onSubmit={() => {}}
      >
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Loading…
        </div>
      </EntityFormPage>
    )
  }

  return (
    <EntityFormPage
      title="Edit Notification"
      description="Edit an existing notification"
      mainTitle="Notification Details"
      submitLabel="Save Changes"
      submittingLabel="Saving…"
      submitDisabled={!isValid || isSubmitting}
      onSubmit={handleSubmit}
      guidelines={[
        {
          title: "Notification Content",
          text: "Update the title and content for the notification.",
        },
        {
          title: "Recipient Selection",
          text: "Modify who should receive this notification: a specific user, role, department, or major.",
        },
      ]}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <NotificationFields
          title={formData.title}
          content={formData.content}
          recipientType={formData.recipient_type}
          recipientValue={formData.recipient_value}
          onChange={handleChange}
          departments={departments}
          majors={majors}
          students={students}
          professors={professors}
          submitLabel="Save Changes"
          submitDisabled={!isValid || isSubmitting}
          isSubmitting={isSubmitting}
          onCancel={() => router.push("/dashboard/admin/notifications")}
        />
      </form>
    </EntityFormPage>
  )
}
