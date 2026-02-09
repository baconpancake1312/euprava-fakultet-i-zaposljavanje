"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { MajorFields } from "./majorFields"
import { EntityFormPage } from "@/components/entity/entityFormPage"
import type { Subject } from "@/lib/types"

interface DepartmentOption {
    id: string
    name: string
}

export default function EditMajorPage() {
    const router = useRouter()
    const params = useParams()
    const majorId = params.id as string

    const { token } = useAuth()
    const initialSubjectIdsRef = useRef<string[]>([])

    const [name, setName] = useState("")
    const [departmentId, setDepartmentId] = useState("")
    const [subjectIds, setSubjectIds] = useState<string[]>([])
    const [departments, setDepartments] = useState<DepartmentOption[]>([])
    const [subjects, setSubjects] = useState<Subject[]>([])
    const [loading, setLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (!token || !majorId) return

        let cancelled = false
        const authToken = token

        async function fetchData() {
            try {
                const [major, deptData, subjectsData] = await Promise.all([
                    apiClient.getMajorById(majorId, authToken),
                    apiClient.getAllDepartments(authToken),
                    apiClient.getAllSubjects(authToken),
                ])

                if (cancelled) return

                setName(major.name ?? "")
                setDepartmentId(major.department_id ?? "")

                const currentSubjects = major.courses ?? major.subjects ?? []
                const ids = Array.isArray(currentSubjects)
                    ? currentSubjects.map((s: Subject) => s.id)
                    : []
                setSubjectIds(ids)
                initialSubjectIdsRef.current = ids

                const deptList = Array.isArray(deptData) ? deptData : []
                setDepartments(
                    deptList.map((d: { id: string; name: string }) => ({
                        id: d.id,
                        name: d.name,
                    }))
                )
                setSubjects(Array.isArray(subjectsData) ? subjectsData : [])
            } catch (e) {
                console.error("Failed to load major data:", e)
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        fetchData()

        return () => {
            cancelled = true
        }
    }, [token, majorId])

    const isValid = name.trim().length > 0 && departmentId.trim().length > 0

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!isValid || !token) return

        setIsSubmitting(true)
        try {
            await apiClient.updateMajor(
                majorId,
                { name: name.trim(), department_id: departmentId.trim() },
                token
            )

            const currentSubjectIds = new Set(subjectIds)
            const previousIds = initialSubjectIdsRef.current

            for (const subjectId of currentSubjectIds) {
                const subject = await apiClient.getCourseById(subjectId, token)
                await apiClient.updateCourse(
                    subjectId,
                    { ...subject, major_id: majorId },
                    token
                )
            }

            for (const subjectId of previousIds) {
                if (currentSubjectIds.has(subjectId)) continue
                const subject = await apiClient.getCourseById(subjectId, token)
                await apiClient.updateCourse(
                    subjectId,
                    { ...subject, major_id: "" },
                    token
                )
            }

            router.push("/dashboard/admin/subjects")
        } catch (err) {
            console.error("Failed to update major:", err)
        } finally {
            setIsSubmitting(false)
        }
    }

    if (loading) {
        return (
            <EntityFormPage
                title="Edit Major"
                description="Edit an existing major"
                mainTitle="Major Details"
                submitLabel="Save Major"
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
            title="Edit Major"
            description="Edit an existing major"
            mainTitle="Major Details"
            submitLabel="Save Major"
            submittingLabel="Saving…"
            submitDisabled={!isValid || isSubmitting}
            onSubmit={handleSubmit}
            guidelines={[
                {
                    title: "Major name",
                    text: "Enter the full name of the study program.",
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
                    submitLabel="Save Major"
                    submitDisabled={!isValid || isSubmitting}
                    isSubmitting={isSubmitting}
                    onCancel={() => router.push("/dashboard/admin/subjects")}
                />
            </form>
        </EntityFormPage>
    )
}
