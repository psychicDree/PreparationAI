import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { isAxiosError } from 'axios';
import { useAppStore } from '../store/useAppStore';
import apiService, { getApiErrorMessage } from '../services/api';
import { getStripe, paymentsEnabled } from '../utils/stripe';
import type { SessionType } from '../types';
import { CheckIcon, ClockIcon, StarIcon } from '@heroicons/react/24/outline';

// Card form shown after the server has created a PaymentIntent. Cards that need
// 3-D Secure, and other redirect-based methods, come back to /payment with
// ?payment_intent=...&redirect_status=..., which PaymentPage handles on load.
const CheckoutForm = ({
  amountCents,
  returnUrl,
  onPaid,
  onCancel,
}: {
  amountCents: number;
  returnUrl: string;
  onPaid: (paymentIntentId: string) => Promise<void>;
  onCancel: () => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isPaying, setIsPaying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsPaying(true);
    setMessage(null);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: { return_url: returnUrl },
    });

    if (error) {
      setMessage(error.message ?? 'Your payment could not be completed.');
      setIsPaying(false);
      return;
    }
    if (paymentIntent?.status === 'succeeded') {
      try {
        await onPaid(paymentIntent.id);
      } catch (err) {
        setMessage(getApiErrorMessage(err, 'Payment went through, but we could not start your session. Please contact support.'));
        setIsPaying(false);
      }
      return;
    }
    setMessage(
      paymentIntent?.status === 'processing'
        ? 'Your payment is processing. We will start your session once it completes.'
        : 'Your payment could not be completed.'
    );
    setIsPaying(false);
  };

  return (
    <form onSubmit={handleSubmit} className="card max-w-xl mx-auto mb-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Payment details</h2>
      <p className="text-gray-600 mb-6">Total: ${(amountCents / 100).toFixed(2)} (one-time)</p>
      <PaymentElement />
      {message && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{message}</div>
      )}
      <div className="flex justify-between items-center mt-6">
        <button type="button" onClick={onCancel} disabled={isPaying} className="btn-secondary">
          Change session
        </button>
        <button
          type="submit"
          disabled={!stripe || !elements || isPaying}
          className="px-8 py-3 rounded-lg font-medium transition-colors bg-primary-600 hover:bg-primary-700 text-white disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
        >
          {isPaying ? 'Processing...' : `Pay $${(amountCents / 100).toFixed(2)}`}
        </button>
      </div>
    </form>
  );
};

const PaymentPage = () => {
  const [selectedSession, setSelectedSession] = useState<string>('');
  const { setCurrentSession, currentSession, isAuthenticated } = useAppStore();
  const navigate = useNavigate();
  const [checkout, setCheckout] = useState<{ clientSecret: string; amount: number } | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handledReturn = useRef(false);

  // Real payment applies only to a signed-in user's saved session; guests and
  // the local placeholder session continue to the demo interview as before.
  const canPay =
    paymentsEnabled() && isAuthenticated && !!currentSession && currentSession.id !== 'temp-session';

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

  // Records the chosen type locally and moves on to the interview.
  const startInterview = useCallback((sessionType: SessionType) => {
    if (!currentSession) return;
    setCurrentSession({
      ...currentSession,
      session_type: sessionType,
      updated_at: new Date().toISOString(),
    });
    navigate(`/interview/${currentSession.id}`);
  }, [currentSession, setCurrentSession, navigate]);

  // Tells the backend the payment succeeded; it re-checks the payment with
  // Stripe (amount, session, user) before marking the session paid.
  const finishPayment = useCallback(async (paymentIntentId: string, sessionType: SessionType) => {
    if (!currentSession) return;
    await apiService.confirmPayment(paymentIntentId, currentSession.id);
    startInterview(sessionType);
  }, [currentSession, startInterview]);

  // Back from a redirect-based confirmation (e.g. 3-D Secure).
  useEffect(() => {
    if (handledReturn.current) return;
    const params = new URLSearchParams(window.location.search);
    const paymentIntentId = params.get('payment_intent');
    if (!paymentIntentId) return;
    handledReturn.current = true;

    const status = params.get('redirect_status');
    const sessionType = (params.get('session_type') || currentSession?.session_type || 'standard') as SessionType;
    if (status !== 'succeeded') {
      setError('Your payment was not completed. Please try again.');
      return;
    }
    setIsStarting(true);
    finishPayment(paymentIntentId, sessionType).catch((err) => {
      setError(getApiErrorMessage(err, 'Payment went through, but we could not start your session. Please contact support.'));
      setIsStarting(false);
    });
  }, [currentSession, finishPayment]);

  const handlePurchase = async () => {
    if (!selectedSession || !currentSession) return;
    const sessionType = selectedSession as SessionType;

    if (!canPay) {
      startInterview(sessionType);
      return;
    }

    setIsStarting(true);
    setError(null);
    try {
      const intent = await apiService.createPaymentIntent({
        session_id: currentSession.id,
        session_type: sessionType,
      });
      setCheckout({ clientSecret: intent.client_secret, amount: intent.amount });
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        // Already paid for: go straight to the interview.
        startInterview(currentSession.session_type);
        return;
      }
      setError(getApiErrorMessage(err, 'Could not start checkout. Please try again.'));
    } finally {
      setIsStarting(false);
    }
  };

  const returnUrl = currentSession
    ? `${window.location.origin}/payment?session_type=${encodeURIComponent(selectedSession)}`
    : '';

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
            onClick={() => !checkout && handleSelectSession(session.id)}
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

      {error && (
        <div className="max-w-xl mx-auto mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Checkout */}
      {checkout ? (
        <Elements stripe={getStripe()} options={{ clientSecret: checkout.clientSecret, appearance: { theme: 'stripe' } }}>
          <CheckoutForm
            amountCents={checkout.amount}
            returnUrl={returnUrl}
            onPaid={(paymentIntentId) => finishPayment(paymentIntentId, selectedSession as SessionType)}
            onCancel={() => setCheckout(null)}
          />
        </Elements>
      ) : (
        /* Navigation */
        <div className="flex justify-between items-center">
          <button
            onClick={() => navigate('/warmup')}
            className="btn-secondary"
          >
            Back to Warmup
          </button>

          <button
            onClick={handlePurchase}
            disabled={!selectedSession || isStarting}
            className={`px-8 py-3 rounded-lg font-medium transition-colors ${
              !selectedSession || isStarting
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700 text-white'
            }`}
          >
            {isStarting ? 'Starting checkout...' : canPay ? 'Continue to Payment' : 'Purchase & Start Interview'}
          </button>
        </div>
      )}

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
