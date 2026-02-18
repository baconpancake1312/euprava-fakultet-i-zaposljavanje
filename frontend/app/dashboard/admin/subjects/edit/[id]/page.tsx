"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { SubjectFields } from "../../create/subjectFields"
import { EntityFormPage } from "@/components/entity/entityFormPage"
import type { Major, Professor } from "@/lib/types"

interface MajorOption {
  id: string
  name: string
}

interface ProfessorOption {
  id: string
  name: string
}

export default function EditSubjectPage() {
  const router = useRouter()
  const params = useParams()
  const subjectId = params.id as string
  const { token } = useAuth()

  const [name, setName] = useState("")
  const [majorId, setMajorId] = useState("")
  const [year, setYear] = useState("")
  const [majors, setMajors] = useState<MajorOption[]>([])
  const [professorIds, setProfessorIds] = useState<string[]>([])
  const [professors, setProfessors] = useState<ProfessorOption[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!token || !subjectId) return

    let cancelled = false
    async function fetchData() {
      if (!token) return
      try {
        const [subject, majorsData, professorsData] = await Promise.all([
          apiClient.getCourseById(subjectId, token),
          apiClient.getAllMajors(token),
          apiClient.getAllProfessors(token),
        ])
        if (cancelled) return

        setName(subject.name ?? "")
        setMajorId(subject.major_id ?? "")
        setYear(subject.year != null ? String(subject.year) : "")
        setMajors(
          (Array.isArray(majorsData) ? majorsData : []).map((m: Major) => ({
            id: m.id,
            name: m.name,
          }))
        )
        setProfessors(
          (Array.isArray(professorsData) ? professorsData : []).map((p: Professor) => ({
            id: p.id,
            name: `${p.first_name} ${p.last_name}`,
          }))
        )

        // Extract professor IDs from subject (handle both new array format and old single ID format)
        const professorIdsArray = subject.professor_ids || subject.professorids || 
          (subject.professor_id ? [subject.professor_id] : [])
        if (Array.isArray(professorIdsArray) && professorIdsArray.length > 0) {
          setProfessorIds(professorIdsArray)
        }
      } catch (e) {
        console.error("Failed to load subject/majors/professors:", e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => {
      cancelled = true
    }
  }, [token, subjectId])

  const isValid = name.trim().length > 0 && majorId.trim().length > 0

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!isValid || !token) return

    setIsSubmitting(true)
    try {
      const subject = await apiClient.getCourseById(subjectId, token)
      const yearNum = parseInt(year, 10)
      const payload: {
        name: string
        major_id: string
        year?: number
        professor_ids?: string[]
      } = {
        ...subject,
        name: name.trim(),
        major_id: majorId.trim(),
      }
      if (!Number.isNaN(yearNum)) payload.year = yearNum
      if (professorIds.length > 0) payload.professor_ids = professorIds

      await apiClient.updateCourse(subjectId, payload, token)
      router.push("/dashboard/admin/subjects")
    } catch (err) {
      console.error("Failed to update subject:", err)
    } finally {
      setIsSubmitting(false)
    }
  }
  if (loading) {
    return (
      <EntityFormPage
        title="Edit Subject"
        description="Edit an existing subject"
        mainTitle="Subject Details"
        submitLabel="Save Subject"
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
      title="Edit Subject"
      description="Edit an existing subject"
      mainTitle="Subject Details"
      submitLabel="Save Subject"
      submittingLabel="Saving…"
      submitDisabled={!isValid || isSubmitting}
      onSubmit={handleSubmit}
      guidelines={[
        { title: "Subject name", text: "Enter the full name of the course." },
        { title: "Major", text: "Choose the major this subject belongs to." },
        { title: "Year", text: "Optional. The year of study (1–6)." },
        { title: "Professors", text: "Optional. Select one or more professors who teach this subject." },
      ]}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <SubjectFields
          name={name}
          onNameChange={setName}
          majorId={majorId}
          onMajorIdChange={setMajorId}
          majors={majors}
          year={year}
          onYearChange={setYear}
          professorIds={professorIds}
          onProfessorIdsChange={setProfessorIds}
          professors={professors}
          submitLabel="Save Subject"
          submitDisabled={!isValid || isSubmitting}
          isSubmitting={isSubmitting}
          onCancel={() => router.push("/dashboard/admin/subjects")}
        />
      </form>
    </EntityFormPage>
  )
}
