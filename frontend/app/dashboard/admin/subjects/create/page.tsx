"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { SubjectFields } from "./subjectFields"
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

export default function CreateSubjectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { token } = useAuth()
  const presetMajorId = searchParams.get("major_id") ?? ""
  const presetYear = searchParams.get("year") ?? ""

  const [name, setName] = useState("")
  const [majorId, setMajorId] = useState(presetMajorId)
  const [year, setYear] = useState(presetYear)
  const [semester, setSemester] = useState("")
  const [professorIds, setProfessorIds] = useState<string[]>([])
  const [majors, setMajors] = useState<MajorOption[]>([])
  const [professors, setProfessors] = useState<ProfessorOption[]>([])
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
        const [majorsData, professorsData] = await Promise.all([
          apiClient.getAllMajors(token),
          apiClient.getAllProfessors(token),
        ])
        const majorsList = Array.isArray(majorsData) ? majorsData : []
        const professorsList = Array.isArray(professorsData) ? professorsData : []
        if (!cancelled) {
          setMajors(majorsList.map((m: Major) => ({ id: m.id, name: m.name })))
          setProfessors(
            professorsList.map((p: Professor) => ({
              id: p.id,
              name: `${p.first_name} ${p.last_name}`,
            }))
          )
          if (presetMajorId && majorsList.some((m: Major) => m.id === presetMajorId)) {
            setMajorId(presetMajorId)
          }
        }
      } catch (e) {
        console.error("Failed to load data:", e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => {
      cancelled = true
    }
  }, [token, presetMajorId])

  const isValid = name.trim().length > 0 && majorId.trim().length > 0

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!isValid || !token) return

    setIsSubmitting(true)
    try {
      const payload: {
        name: string
        major_id: string
        year?: number
        semester?: number
        professor_ids?: string[]
      } = {
        name: name.trim(),
        major_id: majorId.trim(),
      }
      const yearNum = parseInt(year, 10)
      const semesterNum = parseInt(semester, 10)
      if (!Number.isNaN(yearNum)) payload.year = yearNum
      if (!Number.isNaN(semesterNum) && (semesterNum === 1 || semesterNum === 2)) payload.semester = semesterNum
      if (professorIds.length > 0) payload.professor_ids = professorIds

      await apiClient.createCourse(payload, token)
      router.push("/dashboard/admin/subjects")
    } catch (err) {
      console.error("Failed to create subject:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <EntityFormPage
        title="Create Subject"
        description="Add a new course subject"
        mainTitle="Subject Details"
        submitLabel="Create Subject"
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
      title="Create Subject"
      description="Add a new course subject"
      mainTitle="Subject Details"
      submitLabel="Create Subject"
      submittingLabel="Creating…"
      submitDisabled={!isValid || isSubmitting}
      onSubmit={handleSubmit}
      guidelines={[
        { title: "Subject name", text: "Enter the full name of the course (e.g. Introduction to Programming)." },
        { title: "Major", text: "Choose the major this subject belongs to." },
        { title: "Year", text: "Optional. The year of study (1–6) when this subject is typically taken." },
        { title: "Semester", text: "First or second semester of the year." },
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
          semester={semester}
          onSemesterChange={setSemester}
          professorIds={professorIds}
          onProfessorIdsChange={setProfessorIds}
          professors={professors}
          submitLabel="Create Subject"
          submitDisabled={!isValid || isSubmitting}
          isSubmitting={isSubmitting}
          onCancel={() => router.push("/dashboard/admin/subjects")}
        />
      </form>
    </EntityFormPage>
  )
}
