import axios from 'axios';
import { toastManager } from './toast';

const AUTH_SERVICE_URL = 'http://localhost:8080';
const UNIVERSITY_SERVICE_URL = 'http://localhost:8088';
const EMPLOYMENT_SERVICE_URL = 'http://localhost:8089';

const authApi = axios.create({
  baseURL: AUTH_SERVICE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

const universityApi = axios.create({
  baseURL: UNIVERSITY_SERVICE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

const employmentApi = axios.create({
  baseURL: EMPLOYMENT_SERVICE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

const addAuthToken = (config: any) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

universityApi.interceptors.request.use(addAuthToken);
employmentApi.interceptors.request.use(addAuthToken);

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  user_type: 'STUDENT' | 'PROFESSOR' | 'ADMIN' | 'EMPLOYER' | 'CANDIDATE';
  phone?: string;
  address?: string;
  date_of_birth?: string;
  jmbg?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  date_of_birth?: string;
  jmbg?: string;
  user_type: 'STUDENT' | 'PROFESSOR' | 'ADMIN' | 'EMPLOYER' | 'CANDIDATE';
}

export interface AuthResponse {
  token: string;
  user: User;
  microservice: 'university' | 'employment' | 'auth';
}

export class AuthService {
  private static instance: AuthService;
  private currentUser: User | null = null;
  private currentToken: string | null = null;

  private constructor() {
    this.loadUserFromStorage();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private loadUserFromStorage(): void {
    const token = localStorage.getItem('authToken');
    const userStr = localStorage.getItem('currentUser');
    
    if (token && userStr) {
      this.currentToken = token;
      this.currentUser = JSON.parse(userStr);
    }
  }

  private saveUserToStorage(user: User, token: string): void {
    localStorage.setItem('authToken', token);
    localStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUser = user;
    this.currentToken = token;
  }

  private clearUserFromStorage(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    this.currentUser = null;
    this.currentToken = null;
  }

  public async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await authApi.post('/users/login', credentials);
      const { token, user } = response.data;

      const microservice = this.determineMicroservice(user);

      this.saveUserToStorage(user, token);
      
      toastManager.success('Login Successful', `Welcome back, ${user.first_name}!`);

      return {
        token,
        user,
        microservice,
      };
    } catch (error: any) {
      let errorMessage = 'Login failed';
      
      if (error.code === 'ECONNREFUSED' || error.message === 'Network Error') {
        errorMessage = 'Cannot connect to server. Please check if the backend services are running.';
      } else if (error.response?.status === 0) {
        errorMessage = 'CORS error: Server is not allowing requests from this origin.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toastManager.error('Login Failed', errorMessage);
      throw new Error(errorMessage);
    }
  }

  private async internalLogin(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await authApi.post('/users/login', credentials);
    const { token, user } = response.data;

    const microservice = this.determineMicroservice(user);

    this.saveUserToStorage(user, token);

    return {
      token,
      user,
      microservice,
    };
  }

  public async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      // First, register the user
      const registerResponse = await authApi.post('/users/register', userData);
      const { message, user_id, user_type } = registerResponse.data;

      // After successful registration, automatically log in to get the proper token and user data
      const loginResponse = await this.internalLogin({
        email: userData.email,
        password: userData.password
      });

      toastManager.success('Registration Successful', `Welcome to eUprava, ${loginResponse.user.first_name}!`);

      return loginResponse;
    } catch (error: any) {
      let errorMessage = 'Registration failed';
      
      if (error.code === 'ECONNREFUSED' || error.message === 'Network Error') {
        errorMessage = 'Cannot connect to server. Please check if the backend services are running.';
      } else if (error.response?.status === 0) {
        errorMessage = 'CORS error: Server is not allowing requests from this origin.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toastManager.error('Registration Failed', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async logout(): Promise<void> {
    this.clearUserFromStorage();
    toastManager.info('Logged Out', 'You have been successfully logged out.');
  }

  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public getCurrentToken(): string | null {
    return this.currentToken;
  }

  public isAuthenticated(): boolean {
    return !!this.currentToken && !!this.currentUser;
  }

  private determineMicroservice(user: User): 'university' | 'employment' | 'auth' {
    switch (user.user_type) {
      case 'STUDENT':
      case 'PROFESSOR':
        return 'university';
      case 'EMPLOYER':
      case 'CANDIDATE':
        return 'employment';
      case 'ADMIN':
        return 'auth';
      default:
        return 'auth';
    }
  }

  public async getUniversityData() {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to access university data.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await universityApi.get('/students');
      toastManager.success('Data Loaded', 'University data loaded successfully.');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch university data';
      toastManager.error('Error Loading Data', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async getEmploymentData() {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to access employment data.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await employmentApi.get('/job-listings');
      toastManager.success('Data Loaded', 'Employment data loaded successfully.');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch employment data';
      toastManager.error('Error Loading Data', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async getJobListings() {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to access job listings.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await employmentApi.get('/job-listings');
      toastManager.success('Jobs Loaded', 'Job listings loaded successfully.');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch job listings';
      toastManager.error('Error Loading Jobs', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async searchJobs(query: string, page: number = 1, limit: number = 20) {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to search jobs.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await employmentApi.get(`/search/jobs/text?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
      toastManager.success('Search Complete', `Found results for "${query}".`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to search jobs';
      toastManager.error('Search Failed', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async getInternships() {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to access internships.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await employmentApi.get('/internships');
      toastManager.success('Internships Loaded', 'Internship listings loaded successfully.');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch internships';
      toastManager.error('Error Loading Internships', errorMessage);
      throw new Error(errorMessage);
    }
  }


  public async getStudentData() {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to access student data.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await universityApi.get('/students');
      toastManager.success('Student Data Loaded', 'Student information loaded successfully.');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch student data';
      toastManager.error('Error Loading Student Data', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async getCourses() {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to access courses.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await universityApi.get('/courses');
      toastManager.success('Courses Loaded', 'Course information loaded successfully.');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch courses';
      toastManager.error('Error Loading Courses', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async getExams() {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to access exams.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await universityApi.get('/exams');
      toastManager.success('Exams Loaded', 'Exam information loaded successfully.');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch exams';
      toastManager.error('Error Loading Exams', errorMessage);
      throw new Error(errorMessage);
    }
  }

  // University Service CRUD Operations
  public async createStudent(studentData: any) {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to create students.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await universityApi.post('/students/create', studentData);
      toastManager.success('Student Created', 'Student has been created successfully.');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create student';
      toastManager.error('Error Creating Student', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async updateStudent(studentId: string, studentData: any) {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to update students.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await universityApi.put(`/students/${studentId}`, studentData);
      toastManager.success('Student Updated', 'Student has been updated successfully.');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update student';
      toastManager.error('Error Updating Student', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async deleteStudent(studentId: string) {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to delete students.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await universityApi.delete(`/students/${studentId}`);
      toastManager.success('Student Deleted', 'Student has been deleted successfully.');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete student';
      toastManager.error('Error Deleting Student', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async createCourse(courseData: any) {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to create courses.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await universityApi.post('/courses/create', courseData);
      toastManager.success('Course Created', 'Course has been created successfully.');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create course';
      toastManager.error('Error Creating Course', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async updateCourse(courseId: string, courseData: any) {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to update courses.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await universityApi.put(`/courses/${courseId}`, courseData);
      toastManager.success('Course Updated', 'Course has been updated successfully.');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update course';
      toastManager.error('Error Updating Course', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async deleteCourse(courseId: string) {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to delete courses.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await universityApi.delete(`/courses/${courseId}`);
      toastManager.success('Course Deleted', 'Course has been deleted successfully.');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete course';
      toastManager.error('Error Deleting Course', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async createExam(examData: any) {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to create exams.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await universityApi.post('/exams', examData);
      toastManager.success('Exam Created', 'Exam has been created successfully.');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create exam';
      toastManager.error('Error Creating Exam', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async updateExam(examId: string, examData: any) {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to update exams.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await universityApi.put(`/exams/${examId}`, examData);
      toastManager.success('Exam Updated', 'Exam has been updated successfully.');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update exam';
      toastManager.error('Error Updating Exam', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async deleteExam(examId: string) {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to delete exams.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await universityApi.delete(`/exams/${examId}`);
      toastManager.success('Exam Deleted', 'Exam has been deleted successfully.');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete exam';
      toastManager.error('Error Deleting Exam', errorMessage);
      throw new Error(errorMessage);
    }
  }

  // Employment Service CRUD Operations
  public async createJobListing(jobData: any) {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to create job listings.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await employmentApi.post('/job-listings', jobData);
      toastManager.success('Job Listing Created', 'Job listing has been created successfully.');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create job listing';
      toastManager.error('Error Creating Job Listing', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async updateJobListing(jobId: string, jobData: any) {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to update job listings.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await employmentApi.put(`/job-listings/${jobId}`, jobData);
      toastManager.success('Job Listing Updated', 'Job listing has been updated successfully.');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update job listing';
      toastManager.error('Error Updating Job Listing', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async deleteJobListing(jobId: string) {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to delete job listings.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await employmentApi.delete(`/job-listings/${jobId}`);
      toastManager.success('Job Listing Deleted', 'Job listing has been deleted successfully.');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete job listing';
      toastManager.error('Error Deleting Job Listing', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async createEmployer(employerData: any) {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to create employers.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await employmentApi.post('/employers', employerData);
      toastManager.success('Employer Created', 'Employer has been created successfully.');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create employer';
      toastManager.error('Error Creating Employer', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async updateEmployer(employerId: string, employerData: any) {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to update employers.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await employmentApi.put(`/employers/${employerId}`, employerData);
      toastManager.success('Employer Updated', 'Employer has been updated successfully.');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update employer';
      toastManager.error('Error Updating Employer', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async deleteEmployer(employerId: string) {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to delete employers.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await employmentApi.delete(`/employers/${employerId}`);
      toastManager.success('Employer Deleted', 'Employer has been deleted successfully.');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete employer';
      toastManager.error('Error Deleting Employer', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async createCandidate(candidateData: any) {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to create candidates.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await employmentApi.post('/candidates', candidateData);
      toastManager.success('Candidate Created', 'Candidate has been created successfully.');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create candidate';
      toastManager.error('Error Creating Candidate', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async updateCandidate(candidateId: string, candidateData: any) {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to update candidates.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await employmentApi.put(`/candidates/${candidateId}`, candidateData);
      toastManager.success('Candidate Updated', 'Candidate has been updated successfully.');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update candidate';
      toastManager.error('Error Updating Candidate', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async deleteCandidate(candidateId: string) {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to delete candidates.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await employmentApi.delete(`/candidates/${candidateId}`);
      toastManager.success('Candidate Deleted', 'Candidate has been deleted successfully.');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete candidate';
      toastManager.error('Error Deleting Candidate', errorMessage);
      throw new Error(errorMessage);
    }
  }

  // Admin Service CRUD Operations
  public async getAllUsers() {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to access users.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await employmentApi.get('/users');
      toastManager.success('Users Loaded', 'Users loaded successfully.');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch users';
      toastManager.error('Error Loading Users', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async updateUser(userId: string, userData: any) {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to update users.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await employmentApi.put(`/users/${userId}`, userData);
      toastManager.success('User Updated', 'User has been updated successfully.');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update user';
      toastManager.error('Error Updating User', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async deleteUser(userId: string) {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to delete users.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await employmentApi.delete(`/users/${userId}`);
      toastManager.success('User Deleted', 'User has been deleted successfully.');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete user';
      toastManager.error('Error Deleting User', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async approveEmployer(employerId: string) {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to approve employers.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await employmentApi.put(`/admin/employers/${employerId}/approve`);
      toastManager.success('Employer Approved', 'Employer has been approved successfully.');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to approve employer';
      toastManager.error('Error Approving Employer', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async rejectEmployer(employerId: string) {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to reject employers.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await employmentApi.put(`/admin/employers/${employerId}/reject`);
      toastManager.success('Employer Rejected', 'Employer has been rejected successfully.');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to reject employer';
      toastManager.error('Error Rejecting Employer', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async getPendingEmployers() {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to access pending employers.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await employmentApi.get('/admin/employers/pending');
      toastManager.success('Pending Employers Loaded', 'Pending employers loaded successfully.');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch pending employers';
      toastManager.error('Error Loading Pending Employers', errorMessage);
      throw new Error(errorMessage);
    }
  }

  // Additional University Service Features
  public async getUniversities() {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to access universities.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await universityApi.get('/universities');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch universities';
      toastManager.error('Error Loading Universities', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async getDepartments() {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to access departments.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await universityApi.get('/departments');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch departments';
      toastManager.error('Error Loading Departments', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async getProfessors() {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to access professors.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await universityApi.get('/professors');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch professors';
      toastManager.error('Error Loading Professors', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async createUniversity(universityData: any) {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to create universities.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await universityApi.post('/universities/create', universityData);
      toastManager.success('University Created', 'University has been created successfully.');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create university';
      toastManager.error('Error Creating University', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async createDepartment(departmentData: any) {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to create departments.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await universityApi.post('/departments/create', departmentData);
      toastManager.success('Department Created', 'Department has been created successfully.');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create department';
      toastManager.error('Error Creating Department', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async createProfessor(professorData: any) {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to create professors.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await universityApi.post('/professors/create', professorData);
      toastManager.success('Professor Created', 'Professor has been created successfully.');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create professor';
      toastManager.error('Error Creating Professor', errorMessage);
      throw new Error(errorMessage);
    }
  }

  // Additional Employment Service Features
  public async getJobApplications() {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to access job applications.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await employmentApi.get('/applications');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch job applications';
      toastManager.error('Error Loading Applications', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async createJobApplication(applicationData: any) {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to create job applications.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await employmentApi.post('/applications', applicationData);
      toastManager.success('Application Submitted', 'Your job application has been submitted successfully.');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create job application';
      toastManager.error('Error Submitting Application', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async getDocuments() {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to access documents.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await employmentApi.get('/documents');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch documents';
      toastManager.error('Error Loading Documents', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async createDocument(documentData: any) {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to create documents.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await employmentApi.post('/documents', documentData);
      toastManager.success('Document Created', 'Document has been created successfully.');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create document';
      toastManager.error('Error Creating Document', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async getUnemployedRecords() {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to access unemployed records.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await employmentApi.get('/unemployed-records');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch unemployed records';
      toastManager.error('Error Loading Records', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async createUnemployedRecord(recordData: any) {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to create unemployed records.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await employmentApi.post('/unemployed-records', recordData);
      toastManager.success('Record Created', 'Unemployed record has been created successfully.');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create unemployed record';
      toastManager.error('Error Creating Record', errorMessage);
      throw new Error(errorMessage);
    }
  }

  // Search and Filter Features
  public async searchJobsByText(query: string, page = 1, limit = 20) {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to search jobs.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await employmentApi.get(`/search/jobs/text?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to search jobs';
      toastManager.error('Error Searching Jobs', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async searchJobsByInternship(internship = true, page = 1, limit = 20) {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to search internships.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await employmentApi.get(`/search/jobs/internship?internship=${internship}&page=${page}&limit=${limit}`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to search internships';
      toastManager.error('Error Searching Internships', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async getActiveJobs(limit = 20) {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to access active jobs.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await employmentApi.get(`/search/jobs/active?limit=${limit}`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch active jobs';
      toastManager.error('Error Loading Active Jobs', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async getTrendingJobs(limit = 10) {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to access trending jobs.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await employmentApi.get(`/search/jobs/trending?limit=${limit}`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch trending jobs';
      toastManager.error('Error Loading Trending Jobs', errorMessage);
      throw new Error(errorMessage);
    }
  }

  // Admin Statistics
  public async getEmployerStats() {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to access employer statistics.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await employmentApi.get('/admin/employers/stats');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch employer statistics';
      toastManager.error('Error Loading Stats', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async getEmployers() {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to access employers.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await employmentApi.get('/employers');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch employers';
      toastManager.error('Error Loading Employers', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async getPendingJobListings() {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to access pending job listings.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await employmentApi.get('/admin/jobs/pending');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch pending job listings';
      toastManager.error('Error Loading Pending Jobs', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async approveJobListing(jobId: string) {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to approve job listings.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await employmentApi.put(`/admin/jobs/${jobId}/approve`);
      toastManager.success('Job Approved', 'Job listing has been approved successfully.');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to approve job listing';
      toastManager.error('Error Approving Job', errorMessage);
      throw new Error(errorMessage);
    }
  }

  public async rejectJobListing(jobId: string) {
    if (!this.isAuthenticated()) {
      toastManager.error('Authentication Required', 'Please log in to reject job listings.');
      throw new Error('User not authenticated');
    }

    try {
      const response = await employmentApi.put(`/admin/jobs/${jobId}/reject`);
      toastManager.success('Job Rejected', 'Job listing has been rejected successfully.');
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to reject job listing';
      toastManager.error('Error Rejecting Job', errorMessage);
      throw new Error(errorMessage);
    }
  }
}

export const authService = AuthService.getInstance();
