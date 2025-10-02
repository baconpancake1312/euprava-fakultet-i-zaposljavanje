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
}

export const authService = AuthService.getInstance();
