"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Clock, Building2, Loader2, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useRouter } from "next/navigation"

interface Employer {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  firm_name: string
  pib: string
  maticni_broj: string
  delatnost: string
  firm_address: string
  firm_phone: string
  approval_status: string
  approved_at?: string
  approved_by?: string
}

export default function AdminEmployersPage() {
  const { user, token, isLoading: authLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [employers, setEmployers] = useState<Employer[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all")
  const [processingId, setProcessingId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const loadData = async () => {
      if (authLoading) return

      if (!isAuthenticated || !token || !user) {
        setLoading(false)
        return
      }

      // Check if user is admin
      if (user.user_type !== "ADMIN" && user.user_type !== "STUDENTSKA_SLUZBA") {
        setLoading(false)
        toast({
          title: "Access Denied",
          description: "You need admin privileges to access this page.",
          variant: "destructive",
        })
        return
      }

      await loadEmployers()
    }

    loadData()
  }, [token, authLoading, isAuthenticated, user])

  const loadEmployers = async () => {
    setLoading(true)
    try {
      console.log("[Admin] Loading employers with user_type:", user?.user_type)
      const data = await apiClient.getEmployers(token!)
      console.log("[Admin] Loaded employers raw data:", data)
      
      // Normalize employer data - handle both 'id' and '_id' fields, and flatten embedded User fields
      const normalizedData = data.map((emp: any) => {
        // Handle nested user object if present (some JSON serializations might nest it)
        const userData = emp.user || emp.User || {}
        
        // Ensure we have an 'id' field - use '_id' if 'id' is missing
        let normalizedId = emp.id || emp._id || emp.ID || userData.id || userData._id || userData.ID
        
        // Convert to string and trim whitespace
        if (normalizedId) {
          normalizedId = String(normalizedId).trim()
          // Ensure it's exactly 24 hex characters (MongoDB ObjectID format)
          if (normalizedId.length !== 24) {
            console.warn("[Admin] Employer ID has invalid length:", normalizedId, "length:", normalizedId.length)
          }
        }
        
        // Helper function to safely get a field value (handles null, undefined, empty string)
        const getField = (...keys: string[]): string => {
          for (const key of keys) {
            const value = emp[key]
            if (value !== null && value !== undefined && value !== "" && String(value).trim() !== "") {
              return String(value).trim()
            }
          }
          return ""
        }
        
        // Log raw data for first employer to debug (only log once)
        if (data.indexOf(emp) === 0) {
          console.log("[Admin] Raw employer data (first):", JSON.stringify(emp, null, 2))
        }
        
        const normalized: Employer = {
          id: normalizedId,
          first_name: getField("first_name", "firstName", "FirstName") || userData.first_name || userData.firstName || "",
          last_name: getField("last_name", "lastName", "LastName") || userData.last_name || userData.lastName || "",
          email: getField("email", "Email") || userData.email || "",
          phone: getField("phone", "Phone") || userData.phone || "",
          firm_name: getField("firm_name", "firmName", "FirmName") || "",
          pib: getField("pib", "PIB") || "",
          maticni_broj: getField("maticni_broj", "maticniBroj", "MatBr", "maticni_broj") || "",
          delatnost: getField("delatnost", "Delatnost") || "",
          firm_address: getField("firm_address", "firmAddress", "FirmAddress") || "",
          firm_phone: getField("firm_phone", "firmPhone", "FirmPhone") || "",
          approval_status: getField("approval_status", "approvalStatus", "ApprovalStatus") || "pending",
          approved_at: emp.approved_at || emp.approvedAt || emp.ApprovedAt,
          approved_by: emp.approved_by || emp.approvedBy || emp.ApprovedBy,
        }
        
        // Log if we have profile data but normalization didn't catch it
        if ((emp.pib || emp.PIB || emp.maticni_broj || emp.maticniBroj || emp.MatBr || emp.delatnost) && 
            (!normalized.pib && !normalized.maticni_broj && !normalized.delatnost)) {
          console.warn("[Admin] Profile data exists but not normalized:", {
            raw: {
              pib: emp.pib,
              PIB: emp.PIB,
              maticni_broj: emp.maticni_broj,
              maticniBroj: emp.maticniBroj,
              MatBr: emp.MatBr,
              delatnost: emp.delatnost,
            },
            normalized: {
              pib: normalized.pib,
              maticni_broj: normalized.maticni_broj,
              delatnost: normalized.delatnost,
            }
          })
        }
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/737903fe-e619-4f91-add6-2aae59140131',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin/employers/page.tsx:75',message:'normalizing employer data',data:{original_id:emp.id,normalized_id:normalizedId,has_firm_name:!!normalized.firm_name,has_pib:!!normalized.pib,has_maticni_broj:!!normalized.maticni_broj,approval_status:normalized.approval_status},runId:'frontend-handler',hypothesisId:'D',timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        
        if (!normalizedId) {
          console.warn("[Admin] Employer missing ID field:", emp)
        }
        
        // Log if profile data is missing
        if (!normalized.firm_name && !normalized.pib && !normalized.maticni_broj) {
          console.warn("[Admin] Employer missing profile data:", normalizedId, emp)
        }
        
        return normalized
      })
      
      // Remove duplicates by ID
      const uniqueEmployers = normalizedData.reduce((acc: Employer[], current: Employer) => {
        if (!current.id) {
          console.warn("[Admin] Skipping employer without ID:", current)
          return acc
        }
        const exists = acc.find(item => item.id === current.id)
        if (!exists) {
          acc.push(current)
        } else {
          console.warn("[Admin] Duplicate employer found:", current.id)
        }
        return acc
      }, [])
      
      console.log("[Admin] Unique employers:", uniqueEmployers.length)
      console.log("[Admin] All employer IDs:", uniqueEmployers.map((e: Employer) => ({ id: e.id, firm_name: e.firm_name })))
      console.log("[Admin] Sample employer IDs:", uniqueEmployers.slice(0, 3).map((e: Employer) => e.id))
      
      // Log sample employer data to debug profile data visibility
      if (uniqueEmployers.length > 0) {
        const sample = uniqueEmployers[0]
        console.log("[Admin] Sample employer data:", {
          id: sample.id,
          firm_name: sample.firm_name,
          pib: sample.pib,
          maticni_broj: sample.maticni_broj,
          delatnost: sample.delatnost,
          firm_address: sample.firm_address,
          firm_phone: sample.firm_phone,
          first_name: sample.first_name,
          last_name: sample.last_name,
          email: sample.email,
          approval_status: sample.approval_status,
        })
      }
      
      setEmployers(uniqueEmployers)
    } catch (error) {
      console.error("Failed to load employers:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load employers",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Helper function to decode JWT token
  const decodeJWT = (token: string) => {
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
      return JSON.parse(jsonPayload)
    } catch (e) {
      console.error('Failed to decode JWT:', e)
      return null
    }
  }

  const handleApprove = async (employerId: string) => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/737903fe-e619-4f91-add6-2aae59140131',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin/employers/page.tsx:136',message:'handleApprove called',data:{employer_id:employerId},runId:'frontend-handler',hypothesisId:'D',timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    setProcessingId(employerId)
    try {
      console.log("[Admin] Approving employer with ID:", employerId)
      console.log("[Admin] ID type:", typeof employerId)
      console.log("[Admin] ID length:", employerId?.length)
      
      // Validate the ID format (should be 24 hex characters for MongoDB ObjectID)
      if (!employerId || employerId.length !== 24) {
        console.error("[Admin] Invalid employer ID format:", employerId)
        throw new Error(`Invalid employer ID format: ${employerId}`)
      }
      
      console.log("[Admin] User object:", user)
      console.log("[Admin] Token:", token?.substring(0, 50) + "...")
      
      // Use the token from user object if available (has user_type)
      const adminToken = (user as any)?.token || token
      console.log("[Admin] Using token:", adminToken?.substring(0, 50) + "...")
      console.log("[Admin] Token length:", adminToken?.length)
      console.log("[Admin] Token exists:", !!adminToken)
      
      if (!adminToken) {
        throw new Error("No authentication token available. Please log in again.")
      }
      
      // Decode and log the token contents
      if (adminToken) {
        const decoded = decodeJWT(adminToken)
        console.log("[Admin] Decoded token:", decoded)
        console.log("[Admin] Token User_type:", decoded?.User_type || decoded?.user_type || 'NOT FOUND')
        console.log("[Admin] Token Uid:", decoded?.Uid || decoded?.uid || decoded?.sub || 'NOT FOUND')
        console.log("[Admin] Token Email:", decoded?.Email || decoded?.email || 'NOT FOUND')
        
        // Check if token is expired
        if (decoded?.exp) {
          const expDate = new Date(decoded.exp * 1000)
          const now = new Date()
          console.log("[Admin] Token expires at:", expDate.toISOString())
          console.log("[Admin] Current time:", now.toISOString())
          console.log("[Admin] Token expired:", expDate < now)
          if (expDate < now) {
            throw new Error("Your session has expired. Please log in again.")
          }
        }
      }
      
      await apiClient.approveEmployer(employerId, adminToken!)
      toast({
        title: "Employer Approved",
        description: "The employer has been successfully approved and can now post job listings.",
      })
      // Small delay to ensure backend has processed the update
      await new Promise(resolve => setTimeout(resolve, 500))
      await loadEmployers()
    } catch (error) {
      console.error("Failed to approve employer:", error)
      let errorMessage = "Failed to approve employer. Please try again."
      if (error instanceof Error) {
        errorMessage = error.message
        // Try to extract available IDs from error message if present
        const availableIdsMatch = error.message.match(/Available IDs: \[(.*?)\]/)
        if (availableIdsMatch) {
          console.log("[Admin] Available employer IDs from backend:", availableIdsMatch[1])
        }
      }
      toast({
        title: "Approval Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (employerId: string) => {
    setProcessingId(employerId)
    try {
      console.log("[Admin] Rejecting employer:", employerId)
      
      // Use the token from user object if available
      const adminToken = (user as any)?.token || token
      
      await apiClient.rejectEmployer(employerId, adminToken!)
      toast({
        title: "Employer Rejected",
        description: "The employer registration has been rejected.",
      })
      // Small delay to ensure backend has processed the update
      await new Promise(resolve => setTimeout(resolve, 500))
      await loadEmployers()
    } catch (error) {
      console.error("Failed to reject employer:", error)
      toast({
        title: "Rejection Failed",
        description: error instanceof Error ? error.message : "Failed to reject employer. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  const filteredEmployers = (employers ?? []).filter((employer) => {
    if (filter === "all") return true
    return employer.approval_status?.toLowerCase() === filter
  })

  const getStatusBadge = (status?: string) => {
    if (!status) return <Badge className="bg-yellow-500">Pending</Badge>
    switch (status.toLowerCase()) {
      case "approved":
        return <Badge className="bg-green-500">Approved</Badge>
      case "rejected":
        return <Badge className="bg-red-500">Rejected</Badge>
      case "pending":
        return <Badge className="bg-yellow-500">Pending</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  // Show loading while auth loads
  if (authLoading) {
    return (
      <DashboardLayout title="Employer Management">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  // Show error if not authenticated or not admin
  if (!isAuthenticated || !token || !user) {
    return (
      <DashboardLayout title="Employer Management">
        <div className="space-y-6">
          <Alert variant="destructive">
            <AlertDescription>Please log in to access this page</AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    )
  }

  if (user.user_type !== "ADMIN" && user.user_type !== "STUDENTSKA_SLUZBA") {
    return (
      <DashboardLayout title="Employer Management">
        <div className="space-y-6">
          <Alert variant="destructive">
            <AlertDescription>
              Access Denied: You need admin privileges. Your role: {user.user_type}
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Employer Management">
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Employer Management</h1>
            <p className="text-muted-foreground">Review and approve employer registrations</p>
            <p className="text-xs text-muted-foreground mt-1">Logged in as: {user.user_type}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>
            All ({employers.length})
          </Button>
          <Button variant={filter === "pending" ? "default" : "outline"} onClick={() => setFilter("pending")}>
            <Clock className="mr-2 h-4 w-4" />
            Pending (
            {employers.filter((e) => !e.approval_status || e.approval_status.toLowerCase() === "pending").length})
          </Button>
          <Button variant={filter === "approved" ? "default" : "outline"} onClick={() => setFilter("approved")}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Approved ({employers.filter((e) => e.approval_status?.toLowerCase() === "approved").length})
          </Button>
          <Button variant={filter === "rejected" ? "default" : "outline"} onClick={() => setFilter("rejected")}>
            <XCircle className="mr-2 h-4 w-4" />
            Rejected ({employers.filter((e) => e.approval_status?.toLowerCase() === "rejected").length})
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredEmployers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">No employers found</CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredEmployers.map((employer) => (
              <Card key={employer.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        {employer.firm_name}
                      </CardTitle>
                      <CardDescription>
                        {employer.first_name} {employer.last_name} • {employer.email}
                      </CardDescription>
                    </div>
                    {getStatusBadge(employer.approval_status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium">PIB</p>
                      <p className="text-muted-foreground">{employer.pib && employer.pib.trim() ? employer.pib : <span className="text-gray-400 italic">Not provided</span>}</p>
                    </div>
                    <div>
                      <p className="font-medium">Matični broj</p>
                      <p className="text-muted-foreground">{employer.maticni_broj && employer.maticni_broj.trim() ? employer.maticni_broj : <span className="text-gray-400 italic">Not provided</span>}</p>
                    </div>
                    <div>
                      <p className="font-medium">Delatnost</p>
                      <p className="text-muted-foreground">{employer.delatnost && employer.delatnost.trim() ? employer.delatnost : <span className="text-gray-400 italic">Not provided</span>}</p>
                    </div>
                    <div>
                      <p className="font-medium">Phone</p>
                      <p className="text-muted-foreground">{employer.firm_phone && employer.firm_phone.trim() ? employer.firm_phone : <span className="text-gray-400 italic">Not provided</span>}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="font-medium">Address</p>
                      <p className="text-muted-foreground">{employer.firm_address && employer.firm_address.trim() ? employer.firm_address : <span className="text-gray-400 italic">Not provided</span>}</p>
                    </div>
                  </div>
                  {(!employer.approval_status || employer.approval_status.toLowerCase() === "pending") && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          // #region agent log
                          fetch('http://127.0.0.1:7243/ingest/737903fe-e619-4f91-add6-2aae59140131',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin/employers/page.tsx:340',message:'approve button clicked',data:{employer_id:employer.id,employer_id_type:typeof employer.id,employer_id_length:employer.id?.length,firm_name:employer.firm_name},runId:'frontend-handler',hypothesisId:'D',timestamp:Date.now()})}).catch(()=>{});
                          // #endregion
                          console.log("[Admin] Approve button clicked for employer:", employer)
                          console.log("[Admin] Employer ID:", employer.id)
                          console.log("[Admin] Full employer object:", JSON.stringify(employer, null, 2))
                          if (!employer.id) {
                            console.error("[Admin] Employer missing ID field!")
                            toast({
                              title: "Error",
                              description: "Employer ID is missing. Please refresh the page.",
                              variant: "destructive",
                            })
                            return
                          }
                          // Ensure we use the exact ID from the employer object
                          const exactId = String(employer.id).trim()
                          if (exactId.length !== 24) {
                            console.error("[Admin] Invalid employer ID length:", exactId.length, exactId)
                            toast({
                              title: "Error",
                              description: `Invalid employer ID format. Expected 24 characters, got ${exactId.length}.`,
                              variant: "destructive",
                            })
                            return
                          }
                          handleApprove(exactId)
                        }}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        disabled={processingId === employer.id}
                      >
                        {processingId === employer.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Approving...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => handleReject(employer.id)}
                        variant="destructive"
                        className="flex-1"
                        disabled={processingId === employer.id}
                      >
                        {processingId === employer.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Rejecting...
                          </>
                        ) : (
                          <>
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  {employer.approval_status?.toLowerCase() === "approved" && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => router.push(`/dashboard/admin/employers/${employer.id}`)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Applications & Candidates
                    </Button>
                  )}
                  {employer.approved_at && (
                    <p className="text-xs text-muted-foreground">
                      {employer.approval_status} on {new Date(employer.approved_at).toLocaleString()}
                      {employer.approved_by && ` by ${employer.approved_by}`}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
