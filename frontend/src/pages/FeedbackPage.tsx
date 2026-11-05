import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import apiService, { getApiErrorMessage } from '../services/api';
import type { SessionFeedback } from '../types';
import { 
  StarIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ChartBarIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline';

const FeedbackPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { feedback, setFeedback, isAuthenticated } = useAppStore();
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

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 8) return 'bg-green-100';
    if (score >= 6) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const renderStars = (score: number) => {
    const stars = [];
    const fullStars = Math.floor(score / 2);
    const hasHalfStar = score % 2 >= 1;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<StarIcon key={i} className="w-6 h-6 text-yellow-400 fill-current" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<StarIcon key={i} className="w-6 h-6 text-yellow-400 fill-current opacity-50" />);
      } else {
        stars.push(<StarIcon key={i} className="w-6 h-6 text-gray-300" />);
      }
    }
    return stars;
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center max-w-md">
          <ExclamationTriangleIcon className="w-12 h-12 text-orange-500 mx-auto mb-4" />
          <p className="text-gray-900 font-medium mb-2">We couldn't generate your feedback.</p>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => setAttempt((value) => value + 1)}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!currentFeedback) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Analyzing your answers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {isDemo && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          This is a sample report.{' '}
          <Link to="/onboarding" className="font-medium underline">
            Sign in
          </Link>{' '}
          to get AI feedback on your own answers.
        </div>
      )}

      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Interview Feedback Report
        </h1>
        <p className="text-xl text-gray-600">
          Here's your detailed performance analysis and recommendations
        </p>
      </div>

      {/* Overall Score */}
      <div className="card mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Overall Performance</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className={`w-20 h-20 rounded-full ${getScoreBgColor(currentFeedback.technical_score)} flex items-center justify-center mx-auto mb-3`}>
              <span className={`text-2xl font-bold ${getScoreColor(currentFeedback.technical_score)}`}>
                {currentFeedback.technical_score}
              </span>
            </div>
            <h3 className="text-lg font-medium text-gray-900">Technical Depth</h3>
            <div className="flex justify-center mt-2">
              {renderStars(currentFeedback.technical_score)}
            </div>
          </div>
          
          <div className="text-center">
            <div className={`w-20 h-20 rounded-full ${getScoreBgColor(currentFeedback.communication_score)} flex items-center justify-center mx-auto mb-3`}>
              <span className={`text-2xl font-bold ${getScoreColor(currentFeedback.communication_score)}`}>
                {currentFeedback.communication_score}
              </span>
            </div>
            <h3 className="text-lg font-medium text-gray-900">Communication</h3>
            <div className="flex justify-center mt-2">
              {renderStars(currentFeedback.communication_score)}
            </div>
          </div>
          
          <div className="text-center">
            <div className={`w-20 h-20 rounded-full ${getScoreBgColor(currentFeedback.problem_solving_score)} flex items-center justify-center mx-auto mb-3`}>
              <span className={`text-2xl font-bold ${getScoreColor(currentFeedback.problem_solving_score)}`}>
                {currentFeedback.problem_solving_score}
              </span>
            </div>
            <h3 className="text-lg font-medium text-gray-900">Problem Solving</h3>
            <div className="flex justify-center mt-2">
              {renderStars(currentFeedback.problem_solving_score)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Strengths */}
        <div className="card">
          <div className="flex items-center mb-4">
            <CheckCircleIcon className="w-6 h-6 text-green-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Strengths</h2>
          </div>
          <ul className="space-y-3">
            {currentFeedback.strengths.map((strength, index) => (
              <li key={index} className="flex items-start">
                <CheckCircleIcon className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">{strength}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Areas for Improvement */}
        <div className="card">
          <div className="flex items-center mb-4">
            <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Areas for Improvement</h2>
          </div>
          <ul className="space-y-3">
            {currentFeedback.weaknesses.map((weakness, index) => (
              <li key={index} className="flex items-start">
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500 mr-3 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">{weakness}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recommendations */}
      <div className="card mt-8">
        <div className="flex items-center mb-4">
          <BookOpenIcon className="w-6 h-6 text-blue-600 mr-2" />
          <h2 className="text-xl font-semibold text-gray-900">Recommended Next Steps</h2>
        </div>
        <ul className="space-y-3">
          {currentFeedback.recommendations.map((recommendation, index) => (
            <li key={index} className="flex items-start">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0 text-sm font-medium">
                {index + 1}
              </div>
              <span className="text-gray-700">{recommendation}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center justify-center space-x-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
        >
          <ChartBarIcon className="w-5 h-5" />
          <span>View Dashboard</span>
        </button>
        
        <button
          onClick={() => navigate('/role-setup')}
          className="flex items-center justify-center space-x-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
        >
          <ArrowPathIcon className="w-5 h-5" />
          <span>Practice Again</span>
        </button>
      </div>
    </div>
  );
};

export default FeedbackPage;
