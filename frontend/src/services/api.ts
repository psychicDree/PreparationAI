import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';
import { config } from '../config';
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
  UserProfile,
  InterviewSession,
  CreateSessionRequest,
  Question,
  SessionFeedback,
  PaymentIntent,
  CreatePaymentIntentRequest,
  UserResponse,
} from '../types';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: config.api.baseUrl,
      timeout: config.api.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor to handle auth errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Generic HTTP methods
  async get<T = unknown>(url: string): Promise<AxiosResponse<T>> {
    return this.api.get<T>(url);
  }

  async post<T = unknown>(url: string, data?: unknown): Promise<AxiosResponse<T>> {
    return this.api.post<T>(url, data);
  }

  async put<T = unknown>(url: string, data?: unknown): Promise<AxiosResponse<T>> {
    return this.api.put<T>(url, data);
  }

  async delete<T = unknown>(url: string): Promise<AxiosResponse<T>> {
    return this.api.delete<T>(url);
  }

  // Authentication methods
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await this.api.post('/auth/register', data);
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
    }
    return response.data;
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await this.api.post('/auth/login', data);
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
    }
    return response.data;
  }

  async logout(): Promise<void> {
    await this.api.post('/auth/logout');
    localStorage.removeItem('auth_token');
  }

  // User methods
  async getProfile(): Promise<User> {
    const response: AxiosResponse<User> = await this.api.get('/profile');
    return response.data;
  }

  async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    const response: AxiosResponse<UserProfile> = await this.api.put('/profile', data);
    return response.data;
  }

  // Session methods
  async createSession(data: CreateSessionRequest): Promise<InterviewSession> {
    const response: AxiosResponse<InterviewSession> = await this.api.post('/sessions', data);
    return response.data;
  }

  async getSessions(): Promise<InterviewSession[]> {
    const response: AxiosResponse<InterviewSession[]> = await this.api.get('/sessions');
    return response.data;
  }

  async getSession(sessionId: string): Promise<InterviewSession> {
    const response: AxiosResponse<InterviewSession> = await this.api.get(`/sessions/${sessionId}`);
    return response.data;
  }

  async generateQuestions(sessionId: string, experience: number, preferences: string[]): Promise<Question[]> {
    const response: AxiosResponse<Question[]> = await this.api.post(`/sessions/${sessionId}/questions`, {
      experience,
      preferences,
    });
    return response.data;
  }

  async submitResponse(sessionId: string, responseText: string, audioUrl?: string): Promise<UserResponse> {
    const response: AxiosResponse<UserResponse> = await this.api.post(`/sessions/${sessionId}/responses`, {
      response_text: responseText,
      audio_url: audioUrl,
    });
    return response.data;
  }

  async getFeedback(sessionId: string): Promise<SessionFeedback> {
    const response: AxiosResponse<SessionFeedback> = await this.api.get(`/sessions/${sessionId}/feedback`);
    return response.data;
  }

  // Payment methods
  async createPaymentIntent(data: CreatePaymentIntentRequest): Promise<PaymentIntent> {
    const response: AxiosResponse<PaymentIntent> = await this.api.post('/payments/create-intent', data);
    return response.data;
  }

  async confirmPayment(paymentIntentId: string, sessionId: string): Promise<void> {
    await this.api.post('/payments/confirm', {
      payment_intent_id: paymentIntentId,
      session_id: sessionId,
    });
  }

  // Utility methods
  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token');
  }

  getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  // Subscription methods. These return the backend's `{ data: T }` envelope;
  // callers supply T for the payload shape.
  async getSubscriptionPlans<T = unknown>() {
    return this.get<{ data: T }>('/subscription-plans');
  }

  async getUserSubscription<T = unknown>() {
    return this.get<{ data: T }>('/subscription');
  }

  async getUserSubscriptionUsage<T = unknown>() {
    return this.get<{ data: T }>('/subscription/usage');
  }

  async createSubscription<T = unknown>(data: { plan_id: string; billing_cycle: 'monthly' | 'yearly' }) {
    return this.post<{ data: T }>('/subscription', data);
  }

  async updateSubscription<T = unknown>(data: Record<string, unknown>) {
    return this.put<{ data: T }>('/subscription', data);
  }

  async checkSessionEligibility<T = unknown>() {
    return this.get<{ data: T }>('/subscription/eligibility');
  }
}

export const apiService = new ApiService();
export default apiService;
