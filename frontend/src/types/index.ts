// User types
export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  experience: number;
  skills: string[];
  preferences: {
    preferred_difficulty: 'beginner' | 'intermediate' | 'advanced';
    focus_areas: string[];
  };
  created_at: string;
  updated_at: string;
}

// Authentication types
export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

// Session types
export type SessionType = 'quick_drill' | 'standard' | 'deep_dive';
export type SessionStatus = 'active' | 'completed' | 'cancelled';

export interface InterviewSession {
  id: string;
  user_id: string;
  session_type: SessionType;
  status: SessionStatus;
  tags: string[];
  score?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateSessionRequest {
  session_type: SessionType;
  tags: string[];
}

// Question types
export interface Question {
  id: string;
  session_id: string;
  question_text: string;
  question_type: 'technical' | 'behavioral' | 'system_design';
  order_index: number;
  created_at: string;
}

export interface UserResponse {
  id: string;
  session_id: string;
  question_id: string;
  response_text: string;
  audio_url?: string;
  submitted_at: string;
}

// Feedback types
export interface SessionFeedback {
  id: string;
  session_id: string;
  technical_score: number;
  communication_score: number;
  problem_solving_score: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  created_at: string;
}

// Payment types
export interface PaymentIntent {
  client_secret: string;
}

export interface CreatePaymentIntentRequest {
  session_type: SessionType;
  amount: number;
}

// Subscription types
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: {
    features: string[];
    limitations?: string[];
  };
  max_sessions_per_month: number;
  max_session_duration: number;
  is_active: boolean;
  stripe_price_id_monthly?: string;
  stripe_price_id_yearly?: string;
  created_at: string;
  updated_at: string;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'cancelled' | 'expired' | 'past_due';
  billing_cycle: 'monthly' | 'yearly';
  stripe_subscription_id?: string;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
  plan: SubscriptionPlan;
}

export interface SubscriptionUsage {
  sessions_used_this_month: number;
  max_sessions_per_month: number;
  current_plan: string;
  status: string;
  expires_at: string;
}

export interface CreateSubscriptionRequest {
  plan_id: string;
  billing_cycle: 'monthly' | 'yearly';
}

// UI State types
export interface AppState {
  user: User | null;
  currentSession: InterviewSession | null;
  questions: Question[];
  currentQuestionIndex: number;
  responses: UserResponse[];
  feedback: SessionFeedback | null;
  isLoading: boolean;
  error: string | null;
}

// Component Props types
export interface PageProps {
  onNavigate: (path: string) => void;
}

export interface SessionCardProps {
  session: InterviewSession;
  onClick: () => void;
}

export interface QuestionCardProps {
  question: Question;
  onAnswer: (response: string) => void;
  timeRemaining: number;
}

export interface FeedbackCardProps {
  feedback: SessionFeedback;
  onRetry: () => void;
}
