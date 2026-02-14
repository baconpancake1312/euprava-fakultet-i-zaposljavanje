"use client"

import { useRouter } from "next/navigation"

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Children } from "react"
import { DashboardLayout } from "../dashboard-layout"


type Guideline = {
    title: string
    text: string
}

type EntityFormPageProps = {
    /** Page header */
    title: string
    description?: string

    /** Optional back action */
    onBack?: () => void
    backLabel?: string

    /** Main card */
    mainTitle: string
    mainDescription?: string

    /** Form */
    onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void
    submitLabel?: string
    submittingLabel?: React.ReactNode
    submitDisabled?: boolean

    /** Sidebar */
    guidelines?: Guideline[]

    /** Mode */
    mode?: "create" | "edit" | "view"

    children: React.ReactNode
}

export function EntityFormPage({
    title,
    description,

    onBack,
    backLabel = "Back",

    mainTitle,
    mainDescription,

    onSubmit,
    submitLabel = "Save",
    submittingLabel = "Saving…",
    submitDisabled = false,

    guidelines,

    mode = "create",

    children,
}: EntityFormPageProps) {
    const router = useRouter()

    const handleBack = onBack ?? (() => router.back())
    const isViewMode = mode === "view"
    return (
        <div>
            <DashboardLayout title={title}>{children}
            </DashboardLayout>
        </div>
    )
}
