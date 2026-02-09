"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Filter, Search, Users, Calendar, Loader2 } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { Subject, Major } from "@/lib/types"

export default function ProfessorCoursesPage() {
    const router = useRouter()
    const { user, token, isAuthenticated } = useAuth()
    const [loading, setLoading] = useState(true)
    const [courses, setCourses] = useState<Subject[]>([])
    const [majors, setMajors] = useState<Major[]>([])
    const [filteredCourses, setFilteredCourses] = useState<Subject[]>([])
    const [selectedMajor, setSelectedMajor] = useState<string>("all")
    const [selectedYear, setSelectedYear] = useState<string>("all")
    const [searchTerm, setSearchTerm] = useState("")

    useEffect(() => {
        if (!isAuthenticated || user?.user_type !== "PROFESSOR") {
            router.push("/login")
            return
        }

        fetchData()
    }, [isAuthenticated, user, router])

    const fetchData = async () => {
        try {
            if (!token || !user?.id) return

            // Fetch courses for this professor
            const coursesData = await apiClient.getCoursesByProfessor(user.id, token)
            setCourses(coursesData)
            setFilteredCourses(coursesData)

            // Fetch all majors for filtering
            const majorsData = await apiClient.getAllMajors(token)
            setMajors(majorsData)
        } catch (error) {
            console.error("Error fetching data:", error)
        } finally {
            setLoading(false)
        }
    }

    const filterCourses = () => {
        if (!courses || courses.length === 0) {
            setFilteredCourses([])
            return
        }

        let filtered = courses

        // Filter by major
        if (selectedMajor !== "all") {
            filtered = filtered.filter(course => course.major_id === selectedMajor)
        }

        // Filter by year
        if (selectedYear !== "all") {
            filtered = filtered.filter(course => course.year === parseInt(selectedYear))
        }

        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(course =>
                course.name.toLowerCase().includes(searchTerm.toLowerCase())
            )
        }

        setFilteredCourses(filtered)
    }

    useEffect(() => {
        filterCourses()
    }, [selectedMajor, selectedYear, searchTerm, courses])

    const getMajorName = (majorId: string) => {
        const major = majors.find(m => m.id === majorId)
        return major?.name || "Unknown Major"
    }

    const getUniqueYears = () => {
        if (!courses || courses.length === 0) {
            return []
        }
        const years = [...new Set(courses.map(course => course.year))].sort()
        return years
    }

    if (loading) {
        return (
            <DashboardLayout title="My Courses">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout title="My Courses">
            <div className="space-y-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">My Courses</h2>
                    <p className="text-muted-foreground">Manage and view your teaching courses</p>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Filter className="h-5 w-5" />
                            Filters
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Search */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Search Courses</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by course name..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>

                            {/* Major Filter */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Filter by Major</label>
                                <Select value={selectedMajor} onValueChange={setSelectedMajor}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select major" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Majors</SelectItem>
                                        {majors.map((major) => (
                                            <SelectItem key={major.id} value={major.id}>
                                                {major.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Year Filter */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Filter by Year</label>
                                <Select value={selectedYear} onValueChange={setSelectedYear}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Years</SelectItem>
                                        {getUniqueYears().map((year) => (
                                            <SelectItem key={year} value={year.toString()}>
                                                Year {year}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Clear Filters */}
                        <div className="mt-4">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSelectedMajor("all")
                                    setSelectedYear("all")
                                    setSearchTerm("")
                                }}
                            >
                                Clear Filters
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Results Summary */}
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        Showing {filteredCourses?.length || 0} of {courses?.length || 0} courses
                    </p>
                </div>

                {/* Courses Grid */}
                {!filteredCourses || filteredCourses.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No courses found</h3>
                            <p className="text-muted-foreground text-center">
                                {!courses || courses.length === 0
                                    ? "You don't have any courses assigned yet."
                                    : "No courses match your current filters."}
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCourses.map((course) => (
                            <Card key={course.id} className="hover:border-primary/50 transition-colors">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <CardTitle className="text-lg">{course.name}</CardTitle>
                                            <CardDescription>
                                                {getMajorName(course.major_id)}
                                            </CardDescription>
                                        </div>
                                        <Badge variant="secondary">
                                            Year {course.year}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Calendar className="h-4 w-4" />
                                            <span>Major: {getMajorName(course.major_id)}</span>
                                        </div>

                                        <div className="pt-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full"
                                                onClick={() => {
                                                    // Navigate to course details or students page
                                                    router.push(`/dashboard/professor/courses/${course.id}`)
                                                }}
                                            >
                                                View Details
                                            </Button>
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
