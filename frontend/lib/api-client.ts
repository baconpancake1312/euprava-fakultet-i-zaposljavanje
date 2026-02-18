import type { LoginCredentials, RegisterData, AuthResponse, EmployerData, Employer } from "./types"

const AUTH_API_URL = process.env.NEXT_PUBLIC_AUTH_API_URL || "http://localhost:8080"
const EMPLOYMENT_API_URL = process.env.NEXT_PUBLIC_EMPLOYMENT_API_URL || "http://localhost:8089"
const UNIVERSITY_API_URL = process.env.NEXT_PUBLIC_UNIVERSITY_API_URL || "http://localhost:8088"

class ApiClient {
  // Get user notifications from university service
  async getUserNotifications(userId: string, token?: string) {
    try {
      const response = await fetch(`${UNIVERSITY_API_URL}/notifications/user/${userId}`, {
        headers: this.getAuthHeaders(token),
      })
      
      if (!response.ok) {
        console.error("Failed to fetch notifications:", response.statusText)
        return []
      }
      
      return await response.json()
    } catch (error) {
      console.error("Error fetching notifications:", error)
      return []
    }
  }

  async markNotificationAsSeen(notificationId: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/notifications/${notificationId}/seen`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
    })
    
    if (!response.ok) throw new Error("Failed to mark notification as seen")
    return response.json()
  }

  async deleteNotification(notificationId: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/notifications/${notificationId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(token),
    })
    
    if (!response.ok) throw new Error("Failed to delete notification")
    return response.ok
  }
  private getAuthHeaders(token?: string) {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    return headers
  }

  // Employment Service APIs - Messaging
  async sendMessage(data: any, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/messages`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error("Failed to send message")
    return response.json()
  }

  async getMessagesBetweenUsers(userAId: string, userBId: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/messages/${userAId}/${userBId}`, {
      headers: this.getAuthHeaders(token),
    })
    if (!response.ok) throw new Error("Failed to fetch messages")
    return response.json()
  }

  async createExamSession(data: any, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/exam-sessions/create`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error("Failed to create exam session")
    return response.json()
  }

  async updateExamSession(id: string, data: any, token: string) {
    // Ensure we only send the exact fields - create a clean copy
    const cleanData = {
      subject_id: String(data.subject_id || ""),
      exam_date: String(data.exam_date || ""),
      location: String(data.location || ""),
      max_students: typeof data.max_students === "number" ? data.max_students : parseInt(String(data.max_students || 1), 10)
    }
    
    const requestBody = JSON.stringify(cleanData)
    console.log("API Client - Request body being sent:", requestBody)
    console.log("API Client - Clean data object:", cleanData)
    
    const response = await fetch(`${UNIVERSITY_API_URL}/exam-sessions/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
      body: requestBody,
    })

    if (!response.ok) throw new Error("Failed to update exam session")
    return response.json()
  }

  async deleteExamSession(id: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/exam-sessions/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to delete exam session")
  }

  async registerForExamSession(data: any, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/exam-registrations/register`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Failed to register for exam session" }))
      throw new Error(errorData.error || "Failed to register for exam session")
    }
    return response.json()
  }

