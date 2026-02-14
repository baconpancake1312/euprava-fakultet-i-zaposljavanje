import { DashboardLayout } from "@/components/dashboard-layout"
import { Loader2 } from "lucide-react"

export default function Loading() {
    return (
        <DashboardLayout title="My Courses">
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        </DashboardLayout>
    )
}
