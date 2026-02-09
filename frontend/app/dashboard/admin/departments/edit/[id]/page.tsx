"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DepartmentFields } from "./departmentFields"
import { EntityFormPage } from "@/components/entity/entityFormPage"
import type { Major, Professor } from "@/lib/types"

export default function EditDepartmentPage() {
    const router = useRouter()
    const params = useParams()
    const departmentId = params.id as string

    const { token } = useAuth()

    const [name, setName] = useState("")
    const [headId, setHeadId] = useState("")
    const [majorIds, setMajorIds] = useState<string[]>([])
    const [staffIds, setStaffIds] = useState<string[]>([])
    const [professors, setProfessors] = useState<Professor[]>([])
    const [majors, setMajors] = useState<Major[]>([])
    const [loading, setLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (!token || !departmentId) return

        let cancelled = false
        const authToken = token

        async function fetchData() {
            try {
                const [
                    department,
                    professorsData,
                    majorsData,
                ] = await Promise.all([
                    apiClient.getDepartmentById(departmentId, authToken),
                    apiClient.getAllProfessors(authToken),
                    apiClient.getAllMajors(authToken),
                ])

                if (cancelled) return

                // ---- populate form state ----
                setName(department.name ?? "")
                setHeadId(department.head ?? "")
                // API returns major_ids (array of IDs); some responses may use majors (array of objects)
                const initialMajorIds =
                  Array.isArray((department as { major_ids?: string[] }).major_ids)
                    ? (department as { major_ids: string[] }).major_ids.map((id) => String(id))
                    : (department.majors?.map((m: Major) => m.id) ?? [])
                setMajorIds(initialMajorIds)
                setStaffIds(department.staff ?? [])

                setProfessors(Array.isArray(professorsData) ? professorsData : [])
                setMajors(Array.isArray(majorsData) ? majorsData : [])
            } catch (e) {
                console.error("Failed to load department data:", e)
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        fetchData()

        return () => {
            cancelled = true
        }
    }, [token, departmentId])

    const isValid = name.trim().length > 0

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!isValid || !token) return

        setIsSubmitting(true)
        try {
            const payload = {
                name: name.trim(),
                head: headId || null,
                major_ids: majorIds,
                staff: staffIds,
            }

            await apiClient.updateDepartment(departmentId, payload, token)
            router.push("/dashboard/admin/subjects")
        } catch (err) {
            console.error("Failed to update department:", err)
        } finally {
            setIsSubmitting(false)
        }
    }

    if (loading) {
        return (
            <EntityFormPage
                title="Edit Department"
                description="Edit an existing department"
                mainTitle="Department Details"
                submitLabel="Edit Department"
                submitDisabled
                onSubmit={() => { }}
            >
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                    Loading…
                </div>
            </EntityFormPage>
        )
    }

    return (
        <EntityFormPage
            title="Edit Department"
            description="Edit an existing department"
            mainTitle="Department Details"
            submitLabel="Edit Department"
            submittingLabel="Editing…"
            submitDisabled={!isValid || isSubmitting}
            onSubmit={handleSubmit}
            guidelines={[
                {
                    title: "Department head",
                    text: "Choose a professor to lead the department.",
                },
                {
                    title: "Majors & staff",
                    text: "Select the majors offered and professors on staff.",
                },
            ]}
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <DepartmentFields
                    departmentName={name}
                    onDepartmentNameChange={setName}
                    headId={headId}
                    onHeadIdChange={setHeadId}
                    majorIds={majorIds}
                    onMajorIdsChange={setMajorIds}
                    staffIds={staffIds}
                    onStaffIdsChange={setStaffIds}
                    professors={professors}
                    majors={majors}
                    submitLabel="Edit Department"
                    submitDisabled={!isValid || isSubmitting}
                    isSubmitting={isSubmitting}
                    onCancel={() =>
                        router.push("/dashboard/admin/subjects")    
                    }
                />
            </form>
        </EntityFormPage>
    )
}
