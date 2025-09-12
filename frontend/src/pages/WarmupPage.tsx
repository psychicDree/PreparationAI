import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

const WarmupPage = () => {
  const [experience, setExperience] = useState<number>(0);
  const [preferredStyles, setPreferredStyles] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const { setCurrentSession, currentSession } = useAppStore();
  const navigate = useNavigate();

  const experienceOptions = [
    { value: 0, label: '0-1 years (Entry Level)' },
    { value: 1, label: '1-2 years (Junior)' },
    { value: 2, label: '2-3 years (Junior+)' },
    { value: 3, label: '3-5 years (Mid Level)' },
    { value: 4, label: '5-7 years (Senior)' },
    { value: 5, label: '7+ years (Lead/Principal)' },
  ];

  const prepStyles = [
    {
      id: 'coding',
      label: 'Coding Challenges',
      description: 'Algorithm and data structure problems, live coding sessions'
    },
    {
      id: 'system_design',
      label: 'System Design',
      description: 'Architecture discussions, scalability, and system planning'
    },
    {
      id: 'behavioral',
      label: 'Behavioral Questions',
      description: 'STAR method, leadership, teamwork, and problem-solving scenarios'
    },
    {
      id: 'technical_discussion',
      label: 'Technical Discussion',
      description: 'Deep-dive into technologies, frameworks, and best practices'
    }
  ];

  const warmupQuestions = [
    {
      id: 1,
      question: "What's your current experience level with the technologies you selected?",
      type: 'experience'
    },
    {
      id: 2,
      question: "Which interview preparation style do you prefer?",
      type: 'preferences'
    },
    {
      id: 3,
      question: "How much time do you typically have for interview preparation?",
      type: 'time'
    }
  ];

  const handleStyleToggle = (styleId: string) => {
    setPreferredStyles(prev => 
      prev.includes(styleId) 
        ? prev.filter(s => s !== styleId)
        : [...prev, styleId]
    );
  };

  const handleNext = () => {
    if (currentQuestion < warmupQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // All questions answered, proceed to payment
      if (currentSession) {
        // Update the existing session
        const updatedSession = {
          ...currentSession,
          updated_at: new Date().toISOString(),
        };
        setCurrentSession(updatedSession);
      }
      navigate('/payment');
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    } else {
      navigate('/role-setup');
    }
  };

  const isCurrentQuestionComplete = () => {
    const question = warmupQuestions[currentQuestion];
    switch (question.type) {
      case 'experience':
        return experience >= 0;
      case 'preferences':
        return preferredStyles.length > 0;
      case 'time':
        return true; // This would be implemented with time selection
      default:
        return false;
    }
  };

  const renderQuestion = () => {
    const question = warmupQuestions[currentQuestion];
    
    switch (question.type) {
      case 'experience':
        return (
          <div className="space-y-4">
            <p className="text-lg text-gray-600 mb-6">
              This helps us tailor the difficulty and complexity of your interview questions.
            </p>
            <div className="space-y-3">
              {experienceOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    experience === option.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="experience"
                    value={option.value}
                    checked={experience === option.value}
                    onChange={(e) => setExperience(Number(e.target.value))}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                    experience === option.value
                      ? 'border-primary-500 bg-primary-500'
                      : 'border-gray-300'
                  }`}>
                    {experience === option.value && (
                      <CheckCircleIcon className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <span className="text-gray-900">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 'preferences':
        return (
          <div className="space-y-4">
            <p className="text-lg text-gray-600 mb-6">
              Select all the interview preparation styles you'd like to focus on.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {prepStyles.map((style) => (
                <label
                  key={style.id}
                  className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    preferredStyles.includes(style.id)
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={preferredStyles.includes(style.id)}
                    onChange={() => handleStyleToggle(style.id)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded border-2 mr-3 mt-0.5 flex items-center justify-center ${
                    preferredStyles.includes(style.id)
                      ? 'border-primary-500 bg-primary-500'
                      : 'border-gray-300'
                  }`}>
                    {preferredStyles.includes(style.id) && (
                      <CheckCircleIcon className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{style.label}</h3>
                    <p className="text-sm text-gray-600 mt-1">{style.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        );

      case 'time':
        return (
          <div className="space-y-4">
            <p className="text-lg text-gray-600 mb-6">
              How much time do you typically have for interview preparation?
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { value: '15', label: '15 minutes', description: 'Quick practice session' },
                { value: '30', label: '30 minutes', description: 'Standard interview length' },
                { value: '60', label: '60 minutes', description: 'Deep dive session' }
              ].map((option) => (
                <div
                  key={option.value}
                  className="p-4 rounded-lg border-2 border-gray-200 text-center"
                >
                  <h3 className="font-medium text-gray-900">{option.label}</h3>
                  <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Let's calibrate your interview experience
        </h1>
        <p className="text-xl text-gray-600">
          A few quick questions to personalize your mock interview
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Question {currentQuestion + 1} of {warmupQuestions.length}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round(((currentQuestion + 1) / warmupQuestions.length) * 100)}% Complete
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / warmupQuestions.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Question Card */}
      <div className="card mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">
          {warmupQuestions[currentQuestion].question}
        </h2>
        {renderQuestion()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={handleBack}
          className="btn-secondary"
        >
          {currentQuestion === 0 ? 'Back to Setup' : 'Previous Question'}
        </button>
        
        <button
          onClick={handleNext}
          disabled={!isCurrentQuestionComplete()}
          className={`px-8 py-3 rounded-lg font-medium transition-colors ${
            !isCurrentQuestionComplete()
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-primary-600 hover:bg-primary-700 text-white'
          }`}
        >
          {currentQuestion === warmupQuestions.length - 1 ? 'Continue to Payment' : 'Next Question'}
        </button>
      </div>
    </div>
  );
};

export default WarmupPage;
