"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { MajorFields } from "./majorFields"
import { EntityFormPage } from "@/components/entity/entityFormPage"
import type { Subject } from "@/lib/types"

interface DepartmentOption {
    id: string
    name: string
}

export default function CreateMajorPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { token } = useAuth()
    const presetDepartmentId = searchParams.get("department_id") ?? ""

    const [name, setName] = useState("")
    const [departmentId, setDepartmentId] = useState(presetDepartmentId)
    const [subjectIds, setSubjectIds] = useState<string[]>([])
    const [departments, setDepartments] = useState<DepartmentOption[]>([])
    const [subjects, setSubjects] = useState<Subject[]>([])
    const [loading, setLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        const t = token
        if (!t) {
            setLoading(false)
            return
        }
        const authToken: string = t
        let cancelled = false
        async function fetchData() {
            try {
                const [deptData, subjectsData] = await Promise.all([
                    apiClient.getAllDepartments(authToken),
                    apiClient.getAllSubjects(authToken),
                ])
                const deptList = Array.isArray(deptData) ? deptData : []
                const subjList = Array.isArray(subjectsData) ? subjectsData : []
                if (!cancelled) {
                    setDepartments(
                        deptList.map((d: { id: string; name: string }) => ({
                            id: d.id,
                            name: d.name,
                        }))
                    )
                    setSubjects(subjList)
                    if (presetDepartmentId && deptList.some((d: { id: string }) => d.id === presetDepartmentId)) {
                        setDepartmentId(presetDepartmentId)
                    }
                }
            } catch (e) {
                console.error("Failed to load departments/subjects:", e)
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        fetchData()
        return () => {
            cancelled = true
        }
    }, [token, presetDepartmentId])

    const isValid = name.trim().length > 0 && departmentId.trim().length > 0

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!isValid || !token) return

        setIsSubmitting(true)
        try {
            const payload = {
                name: name.trim(),
                department_id: departmentId.trim(),
            }
            const created = await apiClient.createMajor(payload, token)
            const newMajorId = created?.id ?? created?._id
            if (newMajorId && subjectIds.length > 0) {
                for (const subjectId of subjectIds) {
                    const subject = await apiClient.getCourseById(subjectId, token)
                    await apiClient.updateCourse(
                        subjectId,
                        { ...subject, major_id: newMajorId },
                        token
                    )
                }
            }
            router.push("/dashboard/admin/subjects")
        } catch (err) {
            console.error("Failed to create major:", err)
        } finally {
            setIsSubmitting(false)
        }
    }

    if (loading) {
        return (
            <EntityFormPage
                title="Create Major"
                description="Set up a new major"
                mainTitle="Major Details"
                submitLabel="Create Major"
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
            title="Create Major"
            description="Set up a new major"
            mainTitle="Major Details"
            submitLabel="Create Major"
            submittingLabel="Creating…"
            submitDisabled={!isValid || isSubmitting}
            onSubmit={handleSubmit}
            guidelines={[
                {
                    title: "Major name",
                    text: "Enter the full name of the study program (e.g. Computer Science).",
                },
                {
                    title: "Department",
                    text: "Choose the department that offers this major.",
                },
                {
                    title: "Subjects",
                    text: "Select the subjects that belong to this major.",
                },
            ]}
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <MajorFields
                    majorName={name}
                    onMajorNameChange={setName}
                    departmentId={departmentId}
                    onDepartmentIdChange={setDepartmentId}
                    departments={departments}
                    subjectIds={subjectIds}
                    onSubjectIdsChange={setSubjectIds}
                    subjects={subjects}
                    submitLabel="Create Major"
                    submitDisabled={!isValid || isSubmitting}
                    isSubmitting={isSubmitting}
                    onCancel={() => router.push("/dashboard/admin/subjects")}
                />
            </form>
        </EntityFormPage>
    )
}