  async deregisterFromExamSession(studentId: string, courseId: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/exam-registrations/deregister/${studentId}/${courseId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to deregister from exam session")
  }

  async getStudentExamRegistrations(studentId: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/exam-registrations/student/${studentId}`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch student exam registrations")
    return response.json()
  }

  async getPassedCorusesForStudent(studentId: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/subjects/passed/${studentId}`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch courses")
    return response.json()
  }

  async getAllExamGradesForStudent(studentId: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/exam-grades/student/${studentId}`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch courses")
    return response.json()
  }
  // Legacy exam methods for backward compatibility (deprecated)
  async getAllExams(token: string) {
    return this.getAllExamSessions(token)
  }

  async getExamById(id: string, token: string) {
    return this.getExamSessionById(id, token)
  }

  async registerExam(data: any, token: string) {
    return this.registerForExamSession(data, token)
  }

  async deregisterExam(studentId: string, courseId: string, token: string) {
    return this.deregisterFromExamSession(studentId, courseId, token)
  }

  async getExamCalendar(token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/exams/calendar`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch exam calendar")
    return response.json()
  }

  async manageExams(data: any, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/manage-exams`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error("Failed to manage exams")
    return response.json()
  }

  async cancelExam(id: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/cancel-exam/${id}`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to cancel exam")
    return response.json()
  }

  // University Service APIs - Administrators
  async getAllAdministrators(token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/administrators`, {
      headers: this.getAuthHeaders(token),
    })
    if (!response.ok) throw new Error("Failed to mark messages as read")
    return response.json()
  }

  // Employment Service APIs - Interviews
  async createInterview(data: any, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/interviews`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error("Failed to schedule interview")
    return response.json()
  }

  async getInterviewsByCandidate(candidateId: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/interviews/candidate/${candidateId}`, {
      headers: this.getAuthHeaders(token),
    })
    if (!response.ok) throw new Error("Failed to fetch candidate interviews")
    return response.json()
  }

  async getInterviewsByEmployer(employerId: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/interviews/employer/${employerId}`, {
      headers: this.getAuthHeaders(token),
    })
    if (!response.ok) throw new Error("Failed to fetch employer interviews")
    return response.json()
  }

