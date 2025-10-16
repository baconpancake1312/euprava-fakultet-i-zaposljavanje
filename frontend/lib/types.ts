export type UserType =
  | "STUDENT"
  | "ADMIN"
  | "EMPLOYER"
  | "CANDIDATE"
  | "PROFESSOR"
  | "STUDENTSKA_SLUZBA"
  | "AUTH_SERVICE"
  | "UNIVERSITY_SERVICE"
  | "EMPLOYMENT_SERVICE"

export type ApprovalStatus = "Approved" | "Rejected" | "Pending"

export interface User {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  address?: string
  date_of_birth?: string
  jmbg?: string
  user_type: UserType
  token?: string
}

export interface AuthResponse {
  user: User
  token: string
  message?: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  first_name: string
  last_name: string
  email: string
  password: string
  phone: string
  address: string
  date_of_birth: string
  jmbg: string
  user_type: UserType
}

// Employer specific fields
export interface EmployerData extends RegisterData {
  firm_name: string
  pib: string
  maticni_broj: string
  delatnost: string
  firm_address: string
  firm_phone: string
}

// Candidate specific fields
export interface CandidateData extends RegisterData {
  cv_file?: string
  cv_base64?: string
  skills: string[]
}

// Student specific fields
export interface StudentData {
  major?: Major | string
  major_id?: string
  year?: number
  assigned_dorm?: string
  scholarship?: boolean
  highschool_gpa?: number
  gpa?: number
}
export interface StudentFullData {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  address?: string
  date_of_birth?: string
  jmbg?: string
  user_type: UserType
  major?: Major | string
  major_id?: string
  year?: number
  assigned_dorm?: string
  scholarship?: boolean
  highschool_gpa?: number
  gpa?: number
}

// Professor specific fields
export interface ProfessorData {
  subjects?: Array<{ id: string; name?: string }>
  office?: string
}
export interface ProfessorFullData {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  address?: string
  date_of_birth?: string
  jmbg?: string
  user_type: UserType
  subjects?: Array<{ id: string; name?: string }>
}


export interface JobListing {
  id: string
  poster_id: string
  position: string
  description: string
  created_at: string
  expire_at: string
  is_internship: boolean
  approval_status: ApprovalStatus
  approved_at?: string
  approved_by?: string
}

export interface Application {
  id: string
  applicant_id: string
  listing_id: string
  status: string
  submitted_at: string
}

export interface EmployerProfile {
  id: string
  firm_name: string
  pib: string
  maticni_broj: string
  delatnost: string
  firm_address: string
  firm_phone: string
  approval_status: ApprovalStatus
  approved_at?: string
  approved_by?: string
}
export interface Major {
  id: string
  name: string
  courses: Course[]
  department_id: string
}
export interface Course {
  id: string
  name: string
  major_id: string
  professor_id: string
  year: number
  hasPassed: boolean
}
export interface ExamSession {
  id: string
  subject: Course
  professor_id: string
  exam_date: string // ISO string format (e.g., "2025-10-15T20:50:00+02:00")
  location: string
  max_students: number
  created_at?: string
  updated_at?: string
}

export interface CreateExamSession {
  id: string
  subject_id: string
  professor_id: string
  exam_date: string // ISO string format (e.g., "2025-10-15T20:50:00+02:00")
  location: string
  max_students: number
  created_at?: string
  updated_at?: string
}

export interface ExamRegistration {
  id: string
  student_id: string
  exam_session_id: string
  registered_at: string
  status: "registered" | "graded" | "passed" | "failed"
  student?: StudentFullData
  grade?: ExamGrade
}

export interface ExamGrade {
  id: string
  student: StudentFullData
  exam_registration_id: string
  exam_session_id: string
  subject_id: string
  grade: string
  passed: string
  graded_at: string
  graded_by: ProfessorData
  comments: string
}

