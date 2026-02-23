"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, BookOpen, User, Calendar, Filter } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const MAJOR_YEARS = [1, 2, 3, 4, 5] as const

export default function StudentCoursesPage() {
  const { user, token } = useAuth()
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [studentData, setStudentData] = useState<any>(null)
  const [passedCourses, setPassedCourses] = useState<any[]>([])
  const [examGrades, setExamGrades] = useState<any[]>([])
  const [filter, setFilter] = useState<"all" | "passed" | "not-passed">("not-passed")
  const [selectedYear, setSelectedYear] = useState<number | null>(null)

  useEffect(() => {
    loadStudentData()
  }, [])


  const loadStudentData = async () => {
    try {
      if (!token || !user?.id) {
        console.log("No token or user ID available")
        return
      }

      console.log("Loading student data for user:", user.id)
      const data = await apiClient.getStudentById(user.id, token)
      console.log("Student data:", data)

      // Fetch major data if major_id exists
      if (data.major_id) {
        console.log("Student has major_id:", data.major_id)
        try {
          data.major = await apiClient.getMajorById(data.major_id, token)
          console.log("Major data:", data.major)
        } catch (majorError) {
          console.error("Failed to fetch major data:", majorError)
          // Keep the major_id for reference even if we can't fetch the full major object
        }
      } else {
        console.log("Student has no major_id")
      }

      setStudentData(data)
      const studentYear = data.year != null ? Number(data.year) : null
      setSelectedYear(studentYear)

      // Load courses, passed courses, and exam grades after student data is available
      if (data.major_id) {
        console.log("Loading courses for major_id:", data.major_id)
        await Promise.all([
          loadCourses(data.major_id),
          loadPassedCourses(user.id),
          loadExamGrades(user.id)
        ])
      } else {
        console.log("Cannot load courses - no major_id")
      }
    } catch (err) {
      console.error("Error in loadStudentData:", err)
      setError(err instanceof Error ? err.message : "Failed to load academic data")
    } finally {
      setLoading(false)
    }
  }

  const loadPassedCourses = async (studentId: string) => {
    try {
      if (!token) throw new Error("Not authenticated")
      console.log("Loading passed courses for student:", studentId)
      const data = await apiClient.getPassedCorusesForStudent(studentId, token)
      console.log("Passed courses data:", data)
      setPassedCourses(data as any[])
    } catch (err) {
      console.error("Error in loadPassedCourses:", err)
      // Don't set error here as it's not critical for the main functionality
      console.log("Failed to load passed courses, continuing without this data")
      setPassedCourses([]) // Ensure we always have an empty array
    }
  }

  const loadExamGrades = async (studentId: string) => {
    try {
      if (!token) throw new Error("Not authenticated")
      const data = await apiClient.getAllExamGradesForStudent(studentId, token)
      setExamGrades(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Error in loadExamGrades:", err)
      setExamGrades([])
    }
  }

  const loadCourses = async (majorId: string) => {
    try {
      if (!token) throw new Error("Not authenticated")
      console.log("Loading courses for major:", majorId)
      const data = await apiClient.getSubjectsByMajor(majorId, token)
      console.log("Raw courses data:", data)

      // Create a map to cache professor data and avoid duplicate API calls
      const professorCache = new Map<string, any>()

      // Fetch professor data for each course
      const coursesWithProfessors = await Promise.all(
        data.map(async (course: any) => {
          // Check for professor_ids array (new format) or professor_id (old format for backward compatibility)
          const professorIds = course.professor_ids || course.professorids || 
            (course.professor_id ? [course.professor_id] : [])
          
          console.log("Processing course:", course.Name || course.name, "professor_ids:", professorIds)

          if (professorIds && Array.isArray(professorIds) && professorIds.length > 0) {
            // Fetch all professors for this course
            const professors = await Promise.all(
              professorIds.map(async (profId: string) => {
                // Check if we already have this professor in cache
                if (professorCache.has(profId)) {
                  console.log("Using cached professor for:", profId)
                  return professorCache.get(profId)
                }

                try {
                  console.log("Fetching professor for ID:", profId)
                  const professor = await apiClient.getProfessorById(profId, token)
                  console.log("Fetched professor:", professor)
                  // Cache the professor data
                  professorCache.set(profId, professor)
                  return professor
                } catch (profError) {
                  console.error(`Failed to fetch professor ${profId} for course ${course.id}:`, profError)
                  return null
                }
              })
            )

            // Filter out any null values (failed fetches)
            const validProfessors = professors.filter((p: any) => p !== null)
            return { ...course, professors: validProfessors }
          } else {
            console.log("No professor IDs found for course:", course.Name || course.name)
          }
          return { ...course, professors: [] }
        })
      )

      console.log("Final courses with professors:", coursesWithProfessors)
      setCourses(coursesWithProfessors)
    } catch (err) {
      console.error("Error in loadCourses:", err)
      setError(err instanceof Error ? err.message : "Failed to load courses")
    }
  }

  // Helper function to check if a course is passed
  const isCoursePassed = (courseId: string) => {
    if (!passedCourses || !Array.isArray(passedCourses)) {
      return false
    }
    return passedCourses.some((passedCourse: any) =>
      passedCourse.id === courseId ||
      passedCourse.subject_id === courseId
    )
  }

  // Get grade for a passed course (exam grades are 5–10, only passed have grade shown)
  const getGradeForCourse = (courseId: string): number | undefined => {
    if (!examGrades?.length) return undefined
    const idStr = (id: any) => (typeof id === "string" ? id : id?.toString?.() ?? "")
    const passedGrade = examGrades.find(
      (g: any) => g.passed && (idStr(g.subject_id) === courseId || idStr(g.subject_id) === idStr(courseId))
    )
    return passedGrade != null && typeof passedGrade.grade === "number" ? passedGrade.grade : undefined
  }

  // Filter courses by selected year (student's current year by default), then by passed/not-passed
  const getFilteredCourses = () => {
    const byYear =
      selectedYear != null
        ? courses.filter((course) => Number(course.year) === selectedYear)
        : courses
    if (filter === "all") return byYear
    if (filter === "passed") return byYear.filter((course) => isCoursePassed(course.id))
    if (filter === "not-passed") return byYear.filter((course) => !isCoursePassed(course.id))
    return byYear
  }

  return (
    <DashboardLayout title="My Courses">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">My Courses</h2>
          <p className="text-muted-foreground">View your enrolled courses and schedules</p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Year:</span>
              <Select
                value={selectedYear != null ? String(selectedYear) : ""}
                onValueChange={(v) => setSelectedYear(v ? Number(v) : null)}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {MAJOR_YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      Year {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              <div className="flex gap-2">
                <Button
                  variant={filter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("all")}
                >
                  All
                </Button>
                <Button
                  variant={filter === "passed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("passed")}
                >
                  ✅ Passed
                </Button>
                <Button
                  variant={filter === "not-passed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("not-passed")}
                >
                  ❌ Not Passed
                </Button>
              </div>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Showing {getFilteredCourses().length}
            {selectedYear != null
              ? ` of ${courses.filter((c) => Number(c.year) === selectedYear).length}`
              : ` of ${courses.length}`}{" "}
            courses
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : getFilteredCourses().length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {filter === "all"
                  ? "No courses found"
                  : filter === "passed"
                    ? "No passed courses found"
                    : "No courses pending"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {getFilteredCourses().map((course) => {
              const passed = isCoursePassed(course.id)
              const grade = passed ? getGradeForCourse(course.id) : undefined
              return (
              <Card key={course.id} className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    {course.Name || course.name}
                  </CardTitle>
                  <CardDescription>{"Year: " + (course.year ?? "—")}</CardDescription>
                  <CardDescription>{"Passed: " + (passed ? "✅" : "❌")}</CardDescription>
                  {passed && grade != null && (
                    <CardDescription className="font-medium">Grade: {grade}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {course.professors && Array.isArray(course.professors) && course.professors.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>Professors:</span>
                      </div>
                      {course.professors.map((professor: any, idx: number) => (
                        <div key={professor.id || idx} className="flex items-center gap-2 text-sm ml-6">
                          <span>
                            Prof. {professor.first_name} {professor.last_name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {((course.professor_ids || course.professorids) && 
                    (!course.professors || course.professors.length === 0)) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>Professor information unavailable</span>
                    </div>
                  )}
                  {course.schedule && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{course.schedule}</span>
                    </div>
                  )}
                  {course.prerequisites && course.prerequisites.length > 0 && (
                    <div className="text-sm">
                      <p className="text-muted-foreground mb-1">Prerequisites:</p>
                      <div className="flex flex-wrap gap-1">
                        {course.prerequisites.map((prereq: string, idx: number) => (
                          <span key={idx} className="px-2 py-1 bg-muted rounded text-xs">
                            {prereq}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );})}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
