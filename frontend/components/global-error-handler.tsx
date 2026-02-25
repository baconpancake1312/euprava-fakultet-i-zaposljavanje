"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "./auth-context"
import { toast } from "@/hooks/use-toast"

/**
 * Global error handler component
 * Listens for API errors and handles token expiration
 */
export function GlobalErrorHandler({ children }: { children: React.ReactNode }) {
  const { token, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Handle unhandled promise rejections (API errors)
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason
      
      // Check for authentication errors
      if (error?.status === 401 || error?.message?.includes("token is not active")) {
        console.error("Token validation failed, logging out...")
        
        toast({
          title: "Session Expired",
          description: "Your session has expired. Please log in again.",
          variant: "destructive",
        })

        logout()
        router.push("/login")
        event.preventDefault()
      }
    }

    window.addEventListener("unhandledrejection", handleUnhandledRejection)
    
    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
    }
  }, [logout, router])

  return <>{children}</>
}
