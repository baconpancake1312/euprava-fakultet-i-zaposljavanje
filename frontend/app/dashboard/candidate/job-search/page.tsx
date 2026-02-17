"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { apiClient } from "@/lib/api-client"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Briefcase, Building, Calendar, Search, Filter, Bookmark, BookmarkCheck, Star } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function CandidateJobSearchPage() {
  const { token, user } = useAuth()
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
    loadInitialListings()
    loadSavedJobs()
  }, [token, user])

  const loadSavedJobs = async () => {
    if (!token || !user?.id) return
    try {
      const data = await apiClient.getSavedJobs(user.id, token)
      const savedIds = new Set((data.saved_jobs || []).map((job: any) => job.id || job.job_id))
      setSavedJobIds(savedIds)
    } catch (err) {
      // Silently fail - saved jobs are optional
    }
  }

  const loadInitialListings = async () => {
    setLoading(true)
    try {
      if (!token) throw new Error("Not authenticated")
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
    if (!loading && token) {
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
    if (!token || !user?.id) return
    setSaving(jobId)
    try {
      if (savedJobIds.has(jobId)) {
        await apiClient.unsaveJob(user.id, jobId, token)
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
        await apiClient.saveJob(user.id, jobId, token)
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

  const calculateMatchScore = (listing: any): number => {
    // Simple match score calculation based on skills
    // This is a placeholder - real implementation would use backend match score
    if (!user) return 0
    // For now, return a random score between 60-95 for demo
    return Math.floor(Math.random() * 35) + 60
  }

  return (
    <DashboardLayout title="Job Search">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Job Search</h2>
          <p className="text-muted-foreground">Find your next career opportunity</p>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs by title or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch()
                }
              }}
              className="pl-9"
            />
          </div>
          <Select value={jobType} onValueChange={(value: "all" | "internship" | "fulltime") => setJobType(value)}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Job Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Jobs</SelectItem>
              <SelectItem value="internship">Internships</SelectItem>
              <SelectItem value="fulltime">Full-time</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleSearch} disabled={searching}>
            {searching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Search
              </>
            )}
          </Button>
        </div>

        {totalResults > 0 && (
          <p className="text-sm text-muted-foreground">
            Found {totalResults} {totalResults === 1 ? "job" : "jobs"}
            {searchTerm && ` matching "${searchTerm}"`}
            {jobType !== "all" && ` (${jobType === "internship" ? "Internships" : "Full-time"})`}
          </p>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading || searching ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : listings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? "No jobs found matching your search" : "No approved job listings available at the moment"}
              </p>
              <p className="text-sm text-muted-foreground mt-2">Check back later for new opportunities</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {listings.map((listing) => (
              <Card key={listing.id} className="hover:border-primary/50 transition-colors relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="flex items-center gap-2">
                          <Briefcase className="h-5 w-5 text-primary" />
                          {listing.position}
                        </CardTitle>
                        {listing.match_score !== undefined && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            {listing.match_score}% Match
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Building className="h-4 w-4" />
                        {listing.poster_name || "Company"}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {listing.is_internship && <Badge variant="secondary">Internship</Badge>}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSaveJob(listing.id)}
                        disabled={saving === listing.id}
                        className="h-8 w-8"
                      >
                        {saving === listing.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : savedJobIds.has(listing.id) ? (
                          <BookmarkCheck className="h-4 w-4 text-primary fill-primary" />
                        ) : (
                          <Bookmark className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-3">{listing.description}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Posted {new Date(listing.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApply(listing.id)}
                      disabled={applying === listing.id}
                      className="flex-1"
                    >
                      {applying === listing.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Applying...
                        </>
                      ) : (
                        "Apply Now"
                      )}
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
