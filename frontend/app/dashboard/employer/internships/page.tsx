"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Briefcase, Calendar, Users } from "lucide-react"

interface Internship {
  id: string
  position: string
  description: string
  applicants: number
  status: string
  created_at: string
}

export default function EmployerInternshipsPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [internships, setInternships] = useState<Internship[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
      return
    }

    const loadInternships = async () => {
      try {
        // TODO: Implement real API call when internship endpoints are available
        // const data = await apiClient.getInternships(token)
        // setInternships(data)
        setInternships([])
      } catch (error) {
        console.error("Failed to load internships:", error)
      } finally {
        setLoading(false)
      }
    }

    loadInternships()
  }, [isAuthenticated, isLoading, router])

  if (isLoading || loading) {
    return (
      <DashboardLayout title="Internships">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Internships">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Internship Programs</h2>
            <p className="text-muted-foreground">Manage your internship opportunities</p>
          </div>
          <Button>Create Internship</Button>
        </div>

        {internships.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No internships posted yet</p>
              <Button>Post Your First Internship</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {internships.map((internship) => (
              <Card key={internship.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle>{internship.position}</CardTitle>
                      <CardDescription>{internship.description}</CardDescription>
                    </div>
                    <Badge>{internship.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {internship.applicants} applicants
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Posted {internship.created_at}
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      Manage
                    </Button>
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
