import type { LoginCredentials, RegisterData, AuthResponse, EmployerData, Employer } from "./types"
import { ApiErrorHandler, type ApiError } from "./error-handler"

const AUTH_API_URL = process.env.NEXT_PUBLIC_AUTH_API_URL || "http://localhost:8080"
const EMPLOYMENT_API_URL = process.env.NEXT_PUBLIC_EMPLOYMENT_API_URL || "http://localhost:8089"
const UNIVERSITY_API_URL = process.env.NEXT_PUBLIC_UNIVERSITY_API_URL || "http://localhost:8088"

class ApiClient {
  /**
   * Handles API response and throws standardized errors
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      await ApiErrorHandler.handleResponse(response)
    }
    return response.json()
  }

  /**
   * Handles optional responses (returns empty array/object on error)
   */
  private async handleOptionalResponse<T>(
    response: Response,
    defaultValue: T
  ): Promise<T> {
    if (!response.ok) {
      // Silently return default value for optional endpoints
      return defaultValue
    }
    return response.json()
  }
  // Get user notifications from university service
  async getUserNotifications(userId: string, token?: string) {
    try {
      const response = await fetch(`${UNIVERSITY_API_URL}/notifications/user/${userId}`, {
        headers: this.getAuthHeaders(token),
      })
      return await this.handleOptionalResponse(response, [])
    } catch (error) {
      // Silently fail for optional notifications
      return []
    }
  }

  async markNotificationAsSeen(notificationId: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/notifications/${notificationId}/seen`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  async deleteNotification(notificationId: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/notifications/${notificationId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(token),
    })
    if (!response.ok) {
      await ApiErrorHandler.handleResponse(response)
    }
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
    return this.handleResponse(response)
  }

  async getMessagesBetweenUsers(userAId: string, userBId: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/messages/${userAId}/${userBId}`, {
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  async createExamSession(data: any, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/exam-sessions/create`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })
    return this.handleResponse(response)
  }

  async updateExamSession(id: string, data: any, token: string) {
    // Ensure we only send the exact fields - create a clean copy
    const cleanData = {
      subject_id: String(data.subject_id || ""),
      exam_date: String(data.exam_date || ""),
      location: String(data.location || ""),
      max_students: typeof data.max_students === "number" ? data.max_students : parseInt(String(data.max_students || 1), 10)
    }
    
    const response = await fetch(`${UNIVERSITY_API_URL}/exam-sessions/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(cleanData),
    })
    return this.handleResponse(response)
  }

