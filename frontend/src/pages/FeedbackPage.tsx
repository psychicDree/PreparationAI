import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import apiService, { getApiErrorMessage } from '../services/api';
import type { SessionFeedback } from '../types';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const SESSION_LABELS: Record<string, string> = {
  quick_drill: 'Quick drill',
  standard: 'Standard',
  deep_dive: 'Deep dive',
};

const FeedbackPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { feedback, setFeedback, isAuthenticated, currentSession, questions } = useAppStore();
  // Guests (and the local placeholder session) see demo feedback; AI evaluation needs a saved session
  const isDemo = !isAuthenticated || !sessionId || sessionId === 'temp-session';
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (isDemo) return;

    let cancelled = false;
    setError(null);

    // Generates feedback on first visit; the backend returns the stored report afterwards
    apiService
      .generateFeedback(sessionId)
      .then((result) => {
        if (!cancelled) setFeedback(result);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, 'Failed to generate your feedback.'));
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId, isDemo, attempt, setFeedback]);

  // Demo feedback for guest sessions
  const demoFeedback: SessionFeedback = {
    id: 'feedback-1',
    session_id: sessionId || '',
    technical_score: 7.5,
    communication_score: 6.5,
    problem_solving_score: 9.0,
    strengths: [
      'Solid understanding of server authority concepts',
      'Good problem-solving approach and methodology',
      'Clear explanation of trade-offs between different approaches'
    ],
    weaknesses: [
      'Missed details on synchronization strategies',
      'Could improve communication clarity in technical explanations',
      'Did not mention specific Netcode APIs or implementation details'
    ],
    recommendations: [
      'Study concurrency patterns in Netcode for GameObjects',
      'Practice explaining technical concepts to non-technical audiences',
      'Review Unity Netcode documentation for specific API usage',
      'Consider edge cases in multiplayer game design'
    ],
    created_at: new Date().toISOString()
  };

  const sessionFeedback = feedback?.session_id === sessionId ? feedback : null;
  const currentFeedback = isDemo ? demoFeedback : sessionFeedback;

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md text-center">
          <ExclamationTriangleIcon className="mx-auto mb-4 h-12 w-12 text-orange-500" />
          <p className="mb-2 font-semibold text-ink">We couldn't generate your feedback.</p>
          <p className="mb-6 text-muted">{error}</p>
          <button onClick={() => setAttempt((value) => value + 1)} className="btn-primary">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!currentFeedback) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-line border-t-accent" />
          <p className="text-muted">Analyzing your answers...</p>
        </div>
      </div>
    );
  }

  const scores = [
    { label: 'Technical depth', value: currentFeedback.technical_score },
    { label: 'Communication', value: currentFeedback.communication_score },
    { label: 'Problem-solving', value: currentFeedback.problem_solving_score },
  ];
  const overall = scores.reduce((sum, score) => sum + score.value, 0) / scores.length;
  const ranked = [...scores].sort((a, b) => b.value - a.value);
  const summary =
    ranked[0].value === ranked[2].value
      ? 'Your scores are even across all three skills.'
      : `Strongest in ${ranked[0].label.toLowerCase()}. ${ranked[2].label} is the skill to work on next.`;

  const session = currentSession?.id === sessionId ? currentSession : null;
  const sessionLabel = SESSION_LABELS[session?.session_type ?? 'standard'] ?? 'Standard';
  const roleLabel = session?.tags?.[0];
  const questionCount = questions.filter((q) => q.session_id === sessionId).length;
  const completed = new Date(currentFeedback.created_at).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const lists = [
    { title: 'Strengths', items: currentFeedback.strengths },
    { title: 'Areas to improve', items: currentFeedback.weaknesses },
    { title: 'Recommended next steps', items: currentFeedback.recommendations },
  ];

  return (
    <div className="mx-auto max-w-[1120px] px-4 py-12 sm:px-6">
      {isDemo && (
        <div className="mb-8 rounded-[10px] border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          This is a sample report.{' '}
          <Link to="/onboarding" className="font-semibold underline underline-offset-2">
            Sign in
          </Link>{' '}
          to get AI feedback on your own answers.
        </div>
      )}

      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Interview report</p>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.02em] text-ink sm:text-[34px]">
            {roleLabel ? `${roleLabel} · ` : ''}
            {sessionLabel} session
          </h1>
          <p className="mt-2.5 text-[15px] text-muted">
            {questionCount > 0 ? `${questionCount} questions answered  ·  ` : ''}Completed {completed}
          </p>
        </div>
        <div className="flex shrink-0 gap-3">
          <button onClick={() => navigate('/dashboard')} className="btn-secondary px-4 py-2.5 text-sm">
            View dashboard
          </button>
          <button onClick={() => navigate('/role-setup')} className="btn-primary px-4 py-2.5 text-sm">
            Practice again
          </button>
        </div>
      </div>

      {/* Scores */}
      <div className="mt-8 grid gap-5 md:grid-cols-[340px_1fr]">
        <div className="rounded-[14px] border border-line bg-panel p-7">
          <p className="eyebrow">Overall</p>
          <p className="mt-4 flex items-baseline gap-2.5">
            <span className="text-7xl font-bold leading-none tracking-[-0.03em] text-ink">{overall.toFixed(1)}</span>
            <span className="text-[15px] font-medium text-soft">out of 10</span>
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted">{summary}</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          {scores.map((score) => (
            <div key={score.label} className="flex flex-col rounded-[14px] border border-line bg-panel p-7">
              <p className="text-[13px] font-medium text-muted">{score.label}</p>
              <p className="mb-8 mt-4 text-[32px] font-bold leading-none tracking-[-0.02em] text-ink">{score.value.toFixed(1)}</p>
              <div className="mt-auto h-1.5 rounded-full bg-line">
                <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(score.value, 10) * 10}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths / improvements / next steps */}
      <div className="mt-5 grid gap-5 md:grid-cols-3">
        {lists.map((list) => (
          <div key={list.title} className="rounded-[14px] border border-line bg-panel p-7">
            <h2 className="text-[15px] font-semibold text-ink">{list.title}</h2>
            <ul className="mt-3.5 list-disc space-y-2 pl-4 text-sm leading-relaxed text-muted marker:text-soft">
              {list.items.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeedbackPage;
