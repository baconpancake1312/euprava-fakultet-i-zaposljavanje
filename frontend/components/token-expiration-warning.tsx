"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"

/**
 * Component that shows a warning when token is about to expire
 */
export function TokenExpirationWarning() {
  const { token, logout } = useAuth()
  const router = useRouter()
  const [showWarning, setShowWarning] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  useEffect(() => {
    if (!token) {
      setShowWarning(false)
      return
    }

    const checkTokenExpiration = () => {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        const expirationTime = payload.exp * 1000
        const now = Date.now()
        const timeRemaining = expirationTime - now

        // Show warning if less than 30 minutes remaining (for long-lived tokens)
        // This prevents showing warnings too early for 24-hour tokens
        if (timeRemaining > 0 && timeRemaining < 30 * 60 * 1000) {
          setShowWarning(true)
          setTimeLeft(Math.floor(timeRemaining / 1000))
        } else if (timeRemaining <= 0) {
          // Token has expired
          handleTokenExpired()
        } else {
          setShowWarning(false)
        }
      } catch (error) {
        console.error("Error checking token expiration:", error)
      }
    }

    const handleTokenExpired = () => {
      logout()
      router.push("/login")
    }

    // Check immediately
    checkTokenExpiration()

    // Check every 30 seconds
    const interval = setInterval(checkTokenExpiration, 30000)

    return () => clearInterval(interval)
  }, [token, logout, router])

  if (!showWarning || !timeLeft) return null

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md animate-slideIn">
      <Alert variant="destructive" className="border-yellow-500/50 bg-yellow-500/10">
        <AlertCircle className="h-4 w-4 text-yellow-500" />
        <AlertTitle className="text-yellow-500">Session Expiring Soon</AlertTitle>
        <AlertDescription className="mt-2 space-y-3">
          <p className="text-sm text-muted-foreground">
            Your session will expire in <span className="font-semibold text-yellow-500">{minutes}m {seconds}s</span>.
            Please save your work and log in again to continue.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => {
              logout()
              router.push("/login")
            }}
          >
            Log In Again
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  )
}
