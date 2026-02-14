"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { EntityFormPage } from "@/components/entity/entityFormPage"
import { NotificationFields } from "./notificationFields"
import type { Major, Student, Professor } from "@/lib/types"

interface DepartmentRef {
  id: string
  name: string
}

export default function CreateNotificationPage() {
  const router = useRouter()
  const { token } = useAuth()

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    recipient_type: "department" as "id" | "role" | "department" | "major" | "major_students" | "major_professors"| "department_students" | "department_professors",
    recipient_value: "",
  })
  const [departments, setDepartments] = useState<DepartmentRef[]>([])
  const [majors, setMajors] = useState<Major[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [professors, setProfessors] = useState<Professor[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (token) {
      loadData()
    }
  }, [token])

  const loadData = async () => {
    try {
      const authToken: string = token!
      const [departmentsData, majorsData, studentsData, professorsData] = await Promise.all([
        apiClient.getAllDepartments(authToken),
        apiClient.getAllMajors(authToken),
        apiClient.getAllStudents(authToken),
        apiClient.getAllProfessors(authToken),
      ])
      
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
    } catch (error) {
      console.error("Failed to load data:", error)
    } finally {
      setLoading(false)
    }
  }

  const isValid =
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
    if (!isValid || !token) return

    setIsSubmitting(true)
    try {
      await apiClient.createNotification(formData, token)
      router.push("/dashboard/admin/notifications")
    } catch (err) {
      console.error("Failed to create notification:", err)
      alert("Failed to create notification. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <EntityFormPage
        title="Create Notification"
        description="Create a new notification"
        mainTitle="Notification Details"
        submitLabel="Create Notification"
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
      title="Create Notification"
      description="Create a new notification for users, departments, majors, or roles"
      mainTitle="Notification Details"
      submitLabel="Create Notification"
      submittingLabel="Creating…"
      submitDisabled={!isValid || isSubmitting}
      onSubmit={handleSubmit}
      guidelines={[
        {
          title: "Notification Content",
          text: "Provide a clear title and detailed content for the notification.",
        },
        {
          title: "Recipient Selection",
          text: "Choose who should receive this notification: a specific user, role, department, or major.",
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
          submitLabel="Create Notification"
          submitDisabled={!isValid || isSubmitting}
          isSubmitting={isSubmitting}
          onCancel={() => router.push("/dashboard/admin/notifications")}
        />
      </form>
    </EntityFormPage>
  )
}
