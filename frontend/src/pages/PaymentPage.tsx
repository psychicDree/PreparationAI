import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import type { SessionType } from '../types';
import { CheckIcon, ClockIcon, StarIcon } from '@heroicons/react/24/outline';

const PaymentPage = () => {
  const [selectedSession, setSelectedSession] = useState<string>('');
  const { setCurrentSession, currentSession } = useAppStore();
  const navigate = useNavigate();

  const sessionTypes = [
    {
      id: 'quick_drill',
      name: 'Quick Drill',
      duration: '15 minutes',
      price: 5,
      description: 'Perfect for a quick practice session',
      features: [
        '3-4 focused questions',
        'Basic AI feedback',
        'Quick results'
      ],
      popular: false
    },
    {
      id: 'standard',
      name: 'Standard',
      duration: '30 minutes',
      price: 9,
      description: 'Most popular choice for comprehensive practice',
      features: [
        '6-8 detailed questions',
        'Comprehensive AI feedback',
        'Progress tracking',
        'Detailed analytics'
      ],
      popular: true
    },
    {
      id: 'deep_dive',
      name: 'Deep Dive',
      duration: '60 minutes',
      price: 15,
      description: 'Intensive session for thorough preparation',
      features: [
        '10-12 comprehensive questions',
        'Advanced AI feedback',
        'Detailed progress report',
        'Personalized recommendations',
        'Follow-up resources'
      ],
      popular: false
    }
  ];

  const handleSelectSession = (sessionId: string) => {
    setSelectedSession(sessionId);
  };

  const handlePurchase = () => {
    if (selectedSession && currentSession) {
      const sessionType = sessionTypes.find(s => s.id === selectedSession);
      if (sessionType) {
        const updatedSession = {
          ...currentSession,
          session_type: sessionType.id as SessionType,
          updated_at: new Date().toISOString(),
        };
        setCurrentSession(updatedSession);
        navigate(`/interview/${currentSession.id}`);
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Choose your interview session
        </h1>
        <p className="text-xl text-gray-600">
          Select the perfect session type for your preparation needs
        </p>
      </div>

      {/* Session Cards */}
      <div className="grid md:grid-cols-3 gap-8 mb-12">
        {sessionTypes.map((session) => (
          <div
            key={session.id}
            className={`relative card cursor-pointer transition-all duration-200 ${
              selectedSession === session.id
                ? 'ring-2 ring-primary-500 shadow-lg'
                : 'hover:shadow-md'
            }`}
            onClick={() => handleSelectSession(session.id)}
          >
            {/* Popular Badge */}
            {session.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
            )}

            {/* Selection Indicator */}
            <div className="absolute top-4 right-4">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                selectedSession === session.id
                  ? 'border-primary-500 bg-primary-500'
                  : 'border-gray-300'
              }`}>
                {selectedSession === session.id && (
                  <CheckIcon className="w-4 h-4 text-white" />
                )}
              </div>
            </div>

            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {session.name}
              </h3>
              
              <div className="flex items-center justify-center mb-4">
                <ClockIcon className="w-5 h-5 text-gray-500 mr-2" />
                <span className="text-gray-600">{session.duration}</span>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">${session.price}</span>
                <span className="text-gray-600 ml-1">one-time</span>
              </div>

              <p className="text-gray-600 mb-6">
                {session.description}
              </p>

              <ul className="space-y-3 text-left">
                {session.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <CheckIcon className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Security & Guarantee */}
      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        <div className="grid md:grid-cols-3 gap-6 text-center">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
              <CheckIcon className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Secure Payment</h3>
            <p className="text-sm text-gray-600">Protected by Stripe encryption</p>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
              <StarIcon className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Satisfaction Guarantee</h3>
            <p className="text-sm text-gray-600">30-day money-back guarantee</p>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-3">
              <ClockIcon className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Instant Access</h3>
            <p className="text-sm text-gray-600">Start your interview immediately</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => navigate('/warmup')}
          className="btn-secondary"
        >
          Back to Warmup
        </button>
        
        <button
          onClick={handlePurchase}
          disabled={!selectedSession}
          className={`px-8 py-3 rounded-lg font-medium transition-colors ${
            !selectedSession
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-primary-600 hover:bg-primary-700 text-white'
          }`}
        >
          Purchase & Start Interview
        </button>
      </div>

      {/* Payment Methods */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500 mb-4">We accept all major credit cards</p>
        <div className="flex justify-center space-x-4">
          <div className="w-12 h-8 bg-gray-200 rounded flex items-center justify-center">
            <span className="text-xs font-bold text-gray-600">VISA</span>
          </div>
          <div className="w-12 h-8 bg-gray-200 rounded flex items-center justify-center">
            <span className="text-xs font-bold text-gray-600">MC</span>
          </div>
          <div className="w-12 h-8 bg-gray-200 rounded flex items-center justify-center">
            <span className="text-xs font-bold text-gray-600">AMEX</span>
          </div>
          <div className="w-12 h-8 bg-gray-200 rounded flex items-center justify-center">
            <span className="text-xs font-bold text-gray-600">DISC</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
