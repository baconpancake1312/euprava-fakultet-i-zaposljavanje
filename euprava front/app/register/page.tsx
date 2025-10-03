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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GraduationCap, Loader2 } from "lucide-react"
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await apiClient.register(formData)
      
      // Set profile creation flags based on user type
      const userWithFlags = {
        ...response.user,
        employment_profile_created: false,
        university_profile_created: false,
      }

      // Set the appropriate flag based on user type
      if (formData.user_type === "EMPLOYER" || formData.user_type === "CANDIDATE") {
        userWithFlags.employment_profile_created = false // Will be set to true when they complete their profile
      }
      if (formData.user_type === "STUDENT" || formData.user_type === "PROFESSOR") {
        userWithFlags.university_profile_created = false // Will be set to true when they complete their profile
      }

      login(userWithFlags, response.token)
      router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6 my-8">
        <div className="flex flex-col items-center gap-2">
          <Link href="/" className="flex items-center gap-2 mb-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="text-xl font-semibold">euprava</span>
          </Link>
          <h1 className="text-2xl font-bold">Create an account</h1>
          <p className="text-muted-foreground text-center">
            Join our platform to access university and employment services
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign up</CardTitle>
            <CardDescription>Fill in your information to create your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    placeholder="John"
                    value={formData.first_name}
                    onChange={(e) => updateField("first_name", e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    placeholder="Doe"
                    value={formData.last_name}
                    onChange={(e) => updateField("last_name", e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  required
                  minLength={8}
                  disabled={loading}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1234567890"
                    value={formData.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jmbg">JMBG</Label>
                  <Input
                    id="jmbg"
                    placeholder="1234567890123"
                    value={formData.jmbg}
                    onChange={(e) => updateField("jmbg", e.target.value)}
                    required
                    maxLength={13}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="123 Main St, City"
                  value={formData.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => updateField("date_of_birth", e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user_type">Account Type</Label>
                  <Select
                    value={formData.user_type}
                    onValueChange={(value) => updateField("user_type", value)}
                    required
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STUDENT">Student</SelectItem>
                      <SelectItem value="PROFESSOR">Professor</SelectItem>
                      <SelectItem value="EMPLOYER">Employer</SelectItem>
                      <SelectItem value="CANDIDATE">Job Candidate</SelectItem>
                      <SelectItem value="ADMIN">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
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
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
