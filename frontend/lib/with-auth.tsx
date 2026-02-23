"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Loader2 } from "lucide-react"

interface WithAuthOptions {
  requiredUserTypes?: string[]
  redirectTo?: string
}

export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: WithAuthOptions = {}
) {
  const { requiredUserTypes, redirectTo = "/login" } = options

  return function AuthenticatedComponent(props: P) {
    const router = useRouter()
    const { user, isAuthenticated, isLoading } = useAuth()

    useEffect(() => {
      if (isLoading) return

      if (!isAuthenticated) {
        router.push(redirectTo)
        return
      }

      if (requiredUserTypes && user && !requiredUserTypes.includes(user.user_type)) {
        // Redirect to appropriate dashboard based on user type
        switch (user.user_type) {
          case "EMPLOYER":
            router.push("/dashboard/employer")
            break
          case "CANDIDATE":
            router.push("/dashboard/candidate")
            break
          case "STUDENT":
            router.push("/dashboard/student")
            break
          case "PROFESSOR":
            router.push("/dashboard/professor")
            break
          case "ADMIN":
          case "ADMINISTRATOR":
          case "STUDENTSKA_SLUZBA":
            router.push("/dashboard/admin")
            break
          default:
            router.push("/dashboard")
        }
        return
      }
    }, [isAuthenticated, isLoading, user, router, requiredUserTypes, redirectTo])

    if (isLoading) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      )
    }

    if (!isAuthenticated) {
      return null
    }

    if (requiredUserTypes && user && !requiredUserTypes.includes(user.user_type)) {
      return null
    }

    return <Component {...props} />
  }
}
