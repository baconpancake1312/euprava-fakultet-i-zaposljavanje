"use client"

import type React from "react"

import { useEffect, useState, useCallback } from "react"
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
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  Building2,
  Pencil,
  X,
  Phone,
  Mail,
  MapPin,
  Globe,
  Factory,
  Users,
  CalendarDays,
  FileText,
  Hash,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react"

interface EmployerData {
  id: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  address?: string
  firm_name?: string
  pib?: string
  maticni_broj?: string
  delatnost?: string
  firm_address?: string
  firm_phone?: string
  approval_status?: string
}

interface CompanyData {
  id: string
  name?: string
  description?: string
  website?: string
  industry?: string
  size?: string
  founded?: number
  logo?: string
  address?: string
  phone?: string
  email?: string
  pib?: string
  maticni_broj?: string
}

export default function CompanyProfilePage() {
  const router = useRouter()
  const { isAuthenticated, isLoading, user, token } = useAuth()

  const [employer, setEmployer] = useState<EmployerData | null>(null)
  const [company, setCompany] = useState<CompanyData | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    website: "",
    industry: "",
    size: "",
    founded: "",
    address: "",
    phone: "",
    email: "",
    pib: "",
    maticni_broj: "",
  })

  const loadData = useCallback(async () => {
    if (!token || !user?.id) { setDataLoading(false); return }
    setDataLoading(true)
    setError("")
    try {
      // Resolve employer document (flat embed: _id = auth user id)
      const emp = await apiClient.getEmployerByUserId(user.id, token) as any
      setEmployer(emp)

      const employerId = emp.id || emp._id || user.id

      // Try to load company profile
      let comp: CompanyData | null = null
      try {
        comp = await apiClient.getCompanyByEmployer(employerId, token) as any
        setCompany(comp)
      } catch {
        // No company yet — use employer data as defaults
      }

      // Populate form with company data if available, else employer data
      setFormData({
        name: comp?.name || emp.firm_name || "",
        description: comp?.description || emp.delatnost || "",
        website: comp?.website || "",
        industry: comp?.industry || "",
        size: comp?.size || "",
        founded: comp?.founded?.toString() || "",
        address: comp?.address || emp.firm_address || "",
        phone: comp?.phone || emp.firm_phone || "",
        email: comp?.email || emp.email || user?.email || "",
        pib: comp?.pib || emp.pib || "",
        maticni_broj: comp?.maticni_broj || emp.maticni_broj || "",
      })
    } catch (err) {
      setError("Failed to load company data. Please complete your employer profile first.")
    } finally {
      setDataLoading(false)
    }
  }, [token, user])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) { router.push("/login"); return }
    if (!isLoading && isAuthenticated) loadData()
  }, [isAuthenticated, isLoading, router, loadData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(false)
    setSaving(true)
    try {
      if (!token || !user?.id) throw new Error("Not authenticated")

      const emp = employer || (await apiClient.getEmployerByUserId(user.id, token) as any)
      const employerId = emp.id || emp._id || user.id

      if (company?.id) {
        // Update existing company
        await apiClient.updateCompany(company.id, {
          ...formData,
          founded: formData.founded ? parseInt(formData.founded) : undefined,
        }, token)
      } else {
        // No company — update employer fields
        await apiClient.updateEmployer(employerId, {
          firm_name: formData.name,
          pib: formData.pib,
          maticni_broj: formData.maticni_broj,
          delatnost: formData.description,
          firm_address: formData.address,
          firm_phone: formData.phone,
        }, token)
      }

      setSuccess(true)
      setIsEditing(false)
      // Reload to reflect changes
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update company profile")
    } finally {
      setSaving(false)
    }
  }

  const getApprovalBadge = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return <Badge className="bg-green-100 text-green-800 flex items-center gap-1"><CheckCircle className="h-3 w-3" />Approved</Badge>
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 flex items-center gap-1"><XCircle className="h-3 w-3" />Rejected</Badge>
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1"><Clock className="h-3 w-3" />Pending Review</Badge>
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

  // Display name: prefer company name, then firm_name, then user name
  const displayName = company?.name || employer?.firm_name || `${employer?.first_name || ""} ${employer?.last_name || ""}`.trim() || "Your Company"

  return (
    <DashboardLayout title="Company Profile">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{displayName}</h2>
              <div className="flex items-center gap-2 mt-1">
                {getApprovalBadge(employer?.approval_status)}
                {(company?.industry || employer?.delatnost) && (
                  <span className="text-sm text-muted-foreground">
                    · {company?.industry || employer?.delatnost}
                  </span>
                )}
              </div>
            </div>
          </div>
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={() => { setIsEditing(true); setSuccess(false); setError("") }}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>

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

        {isEditing ? (
          /* ── EDIT FORM ── */
          <form onSubmit={handleSubmit} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>Update your company details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Company Name</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} disabled={saving} />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pib">PIB (Tax ID)</Label>
                    <Input id="pib" value={formData.pib} onChange={(e) => setFormData({ ...formData, pib: e.target.value })} disabled={saving} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maticni_broj">Registration Number</Label>
                    <Input id="maticni_broj" value={formData.maticni_broj} onChange={(e) => setFormData({ ...formData, maticni_broj: e.target.value })} disabled={saving} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Business Description / Activity</Label>
                  <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} disabled={saving} rows={3} />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input id="website" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} disabled={saving} placeholder="https://" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Input id="industry" value={formData.industry} onChange={(e) => setFormData({ ...formData, industry: e.target.value })} disabled={saving} />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="size">Company Size</Label>
                    <Input id="size" value={formData.size} onChange={(e) => setFormData({ ...formData, size: e.target.value })} disabled={saving} placeholder="e.g. 10-50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="founded">Founded Year</Label>
                    <Input id="founded" type="number" value={formData.founded} onChange={(e) => setFormData({ ...formData, founded: e.target.value })} disabled={saving} placeholder="e.g. 2010" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Company Address</Label>
                  <Input id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} disabled={saving} />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Company Phone</Label>
                    <Input id="phone" type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} disabled={saving} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Company Email</Label>
                    <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} disabled={saving} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
              </Button>
              <Button type="button" variant="outline" onClick={() => { setIsEditing(false); setError("") }} disabled={saving}>
                <X className="mr-2 h-4 w-4" />Cancel
              </Button>
            </div>
          </form>
        ) : (
          /* ── VIEW MODE ── */
          <div className="space-y-4">
            {/* Main company info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Company Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {(formData.name) && (
                    <InfoRow icon={<Building2 className="h-4 w-4" />} label="Company Name" value={formData.name} />
                  )}
                  {(formData.pib) && (
                    <InfoRow icon={<Hash className="h-4 w-4" />} label="PIB (Tax ID)" value={formData.pib} />
                  )}
                  {(formData.maticni_broj) && (
                    <InfoRow icon={<FileText className="h-4 w-4" />} label="Registration Number" value={formData.maticni_broj} />
                  )}
                  {(formData.industry) && (
                    <InfoRow icon={<Factory className="h-4 w-4" />} label="Industry" value={formData.industry} />
                  )}
                  {(formData.size) && (
                    <InfoRow icon={<Users className="h-4 w-4" />} label="Company Size" value={formData.size} />
                  )}
                  {(formData.founded) && (
                    <InfoRow icon={<CalendarDays className="h-4 w-4" />} label="Founded" value={formData.founded} />
                  )}
                  {(formData.address) && (
                    <InfoRow icon={<MapPin className="h-4 w-4" />} label="Address" value={formData.address} />
                  )}
                  {(formData.phone) && (
                    <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={formData.phone} />
                  )}
                  {(formData.email) && (
                    <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={formData.email} />
                  )}
                  {(formData.website) && (
                    <InfoRow icon={<Globe className="h-4 w-4" />} label="Website" value={formData.website} isLink />
                  )}
                </div>

                {formData.description && (
                  <div className="mt-5 pt-5 border-t">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Business Description</p>
                    <p className="text-sm leading-relaxed">{formData.description}</p>
                  </div>
                )}

                {!formData.name && !formData.pib && !formData.address && (
                  <div className="text-center py-6 text-muted-foreground">
                    <Building2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No company information yet.</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => setIsEditing(true)}>
                      <Pencil className="h-4 w-4 mr-2" />Add Company Info
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Employer personal info */}
            {employer && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-4 w-4 text-primary" />
                    Account Holder
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {(employer.first_name || employer.last_name) && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</p>
                        <p className="font-medium mt-0.5">{employer.first_name} {employer.last_name}</p>
                      </div>
                    )}
                    {employer.email && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</p>
                        <p className="font-medium mt-0.5">{employer.email}</p>
                      </div>
                    )}
                    {employer.phone && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Phone</p>
                        <p className="font-medium mt-0.5">{employer.phone}</p>
                      </div>
                    )}
                    {employer.address && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Address</p>
                        <p className="font-medium mt-0.5">{employer.address}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

function InfoRow({
  icon,
  label,
  value,
  isLink,
}: {
  icon: React.ReactNode
  label: string
  value: string
  isLink?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        {isLink ? (
          <a
            href={value.startsWith("http") ? value : `https://${value}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-primary hover:underline truncate block mt-0.5"
          >
            {value}
          </a>
        ) : (
          <p className="text-sm font-medium mt-0.5 truncate">{value}</p>
        )}
      </div>
    </div>
  )
}
