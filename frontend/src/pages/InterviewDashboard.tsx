import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import wsService from '../services/websocket';
import type { Question } from '../types';
import { 
  PlayIcon, 
  StopIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const InterviewDashboard = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { questions, currentQuestionIndex, setQuestions, setCurrentQuestionIndex, addResponse, isAuthenticated } = useAppStore();
  
  const [timeRemaining, setTimeRemaining] = useState(120); // 2 minutes per question
  const [isRecording, setIsRecording] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock questions for demo
  const mockQuestions: Question[] = [
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
    // Load questions (in real app, this would be an API call)
    setQuestions(mockQuestions);
  }, [sessionId, setQuestions]);

  // Open the realtime interview channel once a logged-in user starts a
  // preparation session. Guests are not connected (the channel requires a JWT).
  useEffect(() => {
    if (!isAuthenticated || !sessionId) return;

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
  }, [isAuthenticated, sessionId]);

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
    if (!responseText.trim()) return;

    setIsSubmitting(true);
    
    try {
      // Mock response submission
      const mockResponse = {
        id: `response-${Date.now()}`,
        session_id: sessionId || '',
        question_id: questions[currentQuestionIndex]?.id || '',
        response_text: responseText,
        audio_url: isRecording ? 'mock-audio-url' : undefined,
        submitted_at: new Date().toISOString()
      };

      addResponse(mockResponse);

      // Notify the interview channel that a response was submitted.
      if (sessionId) {
        wsService.notifyResponseSubmitted(sessionId, mockResponse.id);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading interview questions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900">
            Mock Interview Session
          </h1>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary-600">
              {formatTime(timeRemaining)}
            </div>
            <div className="text-sm text-gray-500">remaining</div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-sm text-gray-600 mt-2">
          <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Question Panel */}
        <div className="lg:col-span-1">
          <div className="card sticky top-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Current Question
            </h2>
            
            <div className="mb-4">
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                currentQuestion.question_type === 'technical'
                  ? 'bg-blue-100 text-blue-800'
                  : currentQuestion.question_type === 'system_design'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                {currentQuestion.question_type.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            <p className="text-gray-700 leading-relaxed">
              {currentQuestion.question_text}
            </p>

            {/* Quick Feedback Indicators */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Tips:</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                  <span>Be specific and detailed</span>
                </div>
                <div className="flex items-center">
                  <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                  <span>Explain your thought process</span>
                </div>
                <div className="flex items-center">
                  <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                  <span>Consider edge cases</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Response Panel */}
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Your Response
            </h2>

            {/* Text Response */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Written Response
              </label>
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Type your answer here... Be detailed and explain your thought process."
                className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Audio Recording */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Audio Response (Optional)
              </label>
              <div className="flex items-center space-x-4">
                {!isRecording ? (
                  <button
                    onClick={handleStartRecording}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    <PlayIcon className="w-5 h-5" />
                    <span>Start Recording</span>
                  </button>
                ) : (
                  <button
                    onClick={handleStopRecording}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    <StopIcon className="w-5 h-5" />
                    <span>Stop Recording</span>
                  </button>
                )}
                
                {isRecording && (
                  <div className="flex items-center space-x-2 text-red-600">
                    <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                    <span className="text-sm">Recording...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                {timeRemaining <= 30 && (
                  <div className="flex items-center text-orange-600">
                    <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                    <span>Time running low!</span>
                  </div>
                )}
              </div>
              
              <button
                onClick={handleSubmitResponse}
                disabled={!responseText.trim() || isSubmitting}
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                  !responseText.trim() || isSubmitting
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-primary-600 hover:bg-primary-700 text-white'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Interview'}
                    </span>
                    <ArrowRightIcon className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewDashboard;
