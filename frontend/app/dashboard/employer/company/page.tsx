"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
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
  const { isAuthenticated, isLoading, user, token } = useAuth()
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    website: "",
    industry: "",
    size: "",
    founded: "",
    logo: "",
    address: "",
    phone: "",
    email: "",
    pib: "",
    maticni_broj: "",
  })
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
      return
    }

    const loadCompanyData = async () => {
      if (!token || !user?.id) {
        setDataLoading(false)
        return
      }

      setDataLoading(true)
      try {
        // First try to load company profile
        try {
          const company = await apiClient.getCompanyByEmployer(user.id, token)
          setFormData({
            name: company.name || "",
            description: company.description || "",
            website: company.website || "",
            industry: company.industry || "",
            size: company.size || "",
            founded: company.founded?.toString() || "",
            logo: company.logo || "",
            address: company.address || "",
            phone: company.phone || "",
            email: company.email || "",
            pib: company.pib || "",
            maticni_broj: company.maticni_broj || "",
          })
        } catch (companyErr) {
          // If company doesn't exist, load from employer data
          console.log("Company not found, loading employer data:", companyErr)
          try {
            const employer = await apiClient.getEmployerById(user.id, token)
            setFormData({
              name: employer.firm_name || "",
              description: employer.delatnost || "",
              website: "",
              industry: "",
              size: "",
              founded: "",
              logo: "",
              address: employer.firm_address || "",
              phone: employer.firm_phone || "",
              email: employer.email || user?.email || "",
              pib: employer.pib || "",
              maticni_broj: employer.maticni_broj || "",
            })
          } catch (employerErr) {
            console.error("Failed to load employer data:", employerErr)
            // Don't set error here, just leave fields empty
          }
        }
      } catch (err) {
        console.error("Failed to load company/employer data:", err)
        setError("Failed to load company data. Please refresh the page.")
      } finally {
        setDataLoading(false)
      }
    }

    loadCompanyData()
  }, [isAuthenticated, isLoading, router, token, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(false)
    setLoading(true)

    try {
      if (!token || !user?.id) throw new Error("Not authenticated")

      // First try to get the company to update it
      try {
        const company = await apiClient.getCompanyByEmployer(user.id, token)
        await apiClient.updateCompany(company.id, formData, token)
      } catch (companyErr) {
        // If company doesn't exist, update employer data instead
        await apiClient.updateEmployer(user.id, {
          firm_name: formData.name,
          pib: formData.pib,
          maticni_broj: formData.maticni_broj,
          delatnost: formData.description,
          firm_address: formData.address,
          firm_phone: formData.phone,
        }, token)
      }
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update company profile")
    } finally {
      setLoading(false)
    }
  }

  if (isLoading || dataLoading) {
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
                <Label htmlFor="name">Company Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                <Label htmlFor="description">Company Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={loading}
                  rows={3}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="size">Company Size</Label>
                  <Input
                    id="size"
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="founded">Founded Year</Label>
                  <Input
                    id="founded"
                    type="number"
                    value={formData.founded}
                    onChange={(e) => setFormData({ ...formData, founded: e.target.value })}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Company Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  disabled={loading}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Company Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Company Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={loading}
                  />
                </div>
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
