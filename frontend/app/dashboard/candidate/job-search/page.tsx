"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Briefcase, Building, Calendar, Search, Filter, Bookmark, BookmarkCheck, Star, ArrowRight } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function CandidateJobSearchPage() {
  const { token, user, isLoading: authLoading, isAuthenticated } = useAuth()
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [jobType, setJobType] = useState<"all" | "internship" | "fulltime">("all")
  const [applying, setApplying] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set())
  const [totalResults, setTotalResults] = useState(0)
  const { toast } = useToast()

  const [matchScoresLoaded, setMatchScoresLoaded] = useState(false)

  const performSearch = useCallback(async () => {
    if (!token) return

    setSearching(true)
    setError("")

    try {
      let results: any[] = []
      let total = 0

      if (searchTerm.trim()) {
        // Use text search if there's a search term
        const searchResult = await apiClient.searchJobsByText(searchTerm.trim(), 1, 50)
        results = searchResult.jobs || []
        total = searchResult.total || 0

        // Apply job type filter if specified
        if (jobType !== "all") {
          const isInternship = jobType === "internship"
          results = results.filter((listing: any) => listing.is_internship === isInternship)
          total = results.length
        }
      } else if (jobType !== "all") {
        // Use internship filter if job type is specified (no text search)
        const isInternship = jobType === "internship"
        const searchResult = await apiClient.searchJobsByInternship(isInternship, 1, 50)
        results = searchResult.jobs || []
        total = searchResult.total || 0
      } else {
        // Load all approved jobs (no filters)
        const data = await apiClient.getJobListings(token)
        results = data.filter((listing: any) => listing.approval_status?.toLowerCase() === "approved")
        total = results.length
      }

      setListings(results)
      setTotalResults(total)
      setMatchScoresLoaded(false) // Reset when new search happens
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search job listings")
      setListings([])
      setTotalResults(0)
    } finally {
      setSearching(false)
      setLoading(false)
    }
  }, [searchTerm, jobType, token])

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return
    }

    // If not authenticated, don't load data
    if (!isAuthenticated || !token || !user) {
      setLoading(false)
      setError("Please log in to view job listings")
      return
    }

    loadInitialListings()
    loadSavedJobs()
  }, [token, user, authLoading, isAuthenticated])

  const loadSavedJobs = async () => {
    if (!token || !user) return
    try {
      // Find candidate ID by email match (same as profile page)
      const candidates = await apiClient.getAllCandidates(token) as any[]
      const candidate = candidates.find((c: any) => 
        c.email === user.email || 
        c.id === user.id ||
        c.user_id === user.id
      )

      if (!candidate || !candidate.id) {
        // No candidate profile yet - that's okay, just skip saved jobs
        return
      }

      const data = await apiClient.getSavedJobs(candidate.id, token)
      // Handle different response structures
      let jobs: any[] = []
      if (Array.isArray(data)) {
        jobs = data
      } else if (data && typeof data === 'object') {
        jobs = data.saved_jobs || data.jobs || data.data || []
      }
      const savedIds = new Set(jobs.map((job: any) => {
        const jobObj = job.job || job.job_listing || job
        return jobObj?.id || jobObj?.job_id || job.id || job.job_id
      }))
      setSavedJobIds(savedIds)
    } catch (err) {
      // Silently fail - saved jobs are optional
      console.log("Failed to load saved jobs:", err)
    }
  }

  const loadInitialListings = async () => {
    setLoading(true)
    setMatchScoresLoaded(false) // Reset flag for new load
    try {
      if (!token) {
        setError("Not authenticated")
        return
      }
      const data = await apiClient.getJobListings(token)
      const approved = data.filter((listing: any) => listing.approval_status?.toLowerCase() === "approved")
      setListings(approved)
      setTotalResults(approved.length)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load job listings")
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    performSearch()
  }

  // Auto-search when job type filter changes
  useEffect(() => {
    if (!loading && token && !authLoading && isAuthenticated) {
      performSearch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobType])

  const handleApply = async (listingId: string) => {
    setApplying(listingId)
    try {
      if (!token || !user?.id) throw new Error("Not authenticated")
      await apiClient.applyToJob(listingId, { applicant_id: user.id }, token)
      toast({
        title: "Application Submitted",
        description: "Your application has been successfully submitted to the employer.",
      })
      setError("")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to apply"
      setError(errorMessage)
      toast({
        title: "Application Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setApplying(null)
    }
  }

  const handleSaveJob = async (jobId: string) => {
    if (!token || !user) return
    setSaving(jobId)
    try {
      // Find candidate ID by email match
      const candidates = await apiClient.getAllCandidates(token) as any[]
      const candidate = candidates.find((c: any) => 
        c.email === user.email || 
        c.id === user.id ||
        c.user_id === user.id
      )

      if (!candidate || !candidate.id) {
        toast({
          title: "Error",
          description: "Please complete your profile first",
          variant: "destructive",
        })
        return
      }

      if (savedJobIds.has(jobId)) {
        await apiClient.unsaveJob(candidate.id, jobId, token)
        setSavedJobIds((prev) => {
          const next = new Set(prev)
          next.delete(jobId)
          return next
        })
        toast({
          title: "Job Removed",
          description: "Job removed from your saved jobs.",
        })
      } else {
        await apiClient.saveJob(candidate.id, jobId, token)
        setSavedJobIds((prev) => new Set(prev).add(jobId))
        toast({
          title: "Job Saved",
          description: "Job saved to your favorites.",
        })
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to save/unsave job",
        variant: "destructive",
      })
    } finally {
      setSaving(null)
    }
  }

  useEffect(() => {
    // Load match scores for displayed listings if user is a candidate
    // Only load once per search result set
    if (!loading && !searching && listings.length > 0 && !matchScoresLoaded && token && user?.user_type === "CANDIDATE") {
      loadMatchScores()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings.length, loading, searching, matchScoresLoaded])

  const loadMatchScores = async () => {
    if (!token || !user?.id || matchScoresLoaded) return
    
    try {
      // Get recommendations which include match scores
      const recommendations = await apiClient.getJobRecommendations(token, 50)
      const recommendationsMap = new Map()
      
      // Handle both formats: { recommendations: [...] } or just array
      const recs = Array.isArray(recommendations) 
        ? recommendations 
        : (recommendations.recommendations || [])
      
      if (Array.isArray(recs)) {
        recs.forEach((rec: any) => {
          // Recommendations can be in format { job: {...}, match_score: ... } or just job objects
          const job = rec.job || rec
          const score = rec.match_score || rec.matchScore
          if (job && job.id) {
            recommendationsMap.set(job.id, score)
          }
        })
      }
      
      // Update listings with match scores
      setListings(prev => prev.map(listing => ({
        ...listing,
        match_score: recommendationsMap.get(listing.id) || listing.match_score
      })))
      
      setMatchScoresLoaded(true) // Mark as loaded to prevent re-fetch
    } catch (err) {
      // Silently fail - match scores are optional
      console.error("Failed to load match scores:", err)
      setMatchScoresLoaded(true) // Still mark as loaded to prevent infinite retries
    }
  }

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <DashboardLayout title="Job Search">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  // Show error if not authenticated
  if (!isAuthenticated || !token || !user) {
    return (
      <DashboardLayout title="Job Search">
        <div className="space-y-6">
          <Alert variant="destructive">
            <AlertDescription>
              Please log in to view job listings
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Job Search">
      <div className="space-y-6 animate-fadeIn">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Job Search
          </h2>
          <p className="text-muted-foreground mt-1">Find your next career opportunity</p>
        </div>

        {/* Search and Filter Section */}
        <Card className="border-2 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search jobs by title, description, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch()
                    }
                  }}
                  className="pl-10 h-12 text-base"
                />
              </div>
              <Select value={jobType} onValueChange={(value: "all" | "internship" | "fulltime") => setJobType(value)}>
                <SelectTrigger className="w-full md:w-[200px] h-12">
                  <Filter className="mr-2 h-5 w-5" />
                  <SelectValue placeholder="Job Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Jobs</SelectItem>
                  <SelectItem value="internship">Internships</SelectItem>
                  <SelectItem value="fulltime">Full-time</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={handleSearch} 
                disabled={searching}
                className="h-12 px-6 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
              >
                {searching ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-5 w-5" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Count */}
        {totalResults > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Found <span className="font-semibold text-foreground">{totalResults}</span> {totalResults === 1 ? "job" : "jobs"}
              {searchTerm && <> matching <span className="font-semibold text-foreground">"{searchTerm}"</span></>}
              {jobType !== "all" && <> ({jobType === "internship" ? "Internships" : "Full-time"})</>}
            </p>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="border-destructive/50">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading || searching ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">Loading opportunities...</p>
            </div>
          </div>
        ) : listings.length === 0 ? (
          <Card className="border-2">
            <CardContent className="py-20 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                  <Briefcase className="h-10 w-10 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-semibold">
                    {searchTerm ? "No jobs found matching your search" : "No approved job listings available"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {searchTerm ? "Try adjusting your search terms or filters" : "Check back later for new opportunities"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {listings.map((listing) => (
              <Card key={listing.id} className="border-2 hover:border-primary/50 transition-all hover:shadow-xl group relative overflow-hidden">
                {/* Gradient accent */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary to-primary/60" />
                
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10">
                          <Briefcase className="h-5 w-5 text-primary" />
                        </div>
                        <CardTitle className="text-xl group-hover:text-primary transition-colors">
                          {listing.position}
                        </CardTitle>
                      </div>
                      <CardDescription className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        <span className="font-medium">{listing.poster_name || "Company"}</span>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {listing.match_score !== undefined && (
                        <Badge variant="outline" className="flex items-center gap-1 bg-gradient-to-r from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
                          <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                          <span className="font-semibold">{listing.match_score}%</span>
                        </Badge>
                      )}
                      {listing.is_internship && (
                        <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border border-blue-500/20">
                          Internship
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSaveJob(listing.id)}
                        disabled={saving === listing.id}
                        className="h-9 w-9 hover:bg-primary/10"
                      >
                        {saving === listing.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : savedJobIds.has(listing.id) ? (
                          <BookmarkCheck className="h-5 w-5 text-primary fill-primary" />
                        ) : (
                          <Bookmark className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                    {listing.description}
                  </p>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Posted {new Date(listing.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  <Button
                    onClick={() => handleApply(listing.id)}
                    disabled={applying === listing.id}
                    className="w-full h-11 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 group-hover:scale-[1.02] transition-all"
                  >
                    {applying === listing.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Applying...
                      </>
                    ) : (
                      <>
                        Apply Now
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
