import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  User,
  InterviewSession,
  Question,
  SessionFeedback,
  UserResponse,
} from '../types';

interface AppState {
  // User state
  user: User | null;
  isAuthenticated: boolean;

  // Session state
  currentSession: InterviewSession | null;
  sessions: InterviewSession[];

  // Interview state
  questions: Question[];
  currentQuestionIndex: number;
  responses: UserResponse[];
  feedback: SessionFeedback | null;

  // UI state
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setCurrentSession: (session: InterviewSession | null) => void;
  setSessions: (sessions: InterviewSession[]) => void;
  setQuestions: (questions: Question[]) => void;
  setCurrentQuestionIndex: (index: number) => void;
  addResponse: (response: UserResponse) => void;
  setFeedback: (feedback: SessionFeedback | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetInterview: () => void;
  resetApp: () => void;
  clearPersistedData: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      currentSession: null,
      sessions: [],
      questions: [],
      currentQuestionIndex: 0,
      responses: [],
      feedback: null,
      isLoading: false,
      error: null,

      // Actions
      setUser: (user) => set({ user }),
      setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
      setCurrentSession: (currentSession) => set({ currentSession }),
      setSessions: (sessions) => set({ sessions }),
      setQuestions: (questions) => set({ questions, currentQuestionIndex: 0 }),
      setCurrentQuestionIndex: (currentQuestionIndex) => set({ currentQuestionIndex }),
      addResponse: (response) => set((state) => ({ 
        responses: [...state.responses, response] 
      })),
      setFeedback: (feedback) => set({ feedback }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      resetInterview: () => set({
        currentSession: null,
        questions: [],
        currentQuestionIndex: 0,
        responses: [],
        feedback: null,
      }),

      resetApp: () => {
        // Clear localStorage manually to ensure complete logout
        localStorage.removeItem('preparation-ai-store');
        localStorage.removeItem('auth_token');
        
        set({
          user: null,
          isAuthenticated: false,
          currentSession: null,
          sessions: [],
          questions: [],
          currentQuestionIndex: 0,
          responses: [],
          feedback: null,
          isLoading: false,
          error: null,
        });
      },

      clearPersistedData: () => {
        // Clear all persisted data
        localStorage.removeItem('preparation-ai-store');
        localStorage.removeItem('auth_token');
        // Clear session storage as well
        sessionStorage.clear();
      },
    }),
    {
      name: 'preparation-ai-store',
      partialize: (state) => ({
        // Only persist user data if authenticated
        user: state.isAuthenticated ? state.user : null,
        isAuthenticated: state.isAuthenticated,
        sessions: state.isAuthenticated ? state.sessions : [],
        // Always persist current session to maintain onboarding flow
        currentSession: state.currentSession,
      }),
      // Add version to handle migrations
      version: 1,
      // Add migration to clear data if needed
      migrate: (persistedState: unknown, version: number) => {
        if (version === 0) {
          // Clear old persisted data
          return {
            user: null,
            isAuthenticated: false,
            sessions: [],
          } as unknown as AppState;
        }
        return persistedState as AppState;
      },
    }
  )
);

// Selectors for common state access
export const useUser = () => useAppStore((state) => state.user);
export const useIsAuthenticated = () => useAppStore((state) => state.isAuthenticated);
export const useCurrentSession = () => useAppStore((state) => state.currentSession);
export const useQuestions = () => useAppStore((state) => state.questions);
export const useCurrentQuestion = () => useAppStore((state) => 
  state.questions[state.currentQuestionIndex]
);
export const useCurrentQuestionIndex = () => useAppStore((state) => state.currentQuestionIndex);
export const useResponses = () => useAppStore((state) => state.responses);
export const useFeedback = () => useAppStore((state) => state.feedback);
export const useIsLoading = () => useAppStore((state) => state.isLoading);
export const useError = () => useAppStore((state) => state.error);
