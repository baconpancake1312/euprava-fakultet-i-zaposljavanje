"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "./auth-context"
import { toast } from "@/hooks/use-toast"

/**
 * Hook to handle API errors globally
 * Automatically logs out on 401/403 and shows user-friendly messages
 */
export function useApiErrorHandler() {
  const { logout } = useAuth()
  const router = useRouter()

  const handleApiError = (error: any, customMessage?: string) => {
    // Check for authentication errors
    if (error?.status === 401 || error?.status === 403) {
      console.error("Authentication error:", error)
      
      toast({
        title: "Session Expired",
        description: "Your session has expired. Please log in again.",
        variant: "destructive",
      })

      // Clear auth and redirect to login
      logout()
      setTimeout(() => {
        router.push("/login")
      }, 1000)
      
      return
    }

    // Show custom or default error message
    const message = customMessage || error?.message || "An unexpected error occurred"
    
    toast({
      title: "Error",
      description: message,
      variant: "destructive",
    })
  }

  return { handleApiError }
}

/**
 * Wrapper to execute API calls with automatic error handling
 * Usage: await withApiErrorHandling(() => apiClient.someMethod(...))
 */
export async function withApiErrorHandling<T>(
  apiCall: () => Promise<T>,
  errorMessage?: string
): Promise<T | null> {
  try {
    return await apiCall()
  } catch (error: any) {
    // Check if it's a token expiration error
    if (error?.status === 401 || error?.status === 403) {
      console.error("Token expired or unauthorized:", error)
      // Let the component handle logout via useApiErrorHandler
      throw error
    }
    
    // Log other errors
    console.error("API call failed:", error)
    throw error
  }
}
