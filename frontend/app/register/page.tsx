"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import type { UserType } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import Link from "next/link"

export default function RegisterPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    date_of_birth: "",
    jmbg: "",
    user_type: "" as UserType,
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const formatDateToISO = (dateString: string): string => {
    if (!dateString) return ""
    const date = new Date(dateString + "T12:00:00.000Z")
    return date.toISOString()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const dateOfBirth = formData.date_of_birth ? formatDateToISO(formData.date_of_birth) : ""
      const payload = { ...formData, date_of_birth: dateOfBirth }
      console.log("Registration payload:", payload)
      const response = await apiClient.register(payload)
      login(response.user, response.token)
      router.push("/dashboard")
    } catch (err) {
      console.error("Registration error:", err)
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
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
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Create an account</h1>
          <p className="text-sm text-gray-500 mb-6">Fill in your details to get started.</p>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="first_name" className="text-sm font-medium text-gray-700">
                  First name
                </Label>
                <Input
                  id="first_name"
                  placeholder="John"
                  value={formData.first_name}
                  onChange={(e) => updateField("first_name", e.target.value)}
                  required
                  disabled={loading}
                  className="h-11 border-gray-300"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="last_name" className="text-sm font-medium text-gray-700">
                  Last name
                </Label>
                <Input
                  id="last_name"
                  placeholder="Doe"
                  value={formData.last_name}
                  onChange={(e) => updateField("last_name", e.target.value)}
                  required
                  disabled={loading}
                  className="h-11 border-gray-300"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
                required
                disabled={loading}
                className="h-11 border-gray-300"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimum 8 characters"
                value={formData.password}
                onChange={(e) => updateField("password", e.target.value)}
                required
                minLength={8}
                disabled={loading}
                className="h-11 border-gray-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                  Phone
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+381..."
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  required
                  disabled={loading}
                  className="h-11 border-gray-300"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="jmbg" className="text-sm font-medium text-gray-700">
                  JMBG
                </Label>
                <Input
                  id="jmbg"
                  placeholder="1234567890123"
                  value={formData.jmbg}
                  onChange={(e) => updateField("jmbg", e.target.value)}
                  required
                  maxLength={13}
                  disabled={loading}
                  className="h-11 border-gray-300"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="address" className="text-sm font-medium text-gray-700">
                Address
              </Label>
              <Input
                id="address"
                placeholder="123 Main St, City"
                value={formData.address}
                onChange={(e) => updateField("address", e.target.value)}
                required
                disabled={loading}
                className="h-11 border-gray-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="date_of_birth" className="text-sm font-medium text-gray-700">
                  Date of birth
                </Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => updateField("date_of_birth", e.target.value)}
                  required
                  disabled={loading}
                  className="h-11 border-gray-300"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="user_type" className="text-sm font-medium text-gray-700">
                  Account type
                </Label>
                <Select
                  value={formData.user_type}
                  onValueChange={(value) => updateField("user_type", value)}
                  disabled={loading}
                >
                  <SelectTrigger className="h-11 border-gray-300">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STUDENT">Student</SelectItem>
                    <SelectItem value="PROFESSOR">Professor</SelectItem>
                    <SelectItem value="EMPLOYER">Employer</SelectItem>
                    <SelectItem value="CANDIDATE">Job Candidate</SelectItem>
                    <SelectItem value="ADMINISTRATOR">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg mt-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-medium hover:underline">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
