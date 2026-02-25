/**
 * React hook for handling API errors with authentication
 * Automatically handles 401/403 errors by logging out the user
 */

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "./auth-context"
import { ApiErrorHandler, type ApiError } from "./error-handler"

export function useApiError() {
  const { logout } = useAuth()
  const router = useRouter()

  const handleError = (error: any) => {
    // Check if it's an authentication error
    if (ApiErrorHandler.isAuthError(error)) {
      logout()
      router.push("/login")
      return {
        message: "Your session has expired. Please log in again.",
        shouldLogout: true,
      }
    }

    // Extract error message
    const message =
      error?.message ||
      (error instanceof Error ? error.message : "An unexpected error occurred")

    return {
      message,
      shouldLogout: false,
    }
  }

  return { handleError }
}

/**
 * Wrapper function to catch and handle API errors
 */
export async function withErrorHandling<T>(
  apiCall: () => Promise<T>,
  onError?: (error: ApiError) => void
): Promise<T> {
  try {
    return await apiCall()
  } catch (error: any) {
    const apiError: ApiError = {
      message: error?.message || "An unexpected error occurred",
      status: error?.status,
      statusText: error?.statusText,
      data: error?.data,
    }

    if (onError) {
      onError(apiError)
    }

    throw apiError
  }
}