  async deleteExamSession(id: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/exam-sessions/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(token),
    })
    if (!response.ok) {
      await ApiErrorHandler.handleResponse(response)
    }
  }

  async registerForExamSession(data: any, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/exam-registrations/register`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })
    return this.handleResponse(response)
  }

  async deregisterFromExamSession(studentId: string, courseId: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/exam-registrations/deregister/${studentId}/${courseId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(token),
    })
    if (!response.ok) {
      await ApiErrorHandler.handleResponse(response)
    }
  }

  async getStudentExamRegistrations(studentId: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/exam-registrations/student/${studentId}`, {
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  async getPassedCorusesForStudent(studentId: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/subjects/passed/${studentId}`, {
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  async getAllExamGradesForStudent(studentId: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/exam-grades/student/${studentId}`, {
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }
  // Exam Session methods
  async getAllExamSessions(token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/exam-sessions`, {
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  async getExamSessionById(id: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/exam-sessions/${id}`, {
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  async getExamSessionsByProfessor(professorId: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/exam-sessions/professor/${professorId}`, {
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  async getAllExamSessionsForStudent(studentId: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/exam-sessions/student/${studentId}`, {
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  async getExamRegistrationsBySession(examSessionId: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/exam-registrations/exam-session/${examSessionId}`, {
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  async getExamGradesForExamSession(examSessionId: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/exam-grades/exam-session/${examSessionId}`, {
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  async getCoursesByProfessor(professorId: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/subjects/professor/${professorId}`, {
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
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
    return this.handleResponse(response)
  }

  async manageExams(data: any, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/manage-exams`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })
    return this.handleResponse(response)
  }

  async cancelExam(id: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/cancel-exam/${id}`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  // University Service APIs - Administrators
  async getAllAdministrators(token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/administrators`, {
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  // Employment Service APIs - Interviews
  async createInterview(data: any, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/interviews`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })
    return this.handleResponse(response)
  }

  async getInterviewsByCandidate(candidateId: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/interviews/candidate/${candidateId}`, {
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  async getInterviewsByEmployer(employerId: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/interviews/employer/${employerId}`, {
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  async updateInterviewStatus(interviewId: string, status: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/interviews/${interviewId}/status`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({ status }),
    })
    return this.handleResponse(response)
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
      if (!legacyResponse.ok) {
        await ApiErrorHandler.handleResponse(legacyResponse);
      }
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
      if (!legacyResponse.ok) {
        await ApiErrorHandler.handleResponse(legacyResponse);
      }
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
      if (!legacyResponse.ok) {
        await ApiErrorHandler.handleResponse(legacyResponse);
      }
      return legacyResponse.json();
    }
    const data = await response.json();
    return data.saved_jobs || data;
  }

  async getJobRecommendations(token: string, limit: number = 10) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/search/jobs/recommendations?limit=${limit}`, {
      headers: this.getAuthHeaders(token),
    });
    return this.handleResponse(response);
  }

  async getCandidateApplicationStats(candidateId: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/applications/candidate/${candidateId}/stats`, {
      headers: this.getAuthHeaders(token),
    });
    return this.handleResponse(response);
  }

  // Employment Service APIs - Internships
  async getInternships(token?: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/internships`, {
      headers: this.getAuthHeaders(token),
    });
    return this.handleResponse(response);
  }

  async getInternshipsForStudent(studentId: string, token?: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/internships/student/${studentId}`, {
      headers: this.getAuthHeaders(token),
    });
    return this.handleResponse(response);
  }

  // Auth Service APIs
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(`${AUTH_API_URL}/users/login`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(credentials),
    })

    if (!response.ok) {
      await ApiErrorHandler.handleResponse(response)
    }

    const data = await response.json()

    // Normalize user ID field (API returns ID, but we use id)
    if (data.user && data.user.ID && !data.user.id) {
      data.user.id = data.user.ID
    }

    return data
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    console.log("Sending registration request with data:", data) // Debug
    
    const response = await fetch(`${AUTH_API_URL}/users/register`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      // Log the full error for debugging
      const errorText = await response.text()
      console.error("Registration failed:", response.status, errorText)
      
      try {
        const errorJson = JSON.parse(errorText)
        throw new Error(errorJson.error || `Registration failed: ${response.statusText}`)
      } catch {
        throw new Error(`Registration failed: ${response.statusText} - ${errorText}`)
      }
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
      // Don't throw error for logout - just log it
      try {
        await ApiErrorHandler.handleResponse(response)
      } catch {
        // Silently fail logout errors
      }
    }
  }

  async updateUserInfo(id: string, data: any, token: string) {
    const response = await fetch(`${AUTH_API_URL}/users/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })
    return this.handleResponse(response)
  }

  // Employment Service APIs - Job Listings
  async getJobListings(token?: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/job-listings`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) {
      await ApiErrorHandler.handleResponse(response)
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

    if (!response.ok) {
      await ApiErrorHandler.handleResponse(response)
    }
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

    if (!response.ok) {
      await ApiErrorHandler.handleResponse(response)
    }
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

    if (!response.ok) {
      await ApiErrorHandler.handleResponse(response)
    }
    const data = await response.json()
    return data.active_jobs || []
  }

  async getTrendingJobs(limit: number = 10) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/search/jobs/trending?limit=${limit}`, {
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      await ApiErrorHandler.handleResponse(response)
    }
    const data = await response.json()
    return data.trending_jobs || []
  }

  async getJobListingById(id: string, token?: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/job-listings/${id}`, {
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  async createJobListing(data: any, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/job-listings`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })
    return this.handleResponse(response)
  }

  async updateJobListing(id: string, data: any, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/job-listings/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })
    return this.handleResponse(response)
  }

  async deleteJobListing(id: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/job-listings/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(token),
    })
    if (!response.ok) {
      await ApiErrorHandler.handleResponse(response)
    }
    return response.ok
  }

  // Employment Service APIs - Applications
  async getApplications(token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/applications`, {
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  async getApplicationsByCandidate(candidateId: string, token: string) {
    console.log(`[API] Fetching applications for candidate: ${candidateId}`)
    console.log(`[API] URL: ${EMPLOYMENT_API_URL}/applications/candidate/${candidateId}`)
    const response = await fetch(`${EMPLOYMENT_API_URL}/applications/candidate/${candidateId}`, {
      headers: this.getAuthHeaders(token),
    })
    const data = await this.handleResponse(response)
    console.log(`[API] Applications response:`, data)
    console.log(`[API] Applications count:`, Array.isArray(data) ? data.length : 'not an array')
    return data
  }

  async getApplicationsByEmployer(employerId: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/applications/employer/${employerId}`, {
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  async acceptApplication(applicationId: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/applications/${applicationId}/accept`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  async rejectApplication(applicationId: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/applications/${applicationId}/reject`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  async getApplicationById(id: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/applications/${id}`, {
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  async applyToJob(listingId: string, data: any, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/applications`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({ ...data, listing_id: listingId }),
    })
    return this.handleResponse(response)
  }

  async updateApplication(id: string, data: any, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/applications/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })
    return this.handleResponse(response)
  }

  async deleteApplication(id: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/applications/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(token),
    })
    if (!response.ok) {
      await ApiErrorHandler.handleResponse(response)
    }
  }

  // Employment Service APIs - Employers
  async getEmployers(token: string): Promise<Employer[]> {
    const response = await fetch(`${EMPLOYMENT_API_URL}/employers`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) {
      await ApiErrorHandler.handleResponse(response)
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
    return this.handleResponse(response)
  }

  async getEmployerByUserId(userId: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/employers/user/${userId}`, {
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  async createEmployer(data: any, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/employers`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })
    return this.handleResponse(response)
  }

  async updateEmployer(id: string, data: any, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/employers/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })
    return this.handleResponse(response)
  }

  async deleteEmployer(id: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/employers/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(token),
    })
    if (!response.ok) {
      await ApiErrorHandler.handleResponse(response)
    }
  }

  // Employment Service APIs - Companies
  async getCompanies(token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/companies`, {
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  async getCompanyByEmployer(employerId: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/companies/employer/${employerId}`, {
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  async updateCompany(companyId: string, data: any, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/companies/${companyId}`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })
    return this.handleResponse(response)
  }

  // Employment Service APIs - Candidates
  async getCandidates(token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/candidates`, {
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  async getCandidateById(id: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/candidates/${id}`, {
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  async getCandidateByUserId(userId: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/candidates/user/${userId}`, {
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  async getCandidate(candidateId: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/candidates/${candidateId}`, {
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  async getAllCandidates(token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/candidates`, {
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  async createCandidate(data: any, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/candidates`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })
    return this.handleResponse(response)
  }

  async updateCandidate(id: string, data: any, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/candidates/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })
    return this.handleResponse(response)
  }

  async deleteCandidate(id: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/candidates/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(token),
    })
    if (!response.ok) {
      await ApiErrorHandler.handleResponse(response)
    }
  }

  // Employment Service APIs - Admin Approve/Reject
  async approveJobListing(id: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/admin/jobs/${id}/approve`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  async rejectJobListing(id: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/admin/jobs/${id}/reject`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  async approveEmployer(id: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/admin/employers/${id}/approve`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  async rejectEmployer(id: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/admin/employers/${id}/reject`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  async getPendingJobListings(token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/admin/jobs/pending`, {
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  async getPendingEmployers(token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/admin/employers/pending`, {
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  async getEmployerStats(token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/admin/employers/stats`, {
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  async getApplicationsForJob(jobId: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/job-listings/${jobId}/applications`, {
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }
}

export const apiClient = new ApiClient()
