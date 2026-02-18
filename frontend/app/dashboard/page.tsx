"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Loader2 } from "lucide-react"

export default function DashboardPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) {
      router.push("/login")
      return
    }

    // Redirect based on user type
    if (user) {
      switch (user.user_type) {
        case "STUDENT":
          router.push("/dashboard/student")
          break
        case "PROFESSOR":
          router.push("/dashboard/professor")
          break
        case "EMPLOYER":
          router.push("/dashboard/employer")
          break
        case "CANDIDATE":
          router.push("/dashboard/candidate")
          break
        case "ADMIN":
        case "STUDENTSKA_SLUZBA":
          router.push("/dashboard/admin")
          break
        default:
          router.push("/dashboard/student")
      }
    }
  }, [isAuthenticated, isLoading, user, router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading your dashboard...</p>
      </div>
    </div>
  )
}
