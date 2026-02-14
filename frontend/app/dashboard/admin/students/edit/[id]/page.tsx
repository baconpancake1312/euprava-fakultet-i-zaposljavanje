"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { EntityFormPage } from "@/components/entity/entityFormPage"
import { StudentEditFields } from "./studentFields"
import type { Student, Major } from "@/lib/types"

export default function EditStudentPage() {
  const router = useRouter()
  const params = useParams()
  const studentId = params.id as string

  const { token } = useAuth()

  const [student, setStudent] = useState<Student | null>(null)
  const [profile, setProfile] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address: "",
    date_of_birth: "",
    jmbg: "",
    year: "",
  })
  const [majors, setMajors] = useState<Major[]>([])
  const [majorId, setMajorId] = useState<string>("")
  const [year, setYear] = useState<string>("")
  const [gpa, setGpa] = useState<string>("")
  const [espb, setEspb] = useState<string>("")
  const [scholarship, setScholarship] = useState<boolean>(false)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!token || !studentId) return

    const authToken: string = token

    let cancelled = false

    async function loadData() {
      try {
        const [studentData, majorsData] = await Promise.all([
          apiClient.getStudentById(studentId, authToken),
          apiClient.getAllMajors(authToken),
        ])

        if (cancelled) return

        setStudent(studentData)
        
        const formatISOToDateInput = (isoString: string): string => {
          if (!isoString) return ""
          try {
            const date = new Date(isoString)
            return date.toISOString().split("T")[0]
          } catch {
            return isoString
          }
        }
        
        const rawDateOfBirth = (studentData as any).date_of_birth ?? ""
        setProfile({
          first_name: studentData.first_name ?? "",
          last_name: studentData.last_name ?? "",
          email: studentData.email ?? "",
          phone: studentData.phone ?? "",
          address: (studentData as any).address ?? "",
          date_of_birth: formatISOToDateInput(rawDateOfBirth),
          jmbg: (studentData as any).jmbg ?? "",
          year: (studentData as any).year?.toString() ?? "",
        })

        const majorsList: Major[] = Array.isArray(majorsData) ? majorsData : []
        setMajors(majorsList)

        // Set major ID - check both major_id and major name
        const studentWithMajorId = studentData as Student & { major_id?: string }
        if (studentWithMajorId.major_id) {
          setMajorId(studentWithMajorId.major_id)
        } else if (studentData.major) {
          // Try to find major by name
          const matchedMajor = majorsList.find((m) => m.name === studentData.major)
          if (matchedMajor) {
            setMajorId(matchedMajor.id)
          }
        }

        setYear(studentData.year?.toString() ?? "")
        setGpa(studentData.gpa?.toString() ?? "")
        setEspb(studentData.espb?.toString() ?? "")
        setScholarship(studentData.scholarship ?? false)
      } catch (e) {
        console.error("Failed to load student data:", e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [token, studentId])

  const isValid =
    !!student &&
    profile.first_name.trim().length >= 2 &&
    profile.last_name.trim().length >= 2 &&
    profile.email.trim().length > 0 &&
    profile.phone.trim().length > 0 &&
    profile.address.trim().length > 0 &&
    profile.date_of_birth.trim().length > 0 &&
    profile.jmbg.trim().length === 13

  const formatDateToISO = (dateString: string): string => {
    if (!dateString) return ""
    const date = new Date(dateString + "T12:00:00.000Z")
    return date.toISOString()
  }

  const handleProfileChange = (field: string, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!token || !student || !isValid) return

    setIsSubmitting(true)
    try {
      const formattedDateOfBirth = formatDateToISO(profile.date_of_birth)
      
      // Update core user profile in auth service
      await apiClient.updateUserInfo(
        student.id,
        {
          first_name: profile.first_name.trim(),
          last_name: profile.last_name.trim(),
          email: profile.email.trim(),
          phone: profile.phone.trim(),
          address: profile.address.trim(),
          date_of_birth: formattedDateOfBirth,
          jmbg: profile.jmbg.trim(),
          year: parseInt(profile.year, 10),
        },
        token
      )

      // Prepare student-specific data
      const studentData: any = {
        first_name: profile.first_name.trim(),
        last_name: profile.last_name.trim(),
        email: profile.email.trim(),
        phone: profile.phone.trim(),
        address: profile.address.trim(),
        date_of_birth: formattedDateOfBirth,
        jmbg: profile.jmbg.trim(),
        year: parseInt(year, 10),
      }

      // Add major_id if a major is selected
      if (majorId) {
        studentData.major_id = majorId
      }

      // Add optional fields if they have values
      if (year) {
        studentData.year = parseInt(year, 10)
      }
      if (gpa) {
        studentData.gpa = parseFloat(gpa)
      }
      if (espb) {
        studentData.espb = parseInt(espb, 10)
      }
      studentData.scholarship = scholarship

      await apiClient.updateStudent(student.id, studentData, token)
      await apiClient.updateUserInfo(
        student.id,
        {
          first_name: profile.first_name.trim(),
          last_name: profile.last_name.trim(),
          email: profile.email.trim(),
          phone: profile.phone.trim(),
          address: profile.address.trim(),
          date_of_birth: formattedDateOfBirth,
          jmbg: profile.jmbg.trim(),
        },
        token
      )

      router.push("/dashboard/admin/students")
    } catch (err) {
      console.error("Failed to update student:", err)
      alert("Failed to update student. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading || !student) {
    return (
      <EntityFormPage
        title="Edit Student"
        description="Edit student profile and academic information"
        mainTitle="Student Details"
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
      title="Edit Student"
      description="Edit student profile and academic information"
      mainTitle="Student Details"
      submitLabel="Save Changes"
      submittingLabel="Saving…"
      submitDisabled={!isValid || isSubmitting}
      onSubmit={handleSubmit}
      guidelines={[
        {
          title: "Profile",
          text: "Update basic personal and contact information for the student.",
        },
        {
          title: "Academic Information",
          text: "Update major, year, GPA, ESPB points, and scholarship status.",
        },
      ]}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <StudentEditFields
          student={student}
          firstName={profile.first_name}
          lastName={profile.last_name}
          email={profile.email}
          phone={profile.phone}
          address={profile.address}
          dateOfBirth={profile.date_of_birth}
          jmbg={profile.jmbg}
          onProfileChange={handleProfileChange}
          majors={majors}
          majorId={majorId}
          onMajorIdChange={setMajorId}
          year={year}
          onYearChange={setYear}
          scholarship={scholarship}
          onScholarshipChange={setScholarship}
          submitLabel="Save Changes"
          submitDisabled={!isValid || isSubmitting}
          isSubmitting={isSubmitting}
          onCancel={() => router.push("/dashboard/admin/students")}
        />
      </form>
    </EntityFormPage>
  )
}
