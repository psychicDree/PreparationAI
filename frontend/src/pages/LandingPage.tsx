import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import apiService from '../services/api';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

const sampleQuestions = [
  'A project you led end to end',
  'Debugging a memory leak',
  'React re-renders on keystroke',
  'Designing a rate limiter',
  'Disagreeing with a reviewer',
  'Scaling a read-heavy API',
  'A decision you would reverse',
];

const steps = [
  {
    title: 'Name the role',
    body: 'Type the job you are preparing for, then pick your skills and experience level.',
  },
  {
    title: 'Answer tailored questions',
    body: 'Work through questions written for that role, against a two-minute timer per question.',
  },
  {
    title: 'Read your report',
    body: 'Get scores for technical depth, communication and problem-solving, with what to keep and what to fix.',
  },
];

const sessionTypes = [
  { name: 'Quick drill', minutes: 15, questions: 4 },
  { name: 'Standard', minutes: 30, questions: 7 },
  { name: 'Deep dive', minutes: 60, questions: 11 },
];

// Static, decorative preview of the interview screen (mirrors pages/InterviewDashboard).
const ProductPreview = () => (
  <div aria-hidden="true" className="relative mx-auto mt-16 max-w-[1120px] px-4 sm:px-6">
    <div className="h-[420px] overflow-hidden rounded-t-2xl border border-b-0 border-line bg-panel shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
      <div className="flex h-12 items-center justify-between border-b border-line px-5">
        <div className="flex gap-2">
          <span className="h-[11px] w-[11px] rounded-full bg-[#FF5F57]" />
          <span className="h-[11px] w-[11px] rounded-full bg-[#FEBC2E]" />
          <span className="h-[11px] w-[11px] rounded-full bg-[#28C840]" />
        </div>
        <span className="hidden text-[13px] font-medium text-soft sm:block">Standard session · Frontend Engineer</span>
        <span className="rounded-md bg-white/[0.07] px-2.5 py-1 text-[13px] font-semibold text-ink">1:24 left</span>
      </div>
      <div className="flex h-full">
        <div className="hidden w-[250px] shrink-0 border-r border-line bg-panel-2 p-5 lg:block">
          <p className="eyebrow mb-4 text-[11px]">Questions</p>
          <ol className="space-y-1 text-[13px] font-medium">
            {sampleQuestions.map((q, i) => (
              <li
                key={q}
                className={`rounded-lg px-2 py-2 ${i === 2 ? 'bg-accent-soft font-semibold text-ink' : i < 2 ? 'text-muted' : 'text-soft'}`}
              >
                {i + 1}. {q}
              </li>
            ))}
          </ol>
        </div>
        <div className="min-w-0 flex-1 p-8">
          <p className="eyebrow text-[11px]">Question 3 of 7</p>
          <div className="mt-3 h-1.5 rounded-full bg-line">
            <div className="h-full w-[43%] rounded-full bg-accent" />
          </div>
          <p className="mt-6 text-xl font-semibold leading-snug text-ink sm:text-[22px]">
            A React list re-renders on every keystroke. How would you find the cause and fix it?
          </p>
          <div className="mt-5 rounded-[10px] border border-line bg-canvas p-5 text-sm leading-relaxed text-muted">
            I’d start with the React Profiler to confirm which components re-render and why. The usual cause is a new
            object or callback created on each render and passed as a prop…
          </div>
        </div>
        <div className="hidden w-[290px] shrink-0 border-l border-line p-7 md:block">
          <p className="eyebrow text-[11px]">Quick tips</p>
          <ul className="mt-4 list-disc space-y-2 pl-4 text-sm text-ink marker:text-soft">
            <li>Be specific and detailed</li>
            <li>Explain your thought process</li>
            <li>Consider edge cases</li>
          </ul>
          <p className="eyebrow mt-8 text-[11px]">Session</p>
          <dl className="mt-3 space-y-3 rounded-xl border border-line bg-field p-4 text-sm">
            {[['Type', 'Standard'], ['Questions', '7'], ['Time per question', '2 min']].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <dt className="text-muted">{k}</dt>
                <dd className="font-semibold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-canvas to-transparent" />
  </div>
);

const LandingPage = () => {
  const [roleInput, setRoleInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setCurrentSession, isAuthenticated } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Header/footer links point at /#how-it-works; scroll there once rendered.
  useEffect(() => {
    if (location.hash) {
      document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location.hash]);

  const startGuestSession = () => {
    setCurrentSession({
      id: 'temp-session',
      user_id: 'guest-user',
      session_type: 'standard',
      status: 'active',
      tags: [roleInput.trim()],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  };

  const handleStartPreparing = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!roleInput.trim()) return;

    setIsLoading(true);
    try {
      if (!isAuthenticated) {
        startGuestSession();
      } else {
        const session = await apiService.createSession({ session_type: 'standard', tags: [roleInput.trim()] });
        setCurrentSession(session);
      }
      navigate('/role-setup');
    } catch (error) {
      console.error('Failed to start session:', error);
      startGuestSession();
      navigate('/role-setup');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative pt-16 sm:pt-20">
        <div className="glow-hero pointer-events-none absolute left-1/2 top-0 h-[760px] w-[1200px] -translate-x-1/2" />
        <div className="relative mx-auto max-w-content px-4 text-center sm:px-6">
          <span className="inline-block rounded-full bg-accent-soft px-3.5 py-1.5 text-[13px] font-medium text-accent-text">
            AI mock interviews
          </span>
          <h1 className="mx-auto mt-6 max-w-[880px] text-4xl font-bold leading-[1.05] tracking-[-0.03em] text-ink sm:text-6xl lg:text-[64px]">
            Mock interviews that score every answer.
          </h1>
          <p className="mx-auto mt-5 max-w-[620px] text-lg leading-relaxed text-muted sm:text-[19px]">
            Questions tailored to your role and level, then feedback on technical depth, communication and
            problem-solving.
          </p>

          <form onSubmit={handleStartPreparing} className="mx-auto mt-9 flex max-w-[560px] flex-col gap-3 sm:flex-row">
            <label htmlFor="role" className="sr-only">Role you are preparing for</label>
            <input
              id="role"
              type="text"
              placeholder="e.g. Senior Frontend Engineer"
              value={roleInput}
              onChange={(e) => setRoleInput(e.target.value)}
              className="input-field flex-1"
            />
            <button type="submit" disabled={isLoading || !roleInput.trim()} className="btn-light whitespace-nowrap">
              {isLoading ? 'Starting…' : 'Start a mock interview'}
            </button>
          </form>
          <a href="#how-it-works" className="mt-4 inline-block text-sm font-medium text-muted hover:text-ink">
            See how it works
          </a>
        </div>

        <ProductPreview />
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20 border-t border-line py-24">
        <div className="mx-auto max-w-content px-4 sm:px-6">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-[-0.02em] text-ink sm:text-4xl">
            From job title to scored report in one session.
          </h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {steps.map((step, i) => (
              <div key={step.title} className="rounded-2xl border border-line bg-panel p-7">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-soft text-sm font-semibold text-accent-text">
                  {i + 1}
                </span>
                <h3 className="mt-5 text-lg font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Session types */}
      <section className="border-t border-line py-24">
        <div className="mx-auto max-w-content px-4 sm:px-6">
          <p className="eyebrow">Sessions</p>
          <h2 className="mt-3 text-3xl font-bold tracking-[-0.02em] text-ink sm:text-4xl">Pick a length that fits your day.</h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {sessionTypes.map((type) => (
              <div key={type.name} className="rounded-2xl border border-line bg-panel p-7">
                <h3 className="text-lg font-semibold text-ink">{type.name}</h3>
                <p className="mt-6 text-4xl font-bold tracking-[-0.02em] text-ink">
                  {type.minutes}
                  <span className="ml-1 text-base font-medium text-soft">min</span>
                </p>
                <p className="mt-2 text-muted">{type.questions} questions</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="relative border-t border-line py-24">
        <div className="glow-hero pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[900px] -translate-x-1/2 -translate-y-1/2 opacity-70" />
        <div className="relative mx-auto max-w-content px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-[-0.02em] text-ink sm:text-5xl">Practice before it counts.</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
            Try a demo session without an account, or sign up to get questions and feedback on your own answers.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <button onClick={() => navigate('/onboarding', { state: { mode: 'signup' } })} className="btn-light">
              Create a free account
              <ArrowRightIcon className="h-4 w-4" />
            </button>
            <button onClick={() => navigate('/onboarding', { state: { mode: 'signin' } })} className="btn-secondary">
              Sign in
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
