"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await apiClient.login({ email, password })
      login(response.user, response.token)
      
      // Navigate directly to the appropriate dashboard based on user type
      // This avoids the /dashboard page needing to check auth state
      const userType = response.user.user_type
      let dashboardPath = "/dashboard"
      
      switch (userType) {
        case "STUDENT":
          dashboardPath = "/dashboard/student"
          break
        case "PROFESSOR":
          dashboardPath = "/dashboard/professor"
          break
        case "EMPLOYER":
          dashboardPath = "/dashboard/employer"
          break
        case "CANDIDATE":
          dashboardPath = "/dashboard/candidate"
          break
        case "ADMIN":
        case "ADMINISTRATOR":
        case "STUDENTSKA_SLUZBA":
          dashboardPath = "/dashboard/admin"
          break
        default:
          dashboardPath = "/dashboard/student"
      }
      
      // Use replace to avoid back button issues
      router.replace(dashboardPath)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top bar */}
      <header className="border-b border-gray-200 px-6 py-4">
        <Link href="/login" className="text-xl font-bold text-primary tracking-tight">
          euprava
        </Link>
      </header>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Log in</h1>
          <p className="text-sm text-gray-500 mb-6">Welcome back. Enter your details below.</p>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-11 border-gray-300 focus:border-primary focus:ring-primary"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="h-11 border-gray-300 focus:border-primary focus:ring-primary"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Log in"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-primary font-medium hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
