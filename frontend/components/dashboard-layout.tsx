"use client"

import type React from "react"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  LogOut,
  User,
  Menu,
  Home,
  Briefcase,
  FileText,
  Users,
  Building,
  Calendar,
  BookOpen,
  Settings,
} from "lucide-react"
import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { apiClient } from "@/lib/api-client"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface DashboardLayoutProps {
  children: React.ReactNode
  title: string
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { user, logout, token } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      if (token) {
        await apiClient.logout(token)
      }
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      logout()
      router.push("/login")
    }
  }

  const getNavigationLinks = () => {
    const userType = user?.user_type?.toLowerCase()

    switch (userType) {
      case "student":
        return [
          { href: "/dashboard/student", label: "Dashboard", icon: Home },
          { href: "/dashboard/student/courses", label: "Courses", icon: BookOpen },
          { href: "/dashboard/student/exams", label: "Exams", icon: Calendar },
          { href: "/dashboard/student/internships", label: "Internships", icon: Briefcase },
        ]
      case "employer":
        return [
          { href: "/dashboard/employer", label: "Dashboard", icon: Home },
          { href: "/dashboard/employer/job-listings", label: "Job Listings", icon: Briefcase },
          { href: "/dashboard/employer/applications", label: "Applications", icon: FileText },
          { href: "/dashboard/employer/company", label: "Company", icon: Building },
        ]
      case "candidate":
        return [
          { href: "/dashboard/candidate", label: "Dashboard", icon: Home },
          { href: "/dashboard/candidate/job-search", label: "Job Search", icon: Briefcase },
          { href: "/dashboard/candidate/applications", label: "My Applications", icon: FileText },
          { href: "/dashboard/candidate/profile", label: "Profile", icon: User },
        ]
      case "professor":
        return [
          { href: "/dashboard/professor", label: "Dashboard", icon: Home },
          { href: "/dashboard/profile", label: "Profile", icon: User },
        ]
      case "admin":
        return [
          { href: "/dashboard/admin", label: "Dashboard", icon: Home },
          { href: "/dashboard/admin/employers", label: "Employers", icon: Building },
          { href: "/dashboard/admin/job-listings", label: "Job Listings", icon: Briefcase },
          { href: "/dashboard/admin/students", label: "Students", icon: Users },
          { href: "/dashboard/admin/departments", label: "Departments", icon: Settings },
        ]
      default:
        return [{ href: "/dashboard", label: "Dashboard", icon: Home }]
    }
  }

  const navigationLinks = getNavigationLinks()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <span className="text-lg font-semibold">euprava</span>
              </Link>

              <nav className="hidden md:flex items-center gap-1">
                {navigationLinks.map((link) => {
                  const Icon = link.icon
                  const isActive = pathname === link.href
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        }`}
                    >
                      <Icon className="h-4 w-4" />
                      {link.label}
                    </Link>
                  )
                })}
              </nav>
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Navigation</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {navigationLinks.map((link) => {
                    const Icon = link.icon
                    return (
                      <DropdownMenuItem key={link.href} onClick={() => router.push(link.href)}>
                        <Icon className="mr-2 h-4 w-4" />
                        {link.label}
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium">
                          {user?.first_name} {user?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">{user?.email}</p>
                        <p className="text-xs text-muted-foreground capitalize">{user?.user_type?.toLowerCase()}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push("/dashboard/profile")}>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
