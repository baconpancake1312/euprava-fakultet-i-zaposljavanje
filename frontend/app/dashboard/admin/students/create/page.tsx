"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { EntityFormPage } from "@/components/entity/entityFormPage"
import { StudentFields } from "./studentFields"
import type { Major, UserType } from "@/lib/types"

export default function CreateStudentPage() {
  const router = useRouter()
  const { token } = useAuth()

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    date_of_birth: "",
    jmbg: "",
  })
  const [majorId, setMajorId] = useState<string>("")
  const [year, setYear] = useState<string>("")
  const [majors, setMajors] = useState<Major[]>([])
  const [scholarship, setScholarship] = useState<boolean>(false)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }

    let cancelled = false
    async function fetchData() {
      if (!token) return
      try {
        const majorsData = await apiClient.getAllMajors(token)
        const majorsList = Array.isArray(majorsData) ? majorsData : []
        if (!cancelled) {
          setMajors(majorsList)
        }
      } catch (e) {
        console.error("Failed to load majors:", e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => {
      cancelled = true
    }
  }, [token])

  const isValid =
    formData.first_name.trim().length >= 2 &&
    formData.last_name.trim().length >= 2 &&
    formData.email.trim().length > 0 &&
    formData.password.trim().length >= 8 &&
    formData.phone.trim().length > 0 &&
    formData.address.trim().length > 0 &&
    formData.date_of_birth.trim().length > 0 &&
    formData.jmbg.trim().length === 13

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const formatDateToISO = (dateString: string): string => {
    if (!dateString) return ""
    const date = new Date(dateString + "T12:00:00.000Z")
    return date.toISOString()
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!isValid || !token) return

    setIsSubmitting(true)
    try {
      const formattedDateOfBirth = formatDateToISO(formData.date_of_birth)
      
      // 1. Register the user account and wait for the full response
      const registerPayload = {
        ...formData,
        date_of_birth: formattedDateOfBirth,
        user_type: "STUDENT" as UserType,
      }
      
      let registerResponse: Awaited<ReturnType<typeof apiClient.register>>
      try {
        registerResponse = await apiClient.register(registerPayload)
      } catch (registerErr: any) {
        const registerErrorMsg = registerErr?.message || String(registerErr)
        if (
          registerErrorMsg.includes("this email or phone number already exists") ||
          registerErrorMsg.includes("email or phone number already exists")
        ) {
          alert("A student with this email or phone number already exists. Please use a different email or phone number.")
          return
        }
        throw registerErr
      }

      // 2. Only after we have the register response, get user ID from it
      const res = registerResponse as {
        user?: { id?: string }
        user_id?: string
        result?: { InsertedID?: string }
        id?: string
      }
      const userId =
        res.user_id ??
        res.result?.InsertedID ??
        res.user?.id ??
        res.id
      if (!userId) {
        throw new Error("Failed to get user ID from registration")
      }

      // 3. Only then send update student (waits for register response above)
      const updatePayload: { major_id?: string; year?: number } = {}
      if (majorId) {
        updatePayload.major_id = majorId
      }
      if (year) {
        const yearNum = parseInt(year, 10)
        if (!Number.isNaN(yearNum)) {
          updatePayload.year = yearNum
        }
      }
      if (Object.keys(updatePayload).length > 0) {
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
        await delay(1000)
        await apiClient.updateStudent(userId, updatePayload, token)
      }

      router.push("/dashboard/admin/students")
    } catch (err: any) {
      console.error("Error creating student:", err)
      console.error("Error details:", {
        message: err?.message,
        status: err?.status,
        response: err?.response,
        error: err?.error,
      })
      
      // Check for 409 conflict error with specific message
      const errorMessage = err?.message || err?.error || String(err)
      const statusCode = err?.status || err?.response?.status
      
      if (
        statusCode === 409 ||
        errorMessage.includes("this email or phone number already exists") ||
        errorMessage.includes("email or phone number already exists")
      ) {
        alert("⚠️ A student with this email or phone number already exists. Please use a different email or phone number.")
      } else {
        alert(`Failed to create student: ${errorMessage}`)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <EntityFormPage
        title="Create Student"
        description="Register a new student account"
        mainTitle="Student Details"
        submitLabel="Create Student"
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
      title="Create Student"
      description="Register a new student account"
      mainTitle="Student Details"
      submitLabel="Create Student"
      submittingLabel="Creating…"
      submitDisabled={!isValid || isSubmitting}
      onSubmit={handleSubmit}
      guidelines={[
        {
          title: "Account details",
          text: "Provide basic personal and contact information for the student.",
        },
        {
          title: "Credentials",
          text: "Set a secure password and ensure JMBG is correct (13 digits).",
        },
        {
          title: "Academic Information",
          text: "Optionally assign a major, year, and scholarship status.",
        },
      ]}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <StudentFields
          firstName={formData.first_name}
          lastName={formData.last_name}
          email={formData.email}
          password={formData.password}
          phone={formData.phone}
          address={formData.address}
          dateOfBirth={formData.date_of_birth}
          jmbg={formData.jmbg}
          onChange={handleChange}
          majors={majors}
          majorId={majorId}
          onMajorIdChange={setMajorId}
          year={year}
          onYearChange={setYear}
          scholarship={scholarship}
          onScholarshipChange={setScholarship}
          submitLabel="Create Student"
          submitDisabled={!isValid || isSubmitting}
          isSubmitting={isSubmitting}
          onCancel={() => router.push("/dashboard/admin/students")}
        />
      </form>
    </EntityFormPage>
  )
}
