"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DepartmentFields } from "./departmentFields"
import { EntityFormPage } from "@/components/entity/entityFormPage"
import type { Major, Professor } from "@/lib/types"

export default function CreateDepartmentPage() {
    const router = useRouter()
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
        const t = token
        if (!t) {
            setLoading(false)
            return
        }
        let cancelled = false
        const authToken: string = t
        async function fetchData() {
            try {
                const [professorsData, majorsData] = await Promise.all([
                    apiClient.getAllProfessors(authToken),
                    apiClient.getAllMajors(authToken),
                ])
                if (!cancelled) {
                    setProfessors(Array.isArray(professorsData) ? professorsData : [])
                    setMajors(Array.isArray(majorsData) ? majorsData : [])
                }
            } catch (e) {
                console.error("Failed to load professors/majors:", e)
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        fetchData()
        return () => {
            cancelled = true
        }
    }, [token])

    const isValid = name.trim().length > 0

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!isValid || !token) return

        setIsSubmitting(true)
        try {
            const payload = {
                name: name.trim(),
                head: headId,
                major_ids: majorIds,
                staff: staffIds,
            }
            await apiClient.createDepartment(payload, token)
            router.push("/dashboard/admin/subjects")
        } catch (err) {
            console.error("Failed to create department:", err)
        } finally {
            setIsSubmitting(false)
        }
    }

    if (loading) {
        return (
            <EntityFormPage
                title="Create Department"
                description="Set up a new department"
                mainTitle="Department Details"
                submitLabel="Create Department"
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
            title="Create Department"
            description="Set up a new department"
            mainTitle="Department Details"
            submitLabel="Create Department"
            submittingLabel="Creating…"
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
                    submitLabel="Create Department"
                    submitDisabled={!isValid || isSubmitting}
                    isSubmitting={isSubmitting}
                    onCancel={() => router.push("/dashboard/admin/subjects")}
                />
            </form>
        </EntityFormPage>
    )
}
