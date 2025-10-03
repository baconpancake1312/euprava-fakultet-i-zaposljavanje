"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Building2 } from "lucide-react"

export default function CompanyProfilePage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [formData, setFormData] = useState({
    firm_name: "",
    pib: "",
    maticni_broj: "",
    delatnost: "",
    firm_address: "",
    firm_phone: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
      return
    }

    // Simulate loading company data
    setFormData({
      firm_name: "Tech Solutions Inc.",
      pib: "123456789",
      maticni_broj: "12345678",
      delatnost: "Software development and IT consulting",
      firm_address: "123 Business St, City",
      firm_phone: "+1234567890",
    })
  }, [isAuthenticated, isLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(false)
    setLoading(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update company profile")
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout title="Company Profile">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Company Profile">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8" />
          <div>
            <h2 className="text-2xl font-bold">Company Profile</h2>
            <p className="text-muted-foreground">Manage your company information</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>Update your company details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert>
                  <AlertDescription>Company profile updated successfully!</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="firm_name">Company Name</Label>
                <Input
                  id="firm_name"
                  value={formData.firm_name}
                  onChange={(e) => setFormData({ ...formData, firm_name: e.target.value })}
                  disabled={loading}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pib">PIB (Tax ID)</Label>
                  <Input
                    id="pib"
                    value={formData.pib}
                    onChange={(e) => setFormData({ ...formData, pib: e.target.value })}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maticni_broj">Registration Number</Label>
                  <Input
                    id="maticni_broj"
                    value={formData.maticni_broj}
                    onChange={(e) => setFormData({ ...formData, maticni_broj: e.target.value })}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delatnost">Business Activity</Label>
                <Textarea
                  id="delatnost"
                  value={formData.delatnost}
                  onChange={(e) => setFormData({ ...formData, delatnost: e.target.value })}
                  disabled={loading}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="firm_address">Company Address</Label>
                <Input
                  id="firm_address"
                  value={formData.firm_address}
                  onChange={(e) => setFormData({ ...formData, firm_address: e.target.value })}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="firm_phone">Company Phone</Label>
                <Input
                  id="firm_phone"
                  type="tel"
                  value={formData.firm_phone}
                  onChange={(e) => setFormData({ ...formData, firm_phone: e.target.value })}
                  disabled={loading}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
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