  async updateInterviewStatus(interviewId: string, status: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/interviews/${interviewId}/status`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({ status }),
    })
    if (!response.ok) throw new Error("Failed to update interview status")
    return response.json()
  }

  // Candidate Saved Jobs - Updated to match Postman collection
  async saveJob(candidateId: string, jobId: string, token: string) {
    // Try new endpoint first, fallback to legacy
    const response = await fetch(`${EMPLOYMENT_API_URL}/saved-jobs`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({
        candidate_id: candidateId,
        job_id: jobId,
      }),
    });
    if (!response.ok) {
      // Fallback to legacy endpoint
      const legacyResponse = await fetch(`${EMPLOYMENT_API_URL}/candidates/${candidateId}/save-job/${jobId}`, {
        method: "POST",
        headers: this.getAuthHeaders(token),
      });
      if (!legacyResponse.ok) throw new Error("Failed to save job");
      return legacyResponse.json();
    }
    return response.json();
  }

  async unsaveJob(candidateId: string, jobId: string, token: string) {
    // Try new endpoint first, fallback to legacy
    const response = await fetch(`${EMPLOYMENT_API_URL}/saved-jobs/candidate/${candidateId}/job/${jobId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(token),
    });
    if (!response.ok) {
      // Fallback to legacy endpoint
      const legacyResponse = await fetch(`${EMPLOYMENT_API_URL}/candidates/${candidateId}/save-job/${jobId}`, {
        method: "DELETE",
        headers: this.getAuthHeaders(token),
      });
      if (!legacyResponse.ok) throw new Error("Failed to unsave job");
      return legacyResponse.json();
    }
    return response.json();
  }

  async getSavedJobs(candidateId: string, token: string) {
    // Try new endpoint first, fallback to legacy
    const response = await fetch(`${EMPLOYMENT_API_URL}/saved-jobs/candidate/${candidateId}`, {
      headers: this.getAuthHeaders(token),
    });
    if (!response.ok) {
      // Fallback to legacy endpoint
      const legacyResponse = await fetch(`${EMPLOYMENT_API_URL}/candidates/${candidateId}/saved-jobs`, {
        headers: this.getAuthHeaders(token),
      });
      if (!legacyResponse.ok) throw new Error("Failed to fetch saved jobs");
      return legacyResponse.json();
    }
    const data = await response.json();
    return data.saved_jobs || data;
  }

  async getJobRecommendations(token: string, limit: number = 10) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/search/jobs/recommendations?limit=${limit}`, {
      headers: this.getAuthHeaders(token),
    });
    if (!response.ok) throw new Error("Failed to fetch job recommendations");
    return response.json();
  }

  async getCandidateApplicationStats(candidateId: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/applications/candidate/${candidateId}/stats`, {
      headers: this.getAuthHeaders(token),
    });
    if (!response.ok) throw new Error("Failed to fetch application statistics");
    return response.json();
  }

  // Employment Service APIs - Internships
  async getInternships(token?: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/internships`, {
      headers: this.getAuthHeaders(token),
    });
    if (!response.ok) throw new Error("Failed to fetch internships");
    return response.json();
  }

  async getInternshipsForStudent(studentId: string, token?: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/internships/student/${studentId}`, {
      headers: this.getAuthHeaders(token),
    });
    if (!response.ok) throw new Error("Failed to fetch internships for student");
    return response.json();
  }

  // Auth Service APIs
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(`${AUTH_API_URL}/users/login`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(credentials),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Login failed" }))
      throw new Error(error.message || "Login failed")
    }

    const data = await response.json()

    // Normalize user ID field (API returns ID, but we use id)
    if (data.user && data.user.ID && !data.user.id) {
      data.user.id = data.user.ID
    }

    return data
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await fetch(`${AUTH_API_URL}/users/register`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    })

    // Handle non-OK responses
    if (!response.ok) {
      let errorMessage = "Registration failed"
      try {
        const errorData = await response.json()
        // Your API sends { "error": "message" }
        errorMessage = errorData.error || errorMessage
      } catch {
        // fallback in case JSON parsing fails
        errorMessage = "Registration failed (invalid server response)"
      }
      throw new Error(errorMessage)
    }

    const responseData = await response.json()

    // Normalize user ID field (API returns ID, but we use id)
    if (responseData.user && responseData.user.ID && !responseData.user.id) {
      responseData.user.id = responseData.user.ID
    }

    return responseData
  }

  async logout(token: string): Promise<void> {
    const response = await fetch(`${AUTH_API_URL}/users/logout`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) {
      throw new Error("Logout failed")
    }
  }

  async updateUserInfo(id: string, data: any, token: string) {
    const response = await fetch(`${AUTH_API_URL}/users/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error("Failed to update user profile")
    return response.json()
  }

  // Employment Service APIs - Job Listings
  async getJobListings(token?: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/job-listings`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) {
      throw new Error("Failed to fetch job listings")
    }

    const data = await response.json()

    if (!Array.isArray(data)) {
      return []
    }

    return data
  }

  async searchJobsByText(query: string, page: number = 1, limit: number = 20) {
    const response = await fetch(
      `${EMPLOYMENT_API_URL}/search/jobs/text?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`,
      {
        headers: this.getAuthHeaders(),
      }
    )

    if (!response.ok) throw new Error("Failed to search jobs")
    const data = await response.json()
    return {
      jobs: data.jobs || [],
      total: data.total || 0,
      page: data.page || page,
      limit: data.limit || limit,
    }
  }

  async searchJobsByInternship(isInternship: boolean, page: number = 1, limit: number = 20) {
    const response = await fetch(
      `${EMPLOYMENT_API_URL}/search/jobs/internship?internship=${isInternship}&page=${page}&limit=${limit}`,
      {
        headers: this.getAuthHeaders(),
      }
    )

    if (!response.ok) throw new Error("Failed to search jobs by internship")
    const data = await response.json()
    return {
      jobs: data.jobs || [],
      total: data.total || 0,
      page: data.page || page,
      limit: data.limit || limit,
    }
  }

  async getActiveJobs(limit: number = 20) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/search/jobs/active?limit=${limit}`, {
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) throw new Error("Failed to fetch active jobs")
    const data = await response.json()
    return data.active_jobs || []
  }

  async getTrendingJobs(limit: number = 10) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/search/jobs/trending?limit=${limit}`, {
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) throw new Error("Failed to fetch trending jobs")
    const data = await response.json()
    return data.trending_jobs || []
  }

  async getJobListingById(id: string, token?: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/job-listings/${id}`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch job listing")
    return response.json()
  }

  async createJobListing(data: any, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/job-listings`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error("Failed to create job listing")
    return response.json()
  }

  async updateJobListing(id: string, data: any, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/job-listings/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error("Failed to update job listing")
    return response.json()
  }

  async deleteJobListing(id: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/job-listings/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to delete job listing")
    return response.json()
  }

  // Employment Service APIs - Applications
  async getApplications(token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/applications`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch applications")
    return response.json()
  }

  async getApplicationsByCandidate(candidateId: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/applications/candidate/${candidateId}`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch candidate applications")
    return response.json()
  }

  async getApplicationsByEmployer(employerId: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/applications/employer/${employerId}`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch employer applications")
    return response.json()
  }

  async acceptApplication(applicationId: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/applications/${applicationId}/accept`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to accept application")
    return response.json()
  }

  async rejectApplication(applicationId: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/applications/${applicationId}/reject`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to reject application")
    return response.json()
  }

  async getApplicationById(id: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/applications/${id}`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch application")
    return response.json()
  }

  async applyToJob(listingId: string, data: any, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/applications`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({ ...data, listing_id: listingId }),
    })

    if (!response.ok) throw new Error("Failed to apply to job")
    return response.json()
  }

  async updateApplication(id: string, data: any, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/applications/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error("Failed to update application")
    return response.json()
  }

  async deleteApplication(id: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/applications/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to delete application")
  }

  // Employment Service APIs - Employers
  async getEmployers(token: string): Promise<Employer[]> {
    const response = await fetch(`${EMPLOYMENT_API_URL}/employers`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) {
      throw new Error("Failed to fetch employers")
    }

    const data = await response.json()

    if (!Array.isArray(data)) {
      return []
    }

    return data
  }

  async getEmployerById(id: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/employers/${id}`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch employer")
    return response.json()
  }

  async getEmployerByUserId(userId: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/employers/user/${userId}`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch employer")
    return response.json()
  }

  async createEmployer(data: any, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/employers`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error("Failed to create employer")
    return response.json()
  }

  async updateEmployer(id: string, data: any, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/employers/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error("Failed to update employer")
    return response.json()
  }

  async deleteEmployer(id: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/employers/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to delete employer")
  }

  // Employment Service APIs - Companies
  async getCompanies(token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/companies`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch companies")
    return response.json()
  }

  async getCompanyByEmployer(employerId: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/companies/employer/${employerId}`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch company profile")
    return response.json()
  }

  async updateCompany(companyId: string, data: any, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/companies/${companyId}`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error("Failed to update company profile")
    return response.json()
  }

  // Employment Service APIs - Candidates
  async getCandidates(token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/candidates`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch candidates")
    return response.json()
  }

  async getCandidateById(id: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/candidates/${id}`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch candidate")
    return response.json()
  }

  async getCandidateByUserId(userId: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/candidates/user/${userId}`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch candidate by user ID")
    return response.json()
  }

  async createCandidate(data: any, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/candidates`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error("Failed to create candidate")
    return response.json()
  }

  async updateCandidate(id: string, data: any, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/candidates/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error("Failed to update candidate")
    return response.json()
  }

  async deleteCandidate(id: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/candidates/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to delete candidate")
  }

  // Employment Service APIs - Admin Approve/Reject
  async approveJobListing(id: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/admin/jobs/${id}/approve`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to approve job listing")
    return response.json()
  }

  async rejectJobListing(id: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/admin/jobs/${id}/reject`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to reject job listing")
    return response.json()
  }

  async approveEmployer(id: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/admin/employers/${id}/approve`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to approve employer")
    return response.json()
  }

  async rejectEmployer(id: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/admin/employers/${id}/reject`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to reject employer")
    return response.json()
  }

  async getPendingJobListings(token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/admin/jobs/pending`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch pending job listings")
    return response.json()
  }

  async getPendingEmployers(token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/admin/employers/pending`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch pending employers")
    return response.json()
  }

  async getEmployerStats(token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/admin/employers/stats`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch employer stats")
    return response.json()
  }

  async getApplicationsForJob(jobId: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/job-listings/${jobId}/applications`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch applications for job")
    return response.json()
  }
}

export const apiClient = new ApiClient()
