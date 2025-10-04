"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, UserCheck, Mail, Phone } from "lucide-react"

interface Professor {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  office?: string
  subjects?: Array<{ id: string; name?: string }>
}

export default function AdminProfessorsPage() {
  const { token } = useAuth()
  const [professors, setProfessors] = useState<Professor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      loadProfessors()
    }
  }, [token])

  const loadProfessors = async () => {
    try {
      const data = await apiClient.getAllProfessors(token!)
      setProfessors(data)
    } catch (error) {
      console.error("Failed to load professors:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Professor Management</h1>
          <p className="text-muted-foreground">View and manage all professors</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          </div>
        ) : professors.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">No professors found</CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {professors.map((professor) => (
              <Card key={professor.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <UserCheck className="h-5 w-5" />
                        {professor.first_name} {professor.last_name}
                      </CardTitle>
                      <CardDescription>Professor ID: {professor.id}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{professor.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{professor.phone}</span>
                    </div>
                    {professor.office && (
                      <div>
                        <p className="font-medium">Office</p>
                        <p className="text-muted-foreground">{professor.office}</p>
                      </div>
                    )}
                    {professor.subjects && professor.subjects.length > 0 && (
                      <div className="col-span-2">
                        <p className="font-medium mb-1">Subjects</p>
                        <div className="flex flex-wrap gap-2">
                          {professor.subjects.map((subject) => (
                            <span key={subject.id} className="text-xs bg-secondary px-2 py-1 rounded">
                              {subject.name || subject.id}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
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
