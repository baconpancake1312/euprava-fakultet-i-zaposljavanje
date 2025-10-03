import type { LoginCredentials, RegisterData, AuthResponse } from "./types"
import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios"

const AUTH_API_URL = process.env.NEXT_PUBLIC_AUTH_API_URL || "http://localhost:8080"
const UNIVERSITY_API_URL = process.env.NEXT_PUBLIC_UNIVERSITY_API_URL || "http://localhost:8088"
const EMPLOYMENT_API_URL = process.env.NEXT_PUBLIC_EMPLOYMENT_API_URL || "http://localhost:8089"

class ApiClient {
  private authClient: AxiosInstance
  private universityClient: AxiosInstance
  private employmentClient: AxiosInstance

  constructor() {
    // Create axios instances for each service
    this.authClient = axios.create({
      baseURL: AUTH_API_URL,
      headers: {
        "Content-Type": "application/json",
      },
    })

    this.universityClient = axios.create({
      baseURL: UNIVERSITY_API_URL,
      headers: {
        "Content-Type": "application/json",
      },
    })

    this.employmentClient = axios.create({
      baseURL: EMPLOYMENT_API_URL,
      headers: {
        "Content-Type": "application/json",
      },
    })

    // Add request interceptor to automatically include Bearer token from localStorage
    this.setupTokenInterceptor(this.authClient)
    this.setupTokenInterceptor(this.universityClient)
    this.setupTokenInterceptor(this.employmentClient)
  }

