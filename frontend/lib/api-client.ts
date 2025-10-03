import type { LoginCredentials, RegisterData, AuthResponse } from "./types"

const AUTH_API_URL = process.env.NEXT_PUBLIC_AUTH_API_URL || "http://localhost:8080"
const UNIVERSITY_API_URL = process.env.NEXT_PUBLIC_UNIVERSITY_API_URL || "http://localhost:8088"
const EMPLOYMENT_API_URL = process.env.NEXT_PUBLIC_EMPLOYMENT_API_URL || "http://localhost:8089"

class ApiClient {
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

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Registration failed" }))
      throw new Error(error.message || "Registration failed")
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

  async getAllStudents(token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/students`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch students")
    return response.json()
  }

  async createStudent(data: any, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/students/create`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error("Failed to create student")
    return response.json()
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

  async deleteStudent(id: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/students/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to delete student")
  }

  // University Service APIs - Professors
  async getProfessorById(id: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/professors/${id}`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch professor")
    return response.json()
  }

  async getAllProfessors(token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/professors`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch professors")
    return response.json()
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

  async getCourseById(id: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/courses/${id}`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch course")
    return response.json()
  }

  async createCourse(data: any, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/courses/create`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error("Failed to create course")
    return response.json()
  }

  async updateCourse(id: string, data: any, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/courses/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error("Failed to update course")
    return response.json()
  }

  async deleteCourse(id: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/courses/${id}`, {
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

  // University Service APIs - Exams
  async getAllExams(token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/exams`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch exams")
    return response.json()
  }

  async getExamById(id: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/exams/${id}`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch exam")
    return response.json()
  }

  async createExam(data: any, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/exams/create`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error("Failed to create exam")
    return response.json()
  }

  async updateExam(id: string, data: any, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/exams/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error("Failed to update exam")
    return response.json()
  }

  async deleteExam(id: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/exams/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to delete exam")
  }

  async registerExam(data: any, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/exams/register`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error("Failed to register for exam")
    return response.json()
  }

  async deregisterExam(studentId: string, courseId: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/exams/deregister/${studentId}/${courseId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to deregister from exam")
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

  async createAssistant(data: any, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/assistants/create`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error("Failed to create assistant")
    return response.json()
  }

  async updateAssistant(id: string, data: any, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/assistants/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error("Failed to update assistant")
    return response.json()
  }

  async deleteAssistant(id: string, token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/assistants/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to delete assistant")
  }

  // University Service APIs - Notifications
  async getAllNotifications(token: string) {
    const response = await fetch(`${UNIVERSITY_API_URL}/notifications`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch notifications")
    return response.json()
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
      const errorText = await response.text()
      console.error("API Error:", errorText)
      throw new Error("Failed to fetch job listings")
    }

    return response.json()
  }

  async getJobListingById(id: string, token: string) {
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
  }

  // Employment Service APIs - Applications
  async getApplications(token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/applications`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch applications")
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
  async getEmployers(token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/employers`, {
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to fetch employers")
    return response.json()
  }

  async getEmployerById(id: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/employers/${id}`, {
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

  async approveEmployer(id: string, token: string) {
    const response = await fetch(`${EMPLOYMENT_API_URL}/employers/${id}/approve`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
    })

    if (!response.ok) throw new Error("Failed to approve employer")
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
}

export const apiClient = new ApiClient()
