import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import apiService, { getApiErrorMessage } from '../services/api';
import wsService from '../services/websocket';
import type { Question, UserResponse } from '../types';
import { ArrowRightIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const SESSION_LABELS: Record<string, string> = {
  quick_drill: 'Quick drill',
  standard: 'Standard',
  deep_dive: 'Deep dive',
};

const InterviewDashboard = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const {
    questions,
    currentQuestionIndex,
    setQuestions,
    setCurrentQuestionIndex,
    addResponse,
    setFeedback,
    isAuthenticated,
    currentSession,
    interviewSetup,
  } = useAppStore();
  // Guests (and the local placeholder session) get demo questions; AI generation needs a saved session
  const isDemo = !isAuthenticated || !sessionId || sessionId === 'temp-session';

  const [timeRemaining, setTimeRemaining] = useState(120); // 2 minutes per question
  const [isRecording, setIsRecording] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  // Demo questions for guest sessions
  const demoQuestions: Question[] = [
    {
      id: 'q1',
      session_id: sessionId || '',
      question_text: 'How would you secure a client–server multiplayer architecture in Unity using Netcode?',
      question_type: 'technical' as const,
      order_index: 1,
      created_at: new Date().toISOString()
    },
    {
      id: 'q2',
      session_id: sessionId || '',
      question_text: 'Explain the difference between client-side and server-side authority in multiplayer games.',
      question_type: 'technical' as const,
      order_index: 2,
      created_at: new Date().toISOString()
    },
    {
      id: 'q3',
      session_id: sessionId || '',
      question_text: 'How would you handle network synchronization for a real-time multiplayer game?',
      question_type: 'system_design' as const,
      order_index: 3,
      created_at: new Date().toISOString()
    }
  ];

  useEffect(() => {
    setFeedback(null);

    if (isDemo) {
      setQuestions(demoQuestions);
      return;
    }

    let cancelled = false;
    setQuestions([]);
    setLoadError(null);

    const setup = currentSession?.id === sessionId ? currentSession : null;
    apiService
      .generateQuestions(sessionId, {
        experience: interviewSetup?.experience ?? 0,
        preferences: interviewSetup?.preferences ?? [],
        session_type: setup?.session_type,
        tags: setup?.tags,
      })
      .then((generated) => {
        if (!cancelled) setQuestions(generated);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(getApiErrorMessage(error, 'Failed to generate interview questions.'));
      });

    return () => {
      cancelled = true;
    };
    // Setup values are read once per load; changing them mid-interview must not regenerate questions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, isDemo, loadAttempt, setQuestions, setFeedback]);

  // Open the realtime interview channel once a logged-in user starts a
  // preparation session. Guests and the local placeholder session are not
  // connected (the channel requires a JWT and a saved session).
  useEffect(() => {
    if (isDemo || !sessionId) return;

    let active = true;
    wsService
      .connect(sessionId)
      .then(() => {
        if (active) wsService.joinSession(sessionId);
      })
      .catch((error) => console.error('WebSocket connection failed:', error));

    return () => {
      active = false;
      wsService.disconnect();
    };
  }, [isDemo, sessionId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Time's up, auto-submit
          handleSubmitResponse();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // The timer is intentionally set up once on mount; depending on the
    // submit handler would reset the countdown on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    // In real app, this would start audio recording
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    // In real app, this would stop recording and process audio
  };

  const handleSubmitResponse = async () => {
    const question = questions[currentQuestionIndex];
    if (!responseText.trim() || !question) return;

    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      let response: UserResponse;
      if (isDemo) {
        response = {
          id: `response-${Date.now()}`,
          session_id: sessionId || '',
          question_id: question.id,
          response_text: responseText,
          submitted_at: new Date().toISOString()
        };
      } else {
        response = await apiService.submitResponse(sessionId, question.id, responseText);
      }

      addResponse(response);

      // Notify the interview channel that a response was submitted.
      if (!isDemo && sessionId) {
        wsService.notifyResponseSubmitted(sessionId, response.id);
      }

      // Move to next question or finish
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setResponseText('');
        setTimeRemaining(120); // Reset timer
      } else {
        // Interview complete, navigate to feedback
        navigate(`/feedback/${sessionId}`);
      }
    } catch (error) {
      console.error('Failed to submit response:', error);
      setSubmitError(getApiErrorMessage(error, 'Failed to submit your response. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const isLastQuestion = currentQuestionIndex >= questions.length - 1;
  const lowTime = timeRemaining <= 30;
  const sessionLabel = SESSION_LABELS[currentSession?.session_type ?? 'standard'] ?? 'Standard';
  const roleLabel = currentSession?.tags?.[0];

  if (loadError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md text-center">
          <ExclamationTriangleIcon className="mx-auto mb-4 h-12 w-12 text-orange-500" />
          <p className="mb-2 font-semibold text-ink">We couldn't prepare your interview.</p>
          <p className="mb-6 text-muted">{loadError}</p>
          <button onClick={() => setLoadAttempt((attempt) => attempt + 1)} className="btn-primary">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-line border-t-accent" />
          <p className="text-muted">
            {isDemo ? 'Loading interview questions...' : 'Generating your personalized interview questions...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      {/* Session bar */}
      <div className="flex h-14 items-center justify-between gap-4 border-b border-line px-4 sm:px-6">
        <p className="truncate text-sm font-medium text-muted">
          {sessionLabel} session{roleLabel ? ` · ${roleLabel}` : ''}
        </p>
        <div className="flex shrink-0 items-center gap-5">
          <span
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold tabular-nums ${
              lowTime ? 'bg-orange-50 text-orange-700' : 'bg-accent-soft text-ink'
            }`}
            aria-live="polite"
          >
            {formatTime(timeRemaining)} left
          </span>
          <Link to={isAuthenticated ? '/dashboard' : '/'} className="text-sm font-medium text-muted hover:text-ink">
            Exit
          </Link>
        </div>
      </div>

      <div className="flex flex-1">
        {/* Question list */}
        <aside className="hidden w-[300px] shrink-0 border-r border-line bg-panel px-3 py-8 lg:block" aria-label="Questions">
          <p className="eyebrow mb-4 px-3 text-[11px]">Questions</p>
          <ol className="space-y-1">
            {questions.map((question, index) => (
              <li
                key={question.id}
                aria-current={index === currentQuestionIndex ? 'step' : undefined}
                className={`truncate rounded-lg px-3 py-2.5 text-sm font-medium ${
                  index === currentQuestionIndex
                    ? 'bg-accent-soft font-semibold text-ink'
                    : index < currentQuestionIndex
                      ? 'text-muted'
                      : 'text-soft'
                }`}
                title={question.question_text}
              >
                {index + 1}. {question.question_text}
              </li>
            ))}
          </ol>
        </aside>

        {/* Question + answer */}
        <section className="min-w-0 flex-1 px-4 py-10 sm:px-10 lg:px-14">
          {isDemo && (
            <div className="mb-8 rounded-[10px] border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
              These are demo questions.{' '}
              <Link to="/onboarding" className="font-semibold underline underline-offset-2">
                Sign in
              </Link>{' '}
              to get AI-generated questions and feedback tailored to your role.
            </div>
          )}

          <p className="eyebrow">
            Question {currentQuestionIndex + 1} of {questions.length}
          </p>
          <div className="mt-3 h-1.5 rounded-full bg-line" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>

          <h1 className="mt-8 max-w-3xl text-2xl font-semibold leading-tight tracking-[-0.015em] text-ink sm:text-[30px]">
            {currentQuestion.question_text}
          </h1>

          <label htmlFor="answer" className="mt-8 block text-[13px] font-medium text-muted">
            Your answer
          </label>
          <div className="relative mt-2.5">
            <textarea
              id="answer"
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Type your answer here... Be detailed and explain your thought process."
              className="h-72 w-full resize-none rounded-xl border border-line bg-field px-6 py-5 leading-relaxed text-ink placeholder-soft focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <span className="pointer-events-none absolute bottom-3.5 right-4 text-xs font-medium text-soft">
              {responseText.length} characters
            </span>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              className="inline-flex items-center gap-2.5 rounded-[10px] border border-line bg-panel px-4 py-3 text-sm font-semibold text-ink transition-colors hover:border-soft"
              aria-pressed={isRecording}
            >
              <span className={`h-2.5 w-2.5 rounded-full bg-[#FF5F57] ${isRecording ? 'animate-pulse' : ''}`} />
              {isRecording ? 'Stop recording' : 'Record answer'}
            </button>

            <div className="flex items-center gap-4">
              {submitError && (
                <span className="flex items-center text-sm text-red-700" role="alert">
                  <ExclamationTriangleIcon className="mr-1 h-4 w-4" />
                  {submitError}
                </span>
              )}
              {!submitError && lowTime && (
                <span className="flex items-center text-sm text-orange-700">
                  <ExclamationTriangleIcon className="mr-1 h-4 w-4" />
                  Time running low!
                </span>
              )}
              <button
                onClick={handleSubmitResponse}
                disabled={!responseText.trim() || isSubmitting}
                className="btn-primary"
              >
                {isSubmitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Submitting...
                  </>
                ) : (
                  <>
                    {isLastQuestion ? 'Finish interview' : 'Next question'}
                    <ArrowRightIcon className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Tips + session */}
        <aside className="hidden w-[340px] shrink-0 border-l border-line bg-panel px-7 py-8 xl:block">
          <p className="eyebrow text-[11px]">Quick tips</p>
          <ul className="mt-4 list-disc space-y-2.5 pl-4 text-[15px] text-ink marker:text-soft">
            <li>Be specific and detailed</li>
            <li>Explain your thought process</li>
            <li>Consider edge cases</li>
          </ul>

          <p className="eyebrow mt-9 text-[11px]">Session</p>
          <dl className="mt-3.5 space-y-4 rounded-xl border border-line bg-field p-5 text-sm">
            {[
              ['Type', sessionLabel],
              ['Questions', String(questions.length)],
              ['Time per question', '2 min'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <dt className="text-muted">{label}</dt>
                <dd className="font-semibold text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </div>
  );
};

export default InterviewDashboard;