  private setupTokenInterceptor(client: AxiosInstance) {
    client.interceptors.request.use(
      (config) => {
        // Get token from localStorage
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Add response interceptor for error handling
    client.interceptors.response.use(
      (response) => response,
      (error) => {
        // Handle common errors
        if (error.response?.status === 401) {
          // Token expired or invalid - clear localStorage and redirect to login
          if (typeof window !== "undefined") {
            localStorage.removeItem("user")
            window.location.href = "/login"
          }
        }
        return Promise.reject(error)
      }
    )
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
    try {
      const response = await this.authClient.post("/users/login", credentials)
      return response.data
    } catch (error: any) {
      const message = error.response?.data?.message || "Login failed"
      throw new Error(message)
    }
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await this.authClient.post("/users/register", data)
      return response.data
    } catch (error: any) {
      const message = error.response?.data?.message || "Registration failed"
      throw new Error(message)
    }
  }

  async logout(token: string): Promise<void> {
    try {
      await this.authClient.post("/users/logout", {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch (error: any) {
      throw new Error("Logout failed")
    }
  }

  // University Service APIs - Students
  async getStudentById(id: string, token: string) {
    try {
      const response = await this.universityClient.get(`/students/${id}`)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to fetch student")
    }
  }

  async getAllStudents(token: string) {
    try {
      const response = await this.universityClient.get("/students")
      return response.data
    } catch (error: any) {
      throw new Error("Failed to fetch students")
    }
  }

  async createStudent(data: any, token: string) {
    try {
      const response = await this.universityClient.post("/students/create", data)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to create student")
    }
  }

  async updateStudent(id: string, data: any, token: string) {
    try {
      const response = await this.universityClient.put(`/students/${id}`, data)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to update student")
    }
  }

  async deleteStudent(id: string, token: string) {
    try {
      await this.universityClient.delete(`/students/${id}`)
    } catch (error: any) {
      throw new Error("Failed to delete student")
    }
  }

  // University Service APIs - Professors
  async getProfessorById(id: string, token: string) {
    try {
      const response = await this.universityClient.get(`/professors/${id}`)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to fetch professor")
    }
  }

  async getAllProfessors(token: string) {
    try {
      const response = await this.universityClient.get("/professors")
      return response.data
    } catch (error: any) {
      throw new Error("Failed to fetch professors")
    }
  }

  async createProfessor(data: any, token: string) {
    try {
      const response = await this.universityClient.post("/professors/create", data)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to create professor")
    }
  }

  async updateProfessor(id: string, data: any, token: string) {
    try {
      const response = await this.universityClient.put(`/professors/${id}`, data)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to update professor")
    }
  }

  async deleteProfessor(id: string, token: string) {
    try {
      await this.universityClient.delete(`/professors/${id}`)
    } catch (error: any) {
      throw new Error("Failed to delete professor")
    }
  }

  // University Service APIs - Courses
  async getAllCourses(token: string) {
    try {
      const response = await this.universityClient.get("/courses")
      return response.data
    } catch (error: any) {
      throw new Error("Failed to fetch courses")
    }
  }

  async getCourseById(id: string, token: string) {
    try {
      const response = await this.universityClient.get(`/courses/${id}`)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to fetch course")
    }
  }

  async createCourse(data: any, token: string) {
    try {
      const response = await this.universityClient.post("/courses/create", data)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to create course")
    }
  }

  async updateCourse(id: string, data: any, token: string) {
    try {
      const response = await this.universityClient.put(`/courses/${id}`, data)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to update course")
    }
  }

  async deleteCourse(id: string, token: string) {
    try {
      await this.universityClient.delete(`/courses/${id}`)
    } catch (error: any) {
      throw new Error("Failed to delete course")
    }
  }

  // University Service APIs - Departments
  async getAllDepartments(token: string) {
    try {
      const response = await this.universityClient.get("/departments")
      return response.data
    } catch (error: any) {
      throw new Error("Failed to fetch departments")
    }
  }

  async getDepartmentById(id: string, token: string) {
    try {
      const response = await this.universityClient.get(`/departments/${id}`)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to fetch department")
    }
  }

  async createDepartment(data: any, token: string) {
    try {
      const response = await this.universityClient.post("/departments/create", data)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to create department")
    }
  }

  async updateDepartment(id: string, data: any, token: string) {
    try {
      const response = await this.universityClient.put(`/departments/${id}`, data)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to update department")
    }
  }

  async deleteDepartment(id: string, token: string) {
    try {
      await this.universityClient.delete(`/departments/${id}`)
    } catch (error: any) {
      throw new Error("Failed to delete department")
    }
  }

  // University Service APIs - Universities
  async getAllUniversities(token: string) {
    try {
      const response = await this.universityClient.get("/universities")
      return response.data
    } catch (error: any) {
      throw new Error("Failed to fetch universities")
    }
  }

  async getUniversityById(id: string, token: string) {
    try {
      const response = await this.universityClient.get(`/universities/${id}`)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to fetch university")
    }
  }

  async createUniversity(data: any, token: string) {
    try {
      const response = await this.universityClient.post("/universities/create", data)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to create university")
    }
  }

  async updateUniversity(id: string, data: any, token: string) {
    try {
      const response = await this.universityClient.put(`/universities/${id}`, data)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to update university")
    }
  }

  async deleteUniversity(id: string, token: string) {
    try {
      await this.universityClient.delete(`/universities/${id}`)
    } catch (error: any) {
      throw new Error("Failed to delete university")
    }
  }


  // University Service APIs - Exams
  async getAllExams(token: string) {
    try {
      const response = await this.universityClient.get("/exams")
      return response.data
    } catch (error: any) {
      throw new Error("Failed to fetch exams")
    }
  }

  async getExamById(id: string, token: string) {
    try {
      const response = await this.universityClient.get(`/exams/${id}`)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to fetch exam")
    }
  }

  async createExam(data: any, token: string) {
    try {
      const response = await this.universityClient.post("/exams/create", data)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to create exam")
    }
  }

  async updateExam(id: string, data: any, token: string) {
    try {
      const response = await this.universityClient.put(`/exams/${id}`, data)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to update exam")
    }
  }

  async deleteExam(id: string, token: string) {
    try {
      await this.universityClient.delete(`/exams/${id}`)
    } catch (error: any) {
      throw new Error("Failed to delete exam")
    }
  }

  async registerExam(data: any, token: string) {
    try {
      const response = await this.universityClient.post("/exams/register", data)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to register for exam")
    }
  }

  async deregisterExam(studentId: string, courseId: string, token: string) {
    try {
      await this.universityClient.delete(`/exams/deregister/${studentId}/${courseId}`)
    } catch (error: any) {
      throw new Error("Failed to deregister from exam")
    }
  }

  async getExamCalendar(token: string) {
    try {
      const response = await this.universityClient.get("/exams/calendar")
      return response.data
    } catch (error: any) {
      throw new Error("Failed to fetch exam calendar")
    }
  }

  async manageExams(data: any, token: string) {
    try {
      const response = await this.universityClient.post("/manage-exams", data)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to manage exams")
    }
  }

  async cancelExam(id: string, token: string) {
    try {
      const response = await this.universityClient.post(`/cancel-exam/${id}`)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to cancel exam")
    }
  }

  // University Service APIs - Administrators
  async getAllAdministrators(token: string) {
    try {
      const response = await this.universityClient.get("/administrators")
      return response.data
    } catch (error: any) {
      throw new Error("Failed to fetch administrators")
    }
  }

  async getAdministratorById(id: string, token: string) {
    try {
      const response = await this.universityClient.get(`/administrators/${id}`)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to fetch administrator")
    }
  }

  async createAdministrator(data: any, token: string) {
    try {
      const response = await this.universityClient.post("/administrators/create", data)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to create administrator")
    }
  }

  async updateAdministrator(id: string, data: any, token: string) {
    try {
      const response = await this.universityClient.put(`/administrators/${id}`, data)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to update administrator")
    }
  }

  async deleteAdministrator(id: string, token: string) {
    try {
      await this.universityClient.delete(`/administrators/${id}`)
    } catch (error: any) {
      throw new Error("Failed to delete administrator")
    }
  }

  // University Service APIs - Assistants
  async getAllAssistants(token: string) {
    try {
      const response = await this.universityClient.get("/assistants")
      return response.data
    } catch (error: any) {
      throw new Error("Failed to fetch assistants")
    }
  }

  async getAssistantById(id: string, token: string) {
    try {
      const response = await this.universityClient.get(`/assistants/${id}`)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to fetch assistant")
    }
  }

  async createAssistant(data: any, token: string) {
    try {
      const response = await this.universityClient.post("/assistants/create", data)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to create assistant")
    }
  }

  async updateAssistant(id: string, data: any, token: string) {
    try {
      const response = await this.universityClient.put(`/assistants/${id}`, data)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to update assistant")
    }
  }

  async deleteAssistant(id: string, token: string) {
    try {
      await this.universityClient.delete(`/assistants/${id}`)
    } catch (error: any) {
      throw new Error("Failed to delete assistant")
    }
  }

  // University Service APIs - Notifications
  async getAllNotifications(token: string) {
    try {
      const response = await this.universityClient.get("/notifications")
      return response.data
    } catch (error: any) {
      throw new Error("Failed to fetch notifications")
    }
  }

  async getNotificationById(id: string, token: string) {
    try {
      const response = await this.universityClient.get(`/notifications/${id}`)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to fetch notification")
    }
  }

  async createNotification(data: any, token: string) {
    try {
      const response = await this.universityClient.post("/notifications", data)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to create notification")
    }
  }

  async createNotificationByHealthcare(data: any, token: string) {
    try {
      const response = await this.universityClient.post("/notificationsByHealthcare", data)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to create notification")
    }
  }

  async deleteNotification(id: string, token: string) {
    try {
      await this.universityClient.delete(`/notifications/${id}`)
    } catch (error: any) {
      throw new Error("Failed to delete notification")
    }
  }

  // University Service APIs - Lectures
  async getLectures(token: string) {
    try {
      const response = await this.universityClient.get("/lectures")
      return response.data
    } catch (error: any) {
      throw new Error("Failed to fetch lectures")
    }
  }

  // University Service APIs - Tuition
  async payTuition(data: any, token: string) {
    try {
      const response = await this.universityClient.post("/tuition/pay", data)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to pay tuition")
    }
  }

  // University Service APIs - Internships

  // Employment Service APIs - Job Listings
  async getJobListings(token: string) {
    try {
      const response = await this.employmentClient.get("/job-listings")
      return response.data
    } catch (error: any) {
      throw new Error("Failed to fetch job listings")
    }
  }

  async getJobListingById(id: string, token: string) {
    try {
      const response = await this.employmentClient.get(`/job-listings/${id}`)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to fetch job listing")
    }
  }

  async createJobListing(data: any, token: string) {
    try {
      const response = await this.employmentClient.post("/job-listings", data)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to create job listing")
    }
  }

  async updateJobListing(id: string, data: any, token: string) {
    try {
      const response = await this.employmentClient.put(`/job-listings/${id}`, data)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to update job listing")
    }
  }

  async deleteJobListing(id: string, token: string) {
    try {
      await this.employmentClient.delete(`/job-listings/${id}`)
    } catch (error: any) {
      throw new Error("Failed to delete job listing")
    }
  }

  // Employment Service APIs - Applications
  async getApplications(token: string) {
    try {
      const response = await this.employmentClient.get("/applications")
      return response.data
    } catch (error: any) {
      throw new Error("Failed to fetch applications")
    }
  }

  async getApplicationById(id: string, token: string) {
    try {
      const response = await this.employmentClient.get(`/applications/${id}`)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to fetch application")
    }
  }

  async applyToJob(listingId: string, data: any, token: string) {
    try {
      const response = await this.employmentClient.post("/applications", { ...data, listing_id: listingId })
      return response.data
    } catch (error: any) {
      throw new Error("Failed to apply to job")
    }
  }

  async updateApplication(id: string, data: any, token: string) {
    try {
      const response = await this.employmentClient.put(`/applications/${id}`, data)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to update application")
    }
  }

  async deleteApplication(id: string, token: string) {
    try {
      await this.employmentClient.delete(`/applications/${id}`)
    } catch (error: any) {
      throw new Error("Failed to delete application")
    }
  }

  async getApplicationsForJob(jobId: string, token: string) {
    try {
      const response = await this.employmentClient.get(`/job-listings/${jobId}/applications`)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to fetch applications for job")
    }
  }

  async searchApplicationsByStatus(status: string, page: number = 1, limit: number = 20) {
    try {
      const response = await this.employmentClient.get(`/search/applications/status?status=${status}&page=${page}&limit=${limit}`)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to search applications by status")
    }
  }

  // Employment Service APIs - Employers
  async getEmployers(token: string) {
    try {
      const response = await this.employmentClient.get("/employers")
      return response.data
    } catch (error: any) {
      throw new Error("Failed to fetch employers")
    }
  }

  async getEmployerById(id: string, token: string) {
    try {
      const response = await this.employmentClient.get(`/employers/${id}`)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to fetch employer")
    }
  }

  async createEmployer(data: any, token: string) {
    try {
      const response = await this.employmentClient.post("/employers", data)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to create employer")
    }
  }

  async updateEmployer(id: string, data: any, token: string) {
    try {
      const response = await this.employmentClient.put(`/employers/${id}`, data)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to update employer")
    }
  }

  async deleteEmployer(id: string, token: string) {
    try {
      await this.employmentClient.delete(`/employers/${id}`)
    } catch (error: any) {
      throw new Error("Failed to delete employer")
    }
  }

  async approveEmployer(id: string, token: string) {
    try {
      const response = await this.employmentClient.put(`/admin/employers/${id}/approve`)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to approve employer")
    }
  }

  async rejectEmployer(id: string, token: string) {
    try {
      const response = await this.employmentClient.put(`/admin/employers/${id}/reject`)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to reject employer")
    }
  }

  async getPendingEmployers(token: string) {
    try {
      const response = await this.employmentClient.get("/admin/employers/pending")
      return response.data
    } catch (error: any) {
      throw new Error("Failed to fetch pending employers")
    }
  }

  async approveJobListing(id: string, token: string) {
    try {
      const response = await this.employmentClient.put(`/admin/jobs/${id}/approve`)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to approve job listing")
    }
  }

  async rejectJobListing(id: string, token: string) {
    try {
      const response = await this.employmentClient.put(`/admin/jobs/${id}/reject`)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to reject job listing")
    }
  }

  async getPendingJobListings(token: string) {
    try {
      const response = await this.employmentClient.get("/admin/jobs/pending")
      return response.data
    } catch (error: any) {
      throw new Error("Failed to fetch pending job listings")
    }
  }

  // Employment Service APIs - Search
  async searchJobsByText(query: string, page: number = 1, limit: number = 20) {
    try {
      const response = await this.employmentClient.get(`/search/jobs/text?q=${query}&page=${page}&limit=${limit}`)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to search jobs by text")
    }
  }

  async searchJobsByInternship(internship: boolean = true, page: number = 1, limit: number = 20) {
    try {
      const response = await this.employmentClient.get(`/search/jobs/internship?internship=${internship}&page=${page}&limit=${limit}`)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to search jobs by internship")
    }
  }

  async getActiveJobs(limit: number = 20) {
    try {
      const response = await this.employmentClient.get(`/search/jobs/active?limit=${limit}`)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to fetch active jobs")
    }
  }

  async getTrendingJobs(limit: number = 10) {
    try {
      const response = await this.employmentClient.get(`/search/jobs/trending?limit=${limit}`)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to fetch trending jobs")
    }
  }

  async searchUsersByText(query: string, page: number = 1, limit: number = 20) {
    try {
      const response = await this.employmentClient.get(`/search/users/text?q=${query}&page=${page}&limit=${limit}`)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to search users by text")
    }
  }

  async searchEmployersByText(query: string, page: number = 1, limit: number = 20) {
    try {
      const response = await this.employmentClient.get(`/search/employers/text?q=${query}&page=${page}&limit=${limit}`)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to search employers by text")
    }
  }

  async searchCandidatesByText(query: string, page: number = 1, limit: number = 20) {
    try {
      const response = await this.employmentClient.get(`/search/candidates/text?q=${query}&page=${page}&limit=${limit}`)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to search candidates by text")
    }
  }

  async getInternships(limit: number = 20) {
    try {
      const response = await this.employmentClient.get(`/internships?limit=${limit}`)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to fetch internships")
    }
  }

  async getInternshipsForStudent(studentId: string, page: number = 1, limit: number = 20) {
    try {
      const response = await this.employmentClient.get(`/internships/student/${studentId}?page=${page}&limit=${limit}`)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to fetch internships for student")
    }
  }


  // Employment Service APIs - Candidates
  async getCandidates(token: string) {
    try {
      const response = await this.employmentClient.get("/candidates")
      return response.data
    } catch (error: any) {
      throw new Error("Failed to fetch candidates")
    }
  }

  async getCandidateById(id: string, token: string) {
    try {
      const response = await this.employmentClient.get(`/candidates/${id}`)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to fetch candidate")
    }
  }

  async createCandidate(data: any, token: string) {
    try {
      const response = await this.employmentClient.post("/candidates", data)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to create candidate")
    }
  }

  async updateCandidate(id: string, data: any, token: string) {
    try {
      const response = await this.employmentClient.put(`/candidates/${id}`, data)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to update candidate")
    }
  }

  async deleteCandidate(id: string, token: string) {
    try {
      await this.employmentClient.delete(`/candidates/${id}`)
    } catch (error: any) {
      throw new Error("Failed to delete candidate")
    }
  }

  // Employment Service APIs - Unemployed Records
  async getUnemployedRecords(token: string) {
    try {
      const response = await this.employmentClient.get("/unemployed-records")
      return response.data
    } catch (error: any) {
      throw new Error("Failed to fetch unemployed records")
    }
  }

  async getUnemployedRecordById(id: string, token: string) {
    try {
      const response = await this.employmentClient.get(`/unemployed-records/${id}`)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to fetch unemployed record")
    }
  }

  async createUnemployedRecord(data: any, token: string) {
    try {
      const response = await this.employmentClient.post("/unemployed-records", data)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to create unemployed record")
    }
  }

  async updateUnemployedRecord(id: string, data: any, token: string) {
    try {
      const response = await this.employmentClient.put(`/unemployed-records/${id}`, data)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to update unemployed record")
    }
  }

  async deleteUnemployedRecord(id: string, token: string) {
    try {
      await this.employmentClient.delete(`/unemployed-records/${id}`)
    } catch (error: any) {
      throw new Error("Failed to delete unemployed record")
    }
  }

  // Employment Service APIs - Documents
  async getDocuments(token: string) {
    try {
      const response = await this.employmentClient.get("/documents")
      return response.data
    } catch (error: any) {
      throw new Error("Failed to fetch documents")
    }
  }

  async getDocumentById(id: string, token: string) {
    try {
      const response = await this.employmentClient.get(`/documents/${id}`)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to fetch document")
    }
  }

  async uploadDocument(data: any, token: string) {
    try {
      const response = await this.employmentClient.post("/documents", data)
      return response.data
    } catch (error: any) {
      throw new Error("Failed to upload document")
    }
  }

  async deleteDocument(id: string, token: string) {
    try {
      await this.employmentClient.delete(`/documents/${id}`)
    } catch (error: any) {
      throw new Error("Failed to delete document")
    }
  }
}

export const apiClient = new ApiClient()
