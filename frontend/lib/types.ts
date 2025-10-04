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
  major?: string
  year?: number
  assigned_dorm?: string
  scholarship?: boolean
  highschool_gpa?: number
  gpa?: number
  espb?: number
}

// Professor specific fields
export interface ProfessorData {
  subjects?: Array<{ id: string; name?: string }>
  office?: string
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
