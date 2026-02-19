"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

export default function CompleteEmployerProfile() {
  const router = useRouter()
  const { user, token, isLoading: authLoading, isAuthenticated } = useAuth()
  const [formData, setFormData] = useState({
    firm_name: "",
    pib: "",
    maticni_broj: "",
    delatnost: "",
    firm_address: "",
    firm_phone: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [checkingExisting, setCheckingExisting] = useState(true)

  useEffect(() => {
    const checkExistingProfile = async () => {
      if (authLoading) return

      if (!isAuthenticated || !token || !user) {
        setCheckingExisting(false)
        setError("Please log in to complete your profile")
        return
      }

      try {
        // Check if employer profile already exists
        const employer = await apiClient.getEmployerByUserId(user.id, token)
        if (employer && employer.id) {
          // Profile already exists, redirect to dashboard
          router.push("/dashboard/employer")
        }
      } catch (err) {
        // No existing profile found, that's okay - let them create one
        console.log("No existing employer profile found")
      } finally {
        setCheckingExisting(false)
      }
    }

    checkExistingProfile()
  }, [authLoading, isAuthenticated, token, user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (!token || !user?.id) throw new Error("Not authenticated")

      const data = {
        user_id: user.id,
        email: user.email,
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        ...formData,
        approval_status: "pending",
      }

      console.log("Creating employer profile:", data)
      await apiClient.createEmployer(data, token)
      
      router.push("/dashboard/employer")
    } catch (err) {
      console.error("Error creating employer profile:", err)
      setError(err instanceof Error ? err.message : "Failed to create employer profile")
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Show loading while auth loads
  if (authLoading || checkingExisting) {
    return (
      <DashboardLayout title="Complete Employer Profile">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  // Show error if not authenticated
  if (!isAuthenticated || !token || !user) {
    return (
      <DashboardLayout title="Complete Employer Profile">
        <div className="max-w-2xl mx-auto space-y-6">
          <Alert variant="destructive">
            <AlertDescription>Please log in to complete your employer profile</AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Complete Employer Profile">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Complete Your Employer Profile</h2>
          <p className="text-muted-foreground">Add your company information to be able to post job listings</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>Fill in your company details for verification</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="firm_name">Company Name *</Label>
                <Input
                  id="firm_name"
                  placeholder="My company name..."
                  value={formData.firm_name}
                  onChange={(e) => updateField("firm_name", e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pib">PIB *</Label>
                  <Input
                    id="pib"
                    placeholder="123456789"
                    value={formData.pib}
                    onChange={(e) => updateField("pib", e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maticni_broj">Registration Number *</Label>
                  <Input
                    id="maticni_broj"
                    placeholder="12345678"
                    value={formData.maticni_broj}
                    onChange={(e) => updateField("maticni_broj", e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delatnost">Business Description</Label>
                <Textarea
                  id="delatnost"
                  placeholder="Describe your business activity..."
                  value={formData.delatnost}
                  onChange={(e) => updateField("delatnost", e.target.value)}
                  required
                  disabled={loading}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="firm_address">Company Address *</Label>
                <Input
                  id="firm_address"
                  placeholder="123 Business St, City"
                  value={formData.firm_address}
                  onChange={(e) => updateField("firm_address", e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="firm_phone">Company Phone *</Label>
                <Input
                  id="firm_phone"
                  type="tel"
                  placeholder="+381234567890"
                  value={formData.firm_phone}
                  onChange={(e) => updateField("firm_phone", e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <Alert>
                <AlertDescription>
                  Your employer profile will be reviewed by administrators before you can post job listings.
                </AlertDescription>
              </Alert>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit for Review"
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
