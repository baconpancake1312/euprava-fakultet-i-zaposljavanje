"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, GraduationCap, Award, BookOpen, TrendingUp, Edit } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function StudentAcademicPage() {
  const { token, user } = useAuth()
  const [studentData, setStudentData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [completedCourses, setCompletedCourses] = useState<any[]>([])
  const [totalCourses, setTotalCourses] = useState<any[]>([])
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    year: "",
    gpa: "",
    highschool_gpa: "",
    scholarship: false,
    address: "",
    phone: "",
    email: "",
    emailConfirm: "",
    password: "",
    passwordConfirm: ""
  })
  const [updating, setUpdating] = useState(false)
  const [updateError, setUpdateError] = useState("")

  useEffect(() => {
    loadStudentData()
  }, [])

  const loadStudentData = async () => {
    try {
      if (!token || !user?.id) return

      const data = await apiClient.getStudentById(user.id, token)

      // Fetch major data if major_id exists
      if (data.major_id) {
        try {
          data.major = await apiClient.getMajorById(data.major_id, token)
        } catch (majorError) {
          console.error("Failed to fetch major data:", majorError)
          // Keep the major_id for reference even if we can't fetch the full major object
        }
      }

      setStudentData(data)

      // Load courses data in parallel
      await Promise.all([
        loadCompletedCourses(user.id),
        data.major_id ? loadTotalCourses(data.major_id) : Promise.resolve()
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load academic data")
    } finally {
      setLoading(false)
    }
  }

  const loadCompletedCourses = async (studentId: string) => {
    try {
      const courses = await apiClient.getPassedCorusesForStudent(studentId, token!)
      setCompletedCourses(courses)
    } catch (err) {
      console.error("Failed to load completed courses:", err)
    }
  }

  const loadTotalCourses = async (majorId: string) => {
    try {
      const courses = await apiClient.getSubjectsByMajor(majorId, token!)
      setTotalCourses(courses)
    } catch (err) {
      console.error("Failed to load total courses:", err)
    }
  }

  const openUpdateModal = () => {
    if (studentData && user) {
      setFormData({
        year: studentData.year?.toString() || "",
        gpa: studentData.gpa?.toString() || "",
        highschool_gpa: studentData.highschool_gpa?.toString() || "",
        scholarship: studentData.scholarship || false,
        address: user.address || "",
        phone: user.phone || "",
        email: user.email || "",
        emailConfirm: user.email || "", // Pre-fill with current email
        password: "",
        passwordConfirm: ""
      })
      setUpdateError("")
    }
    setIsUpdateModalOpen(true)
  }

  const handleFormChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    console.log("Form submitted!")
    e.preventDefault()

    console.log("Token:", !!token)
    console.log("User ID:", user?.id)
    console.log("Form data:", formData)

    if (!token || !user?.id) {
      console.log("Missing token or user ID")
      return
    }

    // Validation - only check email confirmation if email is being changed
    if (formData.email && formData.email !== user?.email && formData.email !== formData.emailConfirm) {
      console.log("Email confirmation mismatch")
      setUpdateError("Email and email confirmation do not match")
      return
    }

    if (formData.password && formData.password.length < 8) {
      console.log("Password too short")
      setUpdateError("Password must be at least 8 characters long")
      return
    }

    if (formData.password && formData.password !== formData.passwordConfirm) {
      console.log("Password confirmation mismatch")
      setUpdateError("Password and password confirmation do not match")
      return
    }

    console.log("Starting update process...")
    setUpdating(true)
    setUpdateError("")

    try {
      // Prepare student data
      const studentUpdateData = {
        year: formData.year ? parseInt(formData.year) : null,
        gpa: formData.gpa ? parseFloat(formData.gpa) : null,
        highschool_gpa: formData.highschool_gpa ? parseFloat(formData.highschool_gpa) : null,
        scholarship: formData.scholarship
      }

      // Prepare user data - only include fields that have actually changed
      const userUpdateData: any = {}
      if (formData.address && formData.address !== user?.address) {
        userUpdateData.address = formData.address
      }
      if (formData.phone && formData.phone !== user?.phone) {
        userUpdateData.phone = formData.phone
      }
      if (formData.email && formData.email !== user?.email) {
        userUpdateData.email = formData.email
      }
      if (formData.password) {
        userUpdateData.password = formData.password
      }

      console.log("Student update data:", studentUpdateData)
      console.log("User update data:", userUpdateData)

      // Update both student and user data
      console.log("Calling API...")
      await Promise.all([
        apiClient.updateStudent(user.id, studentUpdateData, token),
        Object.keys(userUpdateData).length > 0 ? apiClient.updateUser(user.id, userUpdateData, token) : Promise.resolve()
      ])

      console.log("API calls successful, reloading data...")
      // Reload student data to reflect changes
      await loadStudentData()
      console.log("Data reloaded, closing modal...")
      setIsUpdateModalOpen(false)
    } catch (err) {
      console.error("Update error:", err)
      setUpdateError(err instanceof Error ? err.message : "Failed to update information")
    } finally {
      console.log("Update process finished")
      setUpdating(false)
    }
  }

  return (
    <DashboardLayout title="Academic Information">
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold">Academic Information</h2>
            <p className="text-muted-foreground">Track your academic progress and achievements</p>
          </div>
          {studentData && (
            <Button onClick={openUpdateModal} variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Update Information
            </Button>
          )}
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
        ) : studentData ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Major</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {typeof studentData.major === 'string'
                    ? studentData.major
                    : studentData.major?.name || "Not set"}</div>
                <p className="text-xs text-muted-foreground">Current program</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Year</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{studentData.year || "N/A"}</div>
                <p className="text-xs text-muted-foreground">Current year</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">GPA</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{studentData.gpa?.toFixed(2) || "N/A"}</div>
                <p className="text-xs text-muted-foreground">Grade point average</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Courses completed</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completedCourses.length}</div>
                <p className="text-xs text-muted-foreground">
                  out of {totalCourses.length} total courses
                </p>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Academic Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">High School GPA:</span>
                  <span className="font-medium">{studentData.highschool_gpa?.toFixed(2) || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scholarship:</span>
                  <span className="font-medium">{studentData.scholarship ? "Yes" : "No"}</span>
                </div>
                {studentData.assigned_dorm && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Assigned Dorm:</span>
                    <span className="font-medium">{studentData.assigned_dorm}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium">{user?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="font-medium">{user?.phone || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">JMBG:</span>
                  <span className="font-medium">{user?.jmbg || "N/A"}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No academic data available</p>
            </CardContent>
          </Card>
        )}

        {/* Update Information Modal */}
        <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Update Information</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div className="text-xs text-muted-foreground mb-2">
                Debug: Form is ready. Check console for submission logs.
              </div>
              {updateError && (
                <Alert variant="destructive">
                  <AlertDescription>{updateError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="year">Academic Year</Label>
                <Select value={formData.year} onValueChange={(value) => handleFormChange("year", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1st Year</SelectItem>
                    <SelectItem value="2">2nd Year</SelectItem>
                    <SelectItem value="3">3rd Year</SelectItem>
                    <SelectItem value="4">4th Year</SelectItem>
                    <SelectItem value="5">5th Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gpa">Current GPA</Label>
                <Input
                  id="gpa"
                  type="number"
                  step="0.01"
                  min="0"
                  max="4"
                  value={formData.gpa}
                  onChange={(e) => handleFormChange("gpa", e.target.value)}
                  placeholder="Enter GPA (0.00 - 4.00)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="highschool_gpa">High School GPA</Label>
                <Input
                  id="highschool_gpa"
                  type="number"
                  step="0.01"
                  min="0"
                  max="4"
                  value={formData.highschool_gpa}
                  onChange={(e) => handleFormChange("highschool_gpa", e.target.value)}
                  placeholder="Enter high school GPA (0.00 - 4.00)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="scholarship">Scholarship</Label>
                <Select
                  value={formData.scholarship ? "yes" : "no"}
                  onValueChange={(value) => handleFormChange("scholarship", value === "yes")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select scholarship status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Personal Information Section */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-4">Personal Information</h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleFormChange("address", e.target.value)}
                      placeholder="Enter your address"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleFormChange("phone", e.target.value)}
                      placeholder="Enter your phone number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleFormChange("email", e.target.value)}
                      placeholder="Enter your email address"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emailConfirm">
                      Confirm Email Address {formData.email !== user?.email && formData.email && (
                        <span className="text-red-500">*</span>
                      )}
                    </Label>
                    <Input
                      id="emailConfirm"
                      type="email"
                      value={formData.emailConfirm}
                      onChange={(e) => handleFormChange("emailConfirm", e.target.value)}
                      placeholder="Confirm your email address"
                    />
                    {formData.email !== user?.email && formData.email && (
                      <p className="text-xs text-muted-foreground">
                        Required when changing email address
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Password Section */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-4">Change Password</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Leave password fields empty if you don't want to change your password
                </p>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleFormChange("password", e.target.value)}
                      placeholder="Enter new password (minimum 8 characters)"
                      minLength={8}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="passwordConfirm">Confirm New Password</Label>
                    <Input
                      id="passwordConfirm"
                      type="password"
                      value={formData.passwordConfirm}
                      onChange={(e) => handleFormChange("passwordConfirm", e.target.value)}
                      placeholder="Confirm your new password"
                      minLength={8}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsUpdateModalOpen(false)}
                  disabled={updating}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updating}
                  onClick={() => console.log("Update button clicked!")}
                >
                  {updating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {updating ? "Updating..." : "Update"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
