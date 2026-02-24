import type { LoginCredentials, RegisterData, AuthResponse, EmployerData, Employer, Student, Professor, ExamPeriod, CreateExamPeriodRequest, GraduationRequest } from "./types"
import AdminProfessorsPage from '../app/dashboard/admin/professors/page';
import { ApiErrorHandler, type ApiError } from "./error-handler"

const AUTH_API_URL = process.env.NEXT_PUBLIC_AUTH_API_URL || "http://localhost:8080"
const UNIVERSITY_API_URL = process.env.NEXT_PUBLIC_UNIVERSITY_API_URL || "http://localhost:8088"
const EMPLOYMENT_API_URL = process.env.NEXT_PUBLIC_EMPLOYMENT_API_URL || "http://localhost:8089"

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

  private getAuthHeaders(token?: string) {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    return headers
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

  // University Service APIs - Students
  async getStudentById(id: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/students/${id}`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch student")
    return response.json()
  }

  async getAllStudents(token: string): Promise<Student[]> {
    const response = await fetch(`${UNIVERSITY_API_URL}/students`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) {
      throw new Error("Failed to fetch students")
    }
    const data = await response.json()

    if (!Array.isArray(data)) {
      return []
    }

    return data
  }

  async createStudent(data: any, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/students/create`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      let errorMessage = "Failed to create student"
      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorMessage
      } catch {
        // fallback if JSON parsing fails
        errorMessage = `Failed to create student (${response.status})`
      }
      const error: any = new Error(errorMessage)
      error.status = response.status
      error.response = response
      throw error
    }
    
    // Handle responses - try to parse JSON, but don't fail if it's empty or not JSON
    try {
      const text = await response.text()
      if (!text || text.trim().length === 0) {
        return {}
      }
      return JSON.parse(text)
    } catch (parseError) {
      // If parsing fails but status is OK, assume success and return empty object
      console.warn("createStudent: Response was OK but couldn't parse JSON, assuming success")
      return {}
    }
  }

  async updateStudent(id: string, data: any, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/students/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error("Failed to update student")
    return response.json()
  }

  async advanceStudent(id: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/students/${id}/advance`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
    })
    if (!response.ok) throw new Error("Failed to advance to next year")
    return response.json()
  }

  async getGraduationRequest(studentId: string, token: string): Promise<{ id: string; status: string } | null> {
    const response = await fetch(`${UNIVERSITY_API_URL}/students/${studentId}/graduation-request`, {
      headers: this.getAuthHeaders(token),
    })
    if (response.status === 404) return null
    if (!response.ok) throw new Error("Failed to fetch graduation request")
    return response.json()
  }

  async getGraduationRequestsByStudent(studentId: string, token: string): Promise<GraduationRequest[]> {
    const response = await fetch(`${UNIVERSITY_API_URL}/students/${studentId}/graduation-requests`, {
      headers: this.getAuthHeaders(token),
    })
    if (!response.ok) throw new Error("Failed to fetch graduation requests")
    const data = await response.json()
    return Array.isArray(data) ? data : []
  }

  async getGraduationRequests(token: string): Promise<GraduationRequest[]> {
    const response = await fetch(`${UNIVERSITY_API_URL}/graduation-requests`, {
      headers: this.getAuthHeaders(token),
    })
    if (!response.ok) throw new Error("Failed to fetch graduation requests")
    const data = await response.json()
    return Array.isArray(data) ? data : []
  }

  async updateGraduationRequest(
    requestId: string,
    body: { status?: string; comments?: string; student_id?: string; requested_at?: string },
    token: string
  ) {
    const response = await fetch(`${UNIVERSITY_API_URL}/students/${requestId}/graduation-request`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(body),
    })
    if (!response.ok) throw new Error("Failed to update graduation request")
    return response.json()
  }

  async deleteGraduationRequest(requestId: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/students/${requestId}/graduation-request`, {
      method: "DELETE",
      headers: this.getAuthHeaders(token),
    })
    if (!response.ok) throw new Error("Failed to delete graduation request")
  }

  async requestGraduation(id: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/students/${id}/graduation-request`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
    })
    if (!response.ok) throw new Error("Failed to submit graduation request")
    return response.json()
  }

  async deleteStudent(id: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/students/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to delete student")
  }
  async deleteUser(id: string, token: string) {
    const response = await fetch(`${AUTH_API_URL}/users/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to delete user")
  }

  // University Service APIs - Professors
  async getProfessorById(id: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/professors/${id}`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch professor")
    return response.json()
  }
  async getAllProfessors(token: string): Promise<Professor[]> {
    const response = await fetch(`${UNIVERSITY_API_URL}/professors`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) {
      throw new Error("Failed to fetch professors")
    }
    const data = await response.json()

    if (!Array.isArray(data)) {
      return []
    }

    return data
  }

  async createProfessor(data: any, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/professors/create`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error("Failed to create professor")
    return response.json()
  }

  async updateProfessor(id: string, data: any, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/professors/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error("Failed to update professor")
    return response.json()
  }

  async deleteProfessor(id: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/professors/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to delete professor")
  }

  // University Service APIs - Courses
  async getAllCourses(token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/courses`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch courses")
    return response.json()
  }

  async getSubjectsByMajor(majorId: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/majors/${majorId}/subjects`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch courses")
    return response.json()
  }

  async getAllSubjects(token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/subjects`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch subjects")
    const data = await response.json()
    return Array.isArray(data) ? data : []
  }

  async getCourseById(id: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/subject/${id}`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch course")
    return response.json()
  }

  async createCourse(data: any, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/subject/create`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })
    return this.handleResponse(response)
  }

  async getInboxMessages(userId: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/messages/inbox/${userId}`, {
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  async getSentMessages(userId: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/messages/sent/${userId}`, {
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  async updateCourse(id: string, data: any, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/subject/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })
    return this.handleResponse(response)
  }

  async markMessagesAsRead(senderId: string, receiverId: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/messages/${senderId}/${receiverId}/read`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  async deleteCourse(id: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/subject/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to delete course")
  }

  // University Service APIs - Departments
  async getAllDepartments(token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/departments`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch departments")
    return response.json()
  }

  async getDepartmentById(id: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/departments/${id}`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch department")
    return response.json()
  }

  async createDepartment(data: any, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/departments/create`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error("Failed to create department")
    return response.json()
  }

  async updateDepartment(id: string, data: any, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/departments/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error("Failed to update department")
    return response.json()
  }

  async deleteDepartment(id: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/departments/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to delete department")
  }

  // University Service APIs - Universities
  async getAllUniversities(token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/universities`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch universities")
    return response.json()
  }

  async getUniversityById(id: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/universities/${id}`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch university")
    return response.json()
  }

  async createUniversity(data: any, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/universities/create`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error("Failed to create university")
    return response.json()
  }

  async updateUniversity(id: string, data: any, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/universities/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error("Failed to update university")
    return response.json()
  }

  async deleteUniversity(id: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/universities/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to delete university")
  }

  // University Service APIs - Exam Sessions (Updated from deprecated exams API)

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
  async getAllExamSessionsForStudent(studentId: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/exam-sessions/student/${studentId}`, {
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  // Exam Periods
  async getAllExamPeriods(token: string): Promise<ExamPeriod[]> {
    const response = await fetch(`${UNIVERSITY_API_URL}/exam-periods`, {
      headers: this.getAuthHeaders(token),
    })
    const data = await this.handleResponse<ExamPeriod[]>(response)
    return Array.isArray(data) ? data : []
  }

  async getActiveExamPeriods(token: string): Promise<ExamPeriod[]> {
    const response = await fetch(`${UNIVERSITY_API_URL}/exam-periods/active`, {
      headers: this.getAuthHeaders(token),
    })
    const data = await this.handleResponse<ExamPeriod[]>(response)
    return Array.isArray(data) ? data : []
  }

  async getExamPeriodById(id: string, token: string): Promise<ExamPeriod> {
    const response = await fetch(`${UNIVERSITY_API_URL}/exam-periods/${id}`, {
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  async createExamPeriod(data: CreateExamPeriodRequest, token: string): Promise<ExamPeriod> {
    const response = await fetch(`${UNIVERSITY_API_URL}/exam-periods`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })
    return this.handleResponse(response)
  }

  async updateExamPeriod(id: string, data: Partial<ExamPeriod>, token: string): Promise<ExamPeriod> {
    const response = await fetch(`${UNIVERSITY_API_URL}/exam-periods/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })
    return this.handleResponse(response)
  }

  async deleteExamPeriod(id: string, token: string): Promise<void> {
    const response = await fetch(`${UNIVERSITY_API_URL}/exam-periods/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(token),
    })
    if (!response.ok) {
      await ApiErrorHandler.handleResponse(response)
    }
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

    if (!response.ok) throw new Error("Failed to fetch administrators")
    return response.json()
  }

  async getAdministratorById(id: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/administrators/${id}`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch administrator")
    return response.json()
  }

  async createAdministrator(data: any, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/administrators/create`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error("Failed to create administrator")
    return response.json()
  }

  async updateAdministrator(id: string, data: any, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/administrators/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error("Failed to update administrator")
    return response.json()
  }

  async deleteAdministrator(id: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/administrators/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to delete administrator")
  }

  // University Service APIs - Assistants
  async getAllAssistants(token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/assistants`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch assistants")
    return response.json()
  }

  async getAssistantById(id: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/assistants/${id}`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch assistant")
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
      if (!legacyResponse.ok) {
        await ApiErrorHandler.handleResponse(legacyResponse);
      }
      return legacyResponse.json();
    }
    return response.json();
  }

  async unsaveJob(candidateId: string, jobId: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/candidates/${candidateId}/save-job/${jobId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(token),
    });
    if (!response.ok) throw new Error("Failed to unsave job");
    return response.json();
  }

  async getSavedJobs(candidateId: string, token: string) {
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

    async getAllNotifications(token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/notifications`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) {
      throw new Error("Failed to fetch notifications")
    }

    const data = await response.json()

    if (!Array.isArray(data)) {
      return []
    }

    return data
  }


  async getNotificationById(id: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/notifications/${id}`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch notification")
    return response.json()
  }

  async createNotification(data: any, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/notifications`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error("Failed to create notification")
    return response.json()
  }

  async createNotificationByHealthcare(data: any, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/notificationsByHealthcare`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error("Failed to create notification")
    return response.json()
  }

  async updateNotification(id: string, data: any, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/notifications/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error("Failed to update notification")
    const text = await response.text()
    if (!text) return
    return JSON.parse(text)
  }

  async getUserNotifications(userId: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/notifications/user/${userId}`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) {
      throw new Error("Failed to fetch user notifications")
    }

    const data = await response.json()

    if (!Array.isArray(data)) {
      return []
    }

    return data
  }

  async markNotificationAsSeen(id: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/notifications/${id}/seen`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to mark notification as seen")
    const text = await response.text()
    if (!text) return
    return JSON.parse(text)
  }

  async deleteNotification(id: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/notifications/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to delete notification")
  }

  // University Service APIs - Lectures
  async getLectures(token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/lectures`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch lectures")
    return response.json()
  }

  // University Service APIs - Tuition
  async payTuition(data: any, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/tuition/pay`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error("Failed to pay tuition")
    return response.json()
  }

  // University Service APIs - Internships
  async getInternships(token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/internships`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch internships")
    return response.json()
  }

  async getInternshipsForStudent(studentId: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/internships/student/${studentId}`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch internships")
    return response.json()
  }

  async applyToInternship(internshipId: string, data: any, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/internship/apply/${internshipId}`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error("Failed to apply to internship")
    return response.json()
  }

  async getInternshipApplicationById(id: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/internship_application/${id}`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch internship application")
    return response.json()
  }

  async updateInternshipApplication(id: string, data: any, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/internship_application/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error("Failed to update internship application")
    return response.json()
  }

  async deleteInternshipApplication(id: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/internship_application/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to delete internship application")
  }

  async getAllInternshipApplicationsForStudent(studentId: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/internship_applications/${studentId}`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch internship applications")
    return response.json()
  }

  // Employment Service APIs - Job Listings
  async getJobListings(token: string) {
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

  async getJobListingById(id: string, token: string) {
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

  async searchJobsByText(query: string, page: number = 1, limit: number = 20) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/search/jobs/text?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`, {
      headers: this.getAuthHeaders(),
    })
    if (!response.ok) {
      await ApiErrorHandler.handleResponse(response)
    }
    return this.handleResponse(response)
  }

  async searchJobsByInternship(isInternship: boolean, page: number = 1, limit: number = 20) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/search/jobs/internship?internship=${isInternship}&page=${page}&limit=${limit}`, {
      headers: this.getAuthHeaders(),
    })
    if (!response.ok) {
      await ApiErrorHandler.handleResponse(response)
    }
    return this.handleResponse(response)
  }

  async searchCandidatesByText(query: string, token: string, page: number = 1, limit: number = 50) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/search/candidates/text?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`, {
      headers: this.getAuthHeaders(token),
    })
    if (!response.ok) {
      await ApiErrorHandler.handleResponse(response)
    }
    return this.handleResponse(response)
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

  async getApplicationsForJob(jobId: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/job-listings/${jobId}/applications`, {
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
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/737903fe-e619-4f91-add6-2aae59140131',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api-client.ts:1077',message:'getEmployers called',data:{url:`${EMPLOYMENT_API_URL}/employers`,token_present:!!token},runId:'frontend-api',hypothesisId:'D',timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const response = await fetch(`${EMPLOYMENT_API_URL}/employers`, {
      headers: this.getAuthHeaders(token),
    })

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/737903fe-e619-4f91-add6-2aae59140131',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api-client.ts:1082',message:'getEmployers response',data:{status:response.status,ok:response.ok},runId:'frontend-api',hypothesisId:'D',timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    if (!response.ok) {
      await ApiErrorHandler.handleResponse(response)
    }

    const data = await response.json()

    if (!Array.isArray(data)) {
      return []
    }

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/737903fe-e619-4f91-add6-2aae59140131',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api-client.ts:1092',message:'getEmployers success',data:{employers_count:data.length},runId:'frontend-api',hypothesisId:'B',timestamp:Date.now()})}).catch(()=>{});
    // #endregion
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
    // 404 is expected if company doesn't exist yet - don't throw error
    if (response.status === 404) {
      return null
    }
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

  // Employment Service APIs - Unemployed Records
  async getUnemployedRecords(token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/unemployed-records`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch unemployed records")
    return response.json()
  }

  async getUnemployedRecordById(id: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/unemployed-records/${id}`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch unemployed record")
    return response.json()
  }

  async createUnemployedRecord(data: any, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/unemployed-records`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error("Failed to create unemployed record")
    return response.json()
  }

  async updateUnemployedRecord(id: string, data: any, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/unemployed-records/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error("Failed to update unemployed record")
    return response.json()
  }

  async deleteUnemployedRecord(id: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/unemployed-records/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to delete unemployed record")
  }

  // Employment Service APIs - Documents
  async getDocuments(token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/documents`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch documents")
    return response.json()
  }

  async getDocumentById(id: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/documents/${id}`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch document")
    return response.json()
  }

  async uploadDocument(data: any, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/documents`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error("Failed to upload document")
    return response.json()
  }

  async deleteDocument(id: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/documents/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to delete document")
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

  async getEmploymentUserById(id: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/users/${id}`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch user profile")
    return response.json()
  }

  // Employment Service APIs - Admin Approve/Reject
  async approveJobListing(id: string, token: string) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/737903fe-e619-4f91-add6-2aae59140131',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api-client.ts:1336',message:'approveJobListing called',data:{job_id:id,token_present:!!token,url:`${EMPLOYMENT_API_URL}/admin/jobs/${id}/approve`},runId:'frontend-api',hypothesisId:'D',timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    console.log(`[API] Approving job listing: ${id}`)
    console.log(`[API] URL: ${EMPLOYMENT_API_URL}/admin/jobs/${id}/approve`)
    console.log(`[API] Token present:`, !!token)
    const response = await fetch(`${EMPLOYMENT_API_URL}/admin/jobs/${id}/approve`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
    })
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/737903fe-e619-4f91-add6-2aae59140131',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api-client.ts:1344',message:'approveJobListing response',data:{status:response.status,ok:response.ok},runId:'frontend-api',hypothesisId:'D',timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const data = await this.handleResponse(response)
    console.log(`[API] Approve job response:`, data)
    return data
  }

  async rejectJobListing(id: string, token: string) {
    console.log(`[API] Rejecting job listing: ${id}`)
    const response = await fetch(`${EMPLOYMENT_API_URL}/admin/jobs/${id}/reject`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  async approveEmployer(id: string, token: string) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/737903fe-e619-4f91-add6-2aae59140131',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api-client.ts:1358',message:'approveEmployer called',data:{employer_id:id,token_present:!!token,url:`${EMPLOYMENT_API_URL}/admin/employers/${id}/approve`},runId:'frontend-api',hypothesisId:'D',timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    console.log(`[API] Approving employer: ${id}`)
    console.log(`[API] URL: ${EMPLOYMENT_API_URL}/admin/employers/${id}/approve`)
    console.log(`[API] Token present:`, !!token)
    console.log(`[API] Headers:`, this.getAuthHeaders(token))
    
    const response = await fetch(`${EMPLOYMENT_API_URL}/admin/employers/${id}/approve`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
    })
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/737903fe-e619-4f91-add6-2aae59140131',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api-client.ts:1372',message:'approveEmployer response',data:{status:response.status,ok:response.ok},runId:'frontend-api',hypothesisId:'D',timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    console.log(`[API] Response status:`, response.status)
    console.log(`[API] Response ok:`, response.ok)
    
    if (!response.ok) {
      const errorText = await response.text()
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/737903fe-e619-4f91-add6-2aae59140131',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api-client.ts:1376',message:'approveEmployer error',data:{status:response.status,error:errorText},runId:'frontend-api',hypothesisId:'C',timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      console.error(`[API] Error response:`, errorText)
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }
    
    const data = await response.json()
    console.log(`[API] Approve employer response:`, data)
    return data
  }

  async rejectEmployer(id: string, token: string) {
    console.log(`[API] Rejecting employer: ${id}`)
    console.log(`[API] URL: ${EMPLOYMENT_API_URL}/admin/employers/${id}/reject`)
    
    const response = await fetch(`${EMPLOYMENT_API_URL}/admin/employers/${id}/reject`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
    })
    
    console.log(`[API] Response status:`, response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[API] Error response:`, errorText)
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }
    
    const data = await response.json()
    console.log(`[API] Reject employer response:`, data)
    return data
  }

  async getPendingJobListings(token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/admin/jobs/pending`, {
      headers: this.getAuthHeaders(token),
    })
    return this.handleResponse(response)
  }

  async getPendingEmployers(token: string) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/737903fe-e619-4f91-add6-2aae59140131',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api-client.ts:1421',message:'getPendingEmployers called',data:{url:`${EMPLOYMENT_API_URL}/admin/employers/pending`,token_present:!!token},runId:'frontend-api',hypothesisId:'D',timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const response = await fetch(`${EMPLOYMENT_API_URL}/admin/employers/pending`, {
      headers: this.getAuthHeaders(token),
    })
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/737903fe-e619-4f91-add6-2aae59140131',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api-client.ts:1425',message:'getPendingEmployers response',data:{status:response.status,ok:response.ok},runId:'frontend-api',hypothesisId:'D',timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return this.handleResponse(response)
  }

  async clearTestData(token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/admin/clear-test-data`, {
      method: "DELETE",
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch employer stats")
    return response.json()
  }

  async getMajorById(id: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/majors/${id}`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch major by id")
    return response.json()
  }

  // Get all job listings by a specific employer (poster_id)
  async getJobListingsByEmployer(employerId: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/job-listings`, {
      headers: this.getAuthHeaders(token),
    })
    if (!response.ok) {
      await ApiErrorHandler.handleResponse(response)
    }
    const data = await response.json()
    const listings = Array.isArray(data) ? data : []
    return listings.filter((l: any) => {
      const posterId = l.poster_id?.toString?.() || l.poster_id || ""
      return posterId === employerId
    })
  }

  // Send a message/letter to a candidate
  async sendMessageToCandidate(data: { sender_id: string; receiver_id: string; job_listing_id?: string; content: string }, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/messages`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })
    return this.handleResponse(response)
  }

  // University Service APIs - Majors
  async getAllMajors(token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/majors`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch majors")
    return response.json()
  }
  async getMajorsBy(token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/majors`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch majors")
    return response.json()
  }

  async createMajor(data: { name: string; department_id: string; duration?: number; description?: string }, token: string) {
    const payload: any = {
      name: data.name.trim(),
      department_id: data.department_id,
    }
    if (data.duration !== undefined) {
      payload.duration = data.duration
    }
    if (data.description !== undefined) {
      payload.description = data.description
    }
    const response = await fetch(`${UNIVERSITY_API_URL}/majors`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Failed to create major" }))
      throw new Error(err.error || "Failed to create major")
    }
    return response.json()
  }

  async updateMajor(id: string, data: { name: string; department_id: string; duration?: number; description?: string }, token: string) {
    const payload: any = {
      name: data.name.trim(),
      department_id: data.department_id,
    }
    if (data.duration !== undefined) {
      payload.duration = data.duration
    }
    if (data.description !== undefined) {
      payload.description = data.description
    }
    const response = await fetch(`${UNIVERSITY_API_URL}/majors/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Failed to update major" }))
      throw new Error(err.error || "Failed to update major")
    }
    return response.json()
  }

  async deleteMajor(id: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/majors/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Failed to delete major" }))
      throw new Error(err.error || "Failed to delete major")
    }
  }

  // University Service APIs - Courses by Professor
  async getCoursesByProfessor(professorId: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/subjects/professor/${professorId}`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch courses for professor")
    return response.json()
  }

  // University Service APIs - Exam Sessions by Professor
  async getExamSessionsByProfessor(professorId: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/exam-sessions/professor/${professorId}`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch exam sessions for professor")
    return response.json()
  }

  // University Service APIs - Exam Registrations for Session
  async getExamRegistrationsBySession(examSessionId: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/exam-registrations/exam-session/${examSessionId}`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch exam registrations for session")
    return response.json()
  }

  // University Service APIs - Create Exam Grade
  async createExamGrade(data: any, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/exam-grades/create`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error("Failed to create exam grade")
    return response.json()
  }

  // University Service APIs - Update Exam Grade
  async updateExamGrade(id: string, data: any, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/exam-grades/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error("Failed to update exam grade")
    return response.json()
  }

  async getExamGradesForExamSession(examSessionId: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/exam-grades/exam-session/${examSessionId}`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch exam registrations for session")
    return response.json()
  }

  async deleteExamGrade(id: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/exam-grades/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(token),
    })
    if (!response.ok) throw new Error("Failed to delete exam grade")
  }
}






export const apiClient = new ApiClient()
