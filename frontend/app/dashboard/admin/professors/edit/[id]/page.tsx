"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { EntityFormPage } from "@/components/entity/entityFormPage"
import { ProfessorEditFields } from "./professorFields"
import type { Professor, Subject } from "@/lib/types"

type Department = {
  id: string
  name: string
  head?: string
  majors?: Array<{ id: string }>
  major_ids?: string[]
  staff?: string[]
}

export default function EditProfessorPage() {
  const router = useRouter()
  const params = useParams()
  const professorId = params.id as string

  const { token } = useAuth()

  const [professor, setProfessor] = useState<Professor | null>(null)
  const [profile, setProfile] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address: "",
    date_of_birth: "",
    jmbg: "",
  })
  const [departments, setDepartments] = useState<Department[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [departmentIds, setDepartmentIds] = useState<string[]>([])
  const [subjectIds, setSubjectIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!token || !professorId) return

    const authToken: string = token

    let cancelled = false

    async function loadData() {
      try {
        const [prof, deptData, subjectData] = await Promise.all([
          apiClient.getProfessorById(professorId, authToken),
          apiClient.getAllDepartments(authToken),
          apiClient.getAllSubjects(authToken),
        ])

        if (cancelled) return

        setProfessor(prof)
        
        const formatISOToDateInput = (isoString: string): string => {
          if (!isoString) return ""
          try {
            const date = new Date(isoString)
            return date.toISOString().split("T")[0]
          } catch {
            return isoString
          }
        }
        
        const rawDateOfBirth = (prof as any).date_of_birth ?? ""
        setProfile({
          first_name: prof.first_name ?? "",
          last_name: prof.last_name ?? "",
          email: prof.email ?? "",
          phone: prof.phone ?? "",
          address: (prof as any).address ?? "",
          date_of_birth: formatISOToDateInput(rawDateOfBirth),
          jmbg: (prof as any).jmbg ?? "",
        })

        const deptList: Department[] = Array.isArray(deptData) ? deptData : []
        setDepartments(deptList)

        const allSubjects: Subject[] = Array.isArray(subjectData) ? subjectData : []
        setSubjects(allSubjects)

        const initialDeptIds =
          prof && deptList.length
            ? deptList
                .filter((d: any) => Array.isArray(d.staff) && d.staff.includes(prof.id))
                .map((d) => d.id)
            : []
        setDepartmentIds(initialDeptIds)

        // Extract subjects where this professor is assigned
        // Handle both new array format (professor_ids) and old single ID format (professor_id)
        const initialSubjectIds =
          prof && allSubjects.length
            ? allSubjects
                .filter((s: any) => {
                  const professorIds = s.professor_ids || s.professorids || 
                    (s.professor_id ? [s.professor_id] : [])
                  return Array.isArray(professorIds) && professorIds.includes(prof.id)
                })
                .map((s) => s.id)
            : []
        setSubjectIds(initialSubjectIds)
      } catch (e) {
        console.error("Failed to load professor data:", e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [token, professorId])

  const isValid =
    !!professor &&
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

  const formatISOToDateInput = (isoString: string): string => {
    if (!isoString) return ""
    try {
      const date = new Date(isoString)
      return date.toISOString().split("T")[0]
    } catch {
      return isoString
    }
  }

  const handleProfileChange = (field: string, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!token || !professor || !isValid) return

    setIsSubmitting(true)
    try {
      const formattedDateOfBirth = formatDateToISO(profile.date_of_birth)
      
      // Update core user profile in auth service
      await apiClient.updateUserInfo(
        professor.id,
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

      // Include selected subjects so the backend doesn't overwrite with empty list.
      // Backend does full $set of professor; omitting subjects would clear them.
      const selectedSubjectObjects = subjects.filter((s) => subjectIds.includes(s.id))
      await apiClient.updateProfessor(
        professor.id,
        {
          first_name: profile.first_name.trim(),
          last_name: profile.last_name.trim(),
          email: profile.email.trim(),
          phone: profile.phone.trim(),
          address: profile.address.trim(),
          date_of_birth: formattedDateOfBirth,
          jmbg: profile.jmbg.trim(),
          subjects: selectedSubjectObjects,
        },
        token
      )
      const selectedDeptIds = new Set(departmentIds)

      // Update departments staff membership
      for (const dept of departments) {
        const currentStaff: string[] = Array.isArray((dept as any).staff)
          ? [...(dept as any).staff]
          : []
        const hasProfessor = currentStaff.includes(professor.id)
        const shouldHaveProfessor = selectedDeptIds.has(dept.id)

        if (hasProfessor === shouldHaveProfessor) continue

        let updatedStaff = currentStaff
        if (shouldHaveProfessor && !hasProfessor) {
          updatedStaff = [...currentStaff, professor.id]
        } else if (!shouldHaveProfessor && hasProfessor) {
          updatedStaff = currentStaff.filter((id) => id !== professor.id)
        }

        const majorIds =
          Array.isArray((dept as any).majors) && (dept as any).majors.length
            ? (dept as any).majors.map((m: any) => m.id)
            : Array.isArray((dept as any).major_ids)
            ? (dept as any).major_ids
            : []

        const payload = {
          name: (dept as any).name,
          head: (dept as any).head ?? null,
          major_ids: majorIds,
          staff: updatedStaff,
        }

        await apiClient.updateDepartment(dept.id, payload, token)
      }

      // Subject assignments are synced by the backend when we call updateProfessor with subjects above.

      router.push("/dashboard/admin/professors")
    } catch (err) {
      console.error("Failed to update professor assignments:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading || !professor) {
    return (
      <EntityFormPage
        title="Edit Professor"
        description="Edit professor departments and subjects"
        mainTitle="Professor Details"
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
      title="Edit Professor"
      description="Edit professor profile, departments and subjects"
      mainTitle="Professor Details"
      submitLabel="Save Changes"
      submittingLabel="Saving…"
      submitDisabled={!isValid || isSubmitting}
      onSubmit={handleSubmit}
      guidelines={[
        {
          title: "Profile",
          text: "Update basic personal and contact information for the professor.",
        },
        {
          title: "Departments",
          text: "Select the departments where this professor works.",
        },
        {
          title: "Subjects",
          text: "Assign the subjects that this professor teaches.",
        },
      ]}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <ProfessorEditFields
          professor={professor}
          firstName={profile.first_name}
          lastName={profile.last_name}
          email={profile.email}
          phone={profile.phone}
          address={profile.address}
          dateOfBirth={profile.date_of_birth}
          jmbg={profile.jmbg}
          onProfileChange={handleProfileChange}
          departments={departments}
          departmentIds={departmentIds}
          onDepartmentIdsChange={setDepartmentIds}
          subjects={subjects}
          subjectIds={subjectIds}
          onSubjectIdsChange={setSubjectIds}
          submitLabel="Save Changes"
          submitDisabled={!isValid || isSubmitting}
          isSubmitting={isSubmitting}
          onCancel={() => router.push("/dashboard/admin/professors")}
        />
      </form>
    </EntityFormPage>
  )
}

