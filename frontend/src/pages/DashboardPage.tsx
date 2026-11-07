import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import apiService, { getApiErrorMessage } from '../services/api';
import type { InterviewSession } from '../types';
import { ArrowRightIcon, PlusIcon } from '@heroicons/react/24/outline';

const SESSION_LABELS: Record<string, string> = {
  quick_drill: 'Quick drill',
  standard: 'Standard',
  deep_dive: 'Deep dive',
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

const StatCard = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="rounded-[14px] border border-line bg-panel p-6">
    <p className="text-[13px] font-medium text-muted">{label}</p>
    <p className="mt-3 text-3xl font-bold tracking-[-0.02em] text-ink">{value}</p>
    {hint && <p className="mt-1 text-xs text-soft">{hint}</p>}
  </div>
);

const SessionRow = ({ session }: { session: InterviewSession }) => {
  const completed = session.status === 'completed';
  const body = (
    <>
      <div className="min-w-0">
        <p className="truncate font-semibold text-ink">
          {SESSION_LABELS[session.session_type] ?? 'Standard'} session
          {session.tags.length > 0 && <span className="font-normal text-muted"> · {session.tags.join(', ')}</span>}
        </p>
        <p className="mt-1 text-sm text-soft">{formatDate(session.created_at)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        {typeof session.score === 'number' ? (
          <span className="text-lg font-bold text-ink">{session.score.toFixed(1)}</span>
        ) : (
          <span className="rounded-md bg-white/[0.06] px-2 py-1 text-xs font-medium text-muted">
            {completed ? 'No report yet' : 'In progress'}
          </span>
        )}
        {completed && <ArrowRightIcon className="h-4 w-4 text-soft" />}
      </div>
    </>
  );
  const cls = 'flex items-center justify-between gap-4 border-b border-line px-6 py-4 last:border-b-0';
  return completed ? (
    <Link to={`/feedback/${session.id}`} className={`${cls} transition-colors hover:bg-white/[0.03]`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, sessions, setSessions } = useAppStore();
  const [isLoading, setIsLoading] = useState(isAuthenticated);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    apiService
      .getSessions()
      .then((result) => {
        if (!cancelled) setSessions(result ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, 'Could not load your sessions.'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, attempt, setSessions]);

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-content px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-lg rounded-[18px] border border-line bg-panel p-10 text-center">
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink">Sign in to see your progress</h1>
          <p className="mt-3 text-muted">
            Your sessions and interview reports are saved to your account.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button onClick={() => navigate('/onboarding', { state: { mode: 'signin', from: '/dashboard' } })} className="btn-primary">
              Sign in
            </button>
            <button onClick={() => navigate('/')} className="btn-secondary">
              Try a demo interview
            </button>
          </div>
        </div>
      </div>
    );
  }

  const completed = sessions.filter((s) => s.status === 'completed');
  const scored = sessions.filter((s): s is InterviewSession & { score: number } => typeof s.score === 'number');
  const average = scored.length ? scored.reduce((sum, s) => sum + s.score, 0) / scored.length : null;
  const latest = scored[0]; // sessions arrive newest first

  return (
    <div className="mx-auto max-w-content px-4 py-12 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.02em] text-ink">
            {user?.name ? `Welcome back, ${user.name.split(' ')[0]}` : 'Welcome back'}
          </h1>
        </div>
        <button onClick={() => navigate('/')} className="btn-primary">
          <PlusIcon className="h-5 w-5" />
          New interview
        </button>
      </div>

      {error ? (
        <div className="mt-8 rounded-[14px] border border-red-200 bg-red-50 p-6 text-red-700">
          <p>{error}</p>
          <button onClick={() => setAttempt((n) => n + 1)} className="btn-secondary mt-4">
            Try again
          </button>
        </div>
      ) : isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-line border-t-accent" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="mt-8 rounded-[18px] border border-line bg-panel p-12 text-center">
          <h2 className="text-xl font-semibold text-ink">No sessions yet</h2>
          <p className="mx-auto mt-2 max-w-md text-muted">
            Start a mock interview. When you finish, your scores and report show up here.
          </p>
          <button onClick={() => navigate('/')} className="btn-primary mt-6">
            Start a mock interview
          </button>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Sessions" value={String(sessions.length)} />
            <StatCard label="Completed" value={String(completed.length)} />
            <StatCard label="Average score" value={average === null ? '—' : average.toFixed(1)} hint={average === null ? 'Finish a session to get a score' : 'out of 10'} />
            <StatCard label="Latest score" value={latest ? latest.score.toFixed(1) : '—'} hint={latest ? formatDate(latest.created_at) : undefined} />
          </div>

          <div className="mt-8 overflow-hidden rounded-[14px] border border-line bg-panel">
            <div className="border-b border-line px-6 py-4">
              <h2 className="font-semibold text-ink">Your sessions</h2>
            </div>
            {sessions.map((session) => (
              <SessionRow key={session.id} session={session} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
