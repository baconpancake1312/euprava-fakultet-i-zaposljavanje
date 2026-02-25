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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { 
  Loader2, 
  FileText, 
  X, 
  User, 
  GraduationCap, 
  Briefcase, 
  Plus,
  Edit,
  Save,
  CheckCircle2,
  Download
} from "lucide-react"

export default function CandidateProfilePage() {
  const router = useRouter()
  const { isAuthenticated, isLoading, user, token } = useAuth()
  const [candidateId, setCandidateId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    major: "",
    year: 1,
    scholarship: false,
    highschool_gpa: 0,
    gpa: 0,
    esbp: 0,
    cv_base64: "",
    profile_pic_base64: "",
    skills: [] as string[],
    skillInput: "",
  })
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
      return
    }

    const loadCandidateData = async () => {
      if (!token || !user?.id) {
        console.log("No token or user ID:", { token: !!token, userId: user?.id })
        setLoadingData(false)
        return
      }

      setLoadingData(true)
      try {
        console.log("Fetching all candidates to find match for user email:", user.email)
        
        // Get all candidates and find the one matching the user's email
        const candidates = await apiClient.getAllCandidates(token) as any[]
        console.log("All candidates:", candidates)
        
        const candidate = candidates.find((c: any) => 
          c.email === user.email || 
          c.id === user.id ||
          c.user_id === user.id
        )
        
        console.log("Matched candidate:", candidate)
        
        if (candidate && candidate.id) {
          console.log("Found candidate with ID:", candidate.id)
          setCandidateId(candidate.id)
          setIsCreating(false)
          setIsEditing(false) // Start in view mode if profile exists
          setFormData({
            major: candidate.major || "",
            year: candidate.year || 1,
            scholarship: candidate.scholarship || false,
            highschool_gpa: candidate.highschool_gpa || 0,
            gpa: candidate.gpa || 0,
            esbp: candidate.esbp || 0,
            cv_base64: candidate.cv_base64 || "",
            profile_pic_base64: candidate.profile_pic_base64 || "",
            skills: Array.isArray(candidate.skills) ? candidate.skills : [],
            skillInput: "",
          })
        } else {
          console.log("Candidate response exists but no ID, setting create mode")
          setIsCreating(true)
          setIsEditing(true) // Start in edit mode if creating
        }
      } catch (err) {
        console.error("Failed to load candidate data:", err)
        // If 404, candidate doesn't exist yet - allow creation
        setIsCreating(true)
        setIsEditing(true)
      } finally {
        setLoadingData(false)
      }
    }

    loadCandidateData()
  }, [isAuthenticated, isLoading, router, token, user])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("File size must be less than 5MB")
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string
        setFormData((prev) => ({ ...prev, cv_base64: base64 }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type (images only)
      if (!file.type.startsWith('image/')) {
        setError("Please select an image file")
        return
      }
      // Validate file size (max 2MB for profile pics)
      if (file.size > 2 * 1024 * 1024) {
        setError("Profile picture must be less than 2MB")
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string
        setFormData((prev) => ({ ...prev, profile_pic_base64: base64 }))
      }
      reader.readAsDataURL(file)
    }
  }

  const downloadCV = () => {
    if (!formData.cv_base64) return

    try {
      // Extract the base64 data (remove data:application/pdf;base64, prefix if present)
      const base64Data = formData.cv_base64.includes(',') 
        ? formData.cv_base64.split(',')[1] 
        : formData.cv_base64

      // Convert base64 to blob
      const byteCharacters = atob(base64Data)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      
      // Determine file type from base64 string
      let mimeType = 'application/pdf'
      if (formData.cv_base64.includes('application/pdf')) {
        mimeType = 'application/pdf'
      } else if (formData.cv_base64.includes('application/msword') || formData.cv_base64.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
        mimeType = formData.cv_base64.includes('vnd.openxmlformats') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/msword'
      }
      
      const blob = new Blob([byteArray], { type: mimeType })
      const url = window.URL.createObjectURL(blob)
      
      // Create download link
      const link = document.createElement('a')
      link.href = url
      link.download = `CV_${user?.first_name || 'Candidate'}_${user?.last_name || ''}.pdf`
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error downloading CV:", error)
      setError("Failed to download CV. Please try again.")
    }
  }

  const addSkill = () => {
    if (formData.skillInput.trim() && !formData.skills.includes(formData.skillInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, prev.skillInput.trim()],
        skillInput: "",
      }))
    }
  }

  const removeSkill = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(false)
    setLoading(true)

    try {
      if (!token || !user?.id) throw new Error("Not authenticated")

      const updateData = {
        major: formData.major,
        year: formData.year,
        scholarship: formData.scholarship,
        highschool_gpa: formData.highschool_gpa,
        gpa: formData.gpa,
        esbp: formData.esbp,
        cv_base64: formData.cv_base64,
        profile_pic_base64: formData.profile_pic_base64,
        skills: formData.skills,
      }

      if (isCreating || !candidateId) {
        // Create new candidate profile with user ID as the candidate ID
        console.log("Creating candidate profile for user:", user.id)
        console.log("Profile data:", updateData)
        const newCandidate = await apiClient.createCandidate(
          {
            id: user.id,  // Set the candidate ID to match the auth user ID
            ...updateData,
          },
          token
        ) as any
        console.log("Created candidate:", newCandidate)
        const createdId = newCandidate?.id || newCandidate?._id || user.id
        setCandidateId(createdId)
        setIsCreating(false)
        setIsEditing(false)
        setSuccess(true)
        
        // Reload the profile to show the saved data
        setTimeout(() => window.location.reload(), 1000)
      } else {
        // Update existing profile
        console.log("Updating candidate:", candidateId, updateData)
        await apiClient.updateCandidate(candidateId, updateData, token)
        setSuccess(true)
        setIsEditing(false) // Switch back to view mode after successful save
      }
      
      setTimeout(() => setSuccess(false), 5000)
    } catch (err) {
      console.error("Save error:", err)
      setError(err instanceof Error ? err.message : "Failed to save profile")
    } finally {
      setLoading(false)
    }
  }

  if (isLoading || loadingData) {
    return (
      <DashboardLayout title="Profile">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Profile">
      <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              My Profile
            </h2>
            <p className="text-muted-foreground mt-1">
              {isCreating 
                ? "Complete your profile to get started" 
                : isEditing 
                  ? "Update your professional information" 
                  : "View your professional profile"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {success && (
              <Badge className="bg-green-500/10 text-green-600 border-green-500/20 flex items-center gap-2 px-3 py-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Saved!
              </Badge>
            )}
            {!isCreating && !isEditing && (
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>

        {/* Profile Picture Card */}
        <Card className="border-2 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle>Profile Picture</CardTitle>
            </div>
            <CardDescription>Upload a professional profile picture</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative">
                {formData.profile_pic_base64 ? (
                  <img
                    src={formData.profile_pic_base64}
                    alt="Profile"
                    className="h-24 w-24 rounded object-cover"
                  />
                ) : (
                  <div className="h-24 w-24 rounded bg-muted flex items-center justify-center">
                    <User className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              {isEditing || isCreating ? (
                <div className="flex-1">
                  <Label htmlFor="profile-pic" className="cursor-pointer">
                    <Button type="button" variant="outline" asChild>
                      <span>Change Picture</span>
                    </Button>
                  </Label>
                  <input
                    id="profile-pic"
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePicChange}
                    className="hidden"
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Edit profile to change picture</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Personal Information Card (Read-only from Auth Service) */}
        {user && (
          <Card className="border-2 shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle>Personal Information</CardTitle>
              </div>
              <CardDescription>Your basic account information (managed in account settings)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Full Name</Label>
                  <p className="font-medium mt-1">
                    {user.first_name} {user.last_name}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Email</Label>
                  <p className="font-medium mt-1">{user.email}</p>
                </div>
                {user.phone && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Phone</Label>
                    <p className="font-medium mt-1">{user.phone}</p>
                  </div>
                )}
                {user.address && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Address</Label>
                    <p className="font-medium mt-1">{user.address}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Form/View - Single Page */}
        {isEditing || isCreating ? (
          // EDIT MODE
          <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive" className="border-destructive/50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Academic Information Section */}
          <Card className="border-2 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                Academic Information
              </CardTitle>
              <CardDescription>Your educational background and achievements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="major">Major / Field of Study *</Label>
                      <Input
                        id="major"
                        placeholder="e.g., Computer Science"
                        value={formData.major}
                        onChange={(e) => setFormData((prev) => ({ ...prev, major: e.target.value }))}
                        disabled={loading}
                        required
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="year">Academic Year *</Label>
                      <Input
                        id="year"
                        type="number"
                        min="1"
                        max="8"
                        value={formData.year}
                        onChange={(e) => setFormData((prev) => ({ ...prev, year: parseInt(e.target.value) || 1 }))}
                        disabled={loading}
                        required
                        className="h-11"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="gpa">Current GPA *</Label>
                      <Input
                        id="gpa"
                        type="number"
                        step="0.01"
                        min="0"
                        max="10"
                        placeholder="0.00"
                        value={formData.gpa || ""}
                        onChange={(e) => setFormData((prev) => ({ ...prev, gpa: parseFloat(e.target.value) || 0 }))}
                        disabled={loading}
                        required
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="highschool_gpa">High School GPA *</Label>
                      <Input
                        id="highschool_gpa"
                        type="number"
                        step="0.01"
                        min="0"
                        max="10"
                        placeholder="0.00"
                        value={formData.highschool_gpa || ""}
                        onChange={(e) => setFormData((prev) => ({ ...prev, highschool_gpa: parseFloat(e.target.value) || 0 }))}
                        disabled={loading}
                        required
                        className="h-11"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="esbp">ESBP Points *</Label>
                      <Input
                        id="esbp"
                        type="number"
                        min="0"
                        placeholder="0"
                        value={formData.esbp || ""}
                        onChange={(e) => setFormData((prev) => ({ ...prev, esbp: parseInt(e.target.value) || 0 }))}
                        disabled={loading}
                        required
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="scholarship">Scholarship Status</Label>
                      <div className="flex items-center space-x-2 h-11">
                        <input
                          id="scholarship"
                          type="checkbox"
                          checked={formData.scholarship}
                          onChange={(e) => setFormData((prev) => ({ ...prev, scholarship: e.target.checked }))}
                          disabled={loading}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <Label htmlFor="scholarship" className="text-sm font-normal cursor-pointer">
                          I receive a scholarship
                        </Label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

          {/* Professional Information Section */}
          <Card className="border-2 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Professional Information
              </CardTitle>
              <CardDescription>Your CV, skills, and professional details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cv">CV / Resume (PDF, DOC, DOCX) - Max 5MB</Label>
                    <Input 
                      id="cv" 
                      type="file" 
                      accept=".pdf,.doc,.docx" 
                      onChange={handleFileChange} 
                      disabled={loading}
                      className="h-11 cursor-pointer"
                    />
                    {formData.cv_base64 && (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg flex-1">
                          <FileText className="h-4 w-4 text-primary" />
                          <span>CV uploaded and ready</span>
                        </div>
                        <Button
                          type="button"
                          onClick={downloadCV}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                          disabled={loading}
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Upload your resume to help employers learn more about your experience
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="skills">Skills</Label>
                    <div className="flex gap-2">
                      <Input
                        id="skills"
                        placeholder="Add a skill (e.g., Python, Communication, Leadership)"
                        value={formData.skillInput}
                        onChange={(e) => setFormData((prev) => ({ ...prev, skillInput: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            addSkill()
                          }
                        }}
                        disabled={loading}
                        className="h-11"
                      />
                      <Button type="button" onClick={addSkill} disabled={loading} className="h-11 px-6">
                        Add
                      </Button>
                    </div>
                    {formData.skills.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3 p-3 bg-muted/30 rounded-lg">
                        {formData.skills.map((skill) => (
                          <Badge key={skill} variant="secondary" className="gap-2 px-3 py-1.5 text-sm">
                            {skill}
                            <button
                              type="button"
                              onClick={() => removeSkill(skill)}
                              className="hover:text-destructive transition-colors"
                              disabled={loading}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    {formData.skills.length === 0 && (
                      <p className="text-sm text-muted-foreground">Add your skills to help employers find you</p>
                    )}
                  </div>
                </CardContent>
              </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                if (isCreating) {
                  router.back()
                } else {
                  setIsEditing(false)
                  // Reload to discard changes
                  window.location.reload()
                }
              }} 
              disabled={loading} 
              className="h-11 px-6"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="h-11 px-8 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {isCreating ? "Create Profile" : "Save Changes"}
                </>
              )}
            </Button>
          </div>
        </form>
        ) : (
          // VIEW MODE - Display profile data
          <div className="space-y-6">
            {/* Academic Information Section */}
            <Card className="border-2 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  Academic Information
                </CardTitle>
                <CardDescription>Your educational background and achievements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Major / Field of Study</Label>
                        <p className="font-medium mt-1">{formData.major || "Not specified"}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Academic Year</Label>
                        <p className="font-medium mt-1">Year {formData.year}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Current GPA</Label>
                        <p className="font-medium mt-1">{formData.gpa.toFixed(2)}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">High School GPA</Label>
                        <p className="font-medium mt-1">{formData.highschool_gpa.toFixed(2)}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">ESBP Points</Label>
                        <p className="font-medium mt-1">{formData.esbp}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Scholarship Status</Label>
                        <p className="font-medium mt-1 flex items-center gap-2">
                          {formData.scholarship ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                              <span>Receiving Scholarship</span>
                            </>
                          ) : (
                            "No Scholarship"
                          )}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

            {/* Professional Information Section */}
            <Card className="border-2 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  Professional Information
                </CardTitle>
                <CardDescription>Your CV, skills, and professional details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">CV / Resume</Label>
                      {formData.cv_base64 ? (
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-2 text-sm p-3 bg-muted/30 rounded-lg flex-1">
                            <FileText className="h-4 w-4 text-primary" />
                            <span>CV uploaded and available</span>
                          </div>
                          <Button
                            onClick={downloadCV}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Download CV
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-1">No CV uploaded</p>
                      )}
                    </div>

                    <div>
                      <Label className="text-sm text-muted-foreground">Skills</Label>
                      {formData.skills.length > 0 ? (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {formData.skills.map((skill) => (
                            <Badge key={skill} variant="secondary" className="px-3 py-1.5 text-sm">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-1">No skills added yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
