"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Building2, Plus } from "lucide-react"

interface Department {
  id: string
  name: string
  description?: string
  head?: string
  building?: string
}

export default function AdminDepartmentsPage() {
  const { token } = useAuth()
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      loadDepartments()
    }
  }, [token])

  const loadDepartments = async () => {
    try {
      const data = await apiClient.getAllDepartments(token!)
      setDepartments(data)
    } catch (error) {
      console.error("Failed to load departments:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Department Management</h1>
            <p className="text-muted-foreground">View and manage university departments</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Department
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          </div>
        ) : departments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">No departments found</CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {departments.map((department) => (
              <Card key={department.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {department.name}
                  </CardTitle>
                  {department.description && <CardDescription>{department.description}</CardDescription>}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {department.head && (
                      <div>
                        <p className="font-medium">Department Head</p>
                        <p className="text-muted-foreground">{department.head}</p>
                      </div>
                    )}
                    {department.building && (
                      <div>
                        <p className="font-medium">Building</p>
                        <p className="text-muted-foreground">{department.building}</p>
                      </div>
                    )}
                    <div>
                      <p className="font-medium">Department ID</p>
                      <p className="text-muted-foreground font-mono text-xs">{department.id}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
