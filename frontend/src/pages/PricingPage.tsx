import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import apiService from '../services/api';
import { 
  CheckIcon, 
  XMarkIcon,
  StarIcon,
  ArrowRightIcon,
  SparklesIcon,
  BoltIcon,
  ShieldCheckIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: {
    features: string[];
    limitations?: string[];
  };
  max_sessions_per_month: number;
  max_session_duration: number;
  is_active: boolean;
}

interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  billing_cycle: string;
  current_period_end: string;
  plan: SubscriptionPlan;
}

const PricingPage = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isSubscribing, setIsSubscribing] = useState<string | null>(null);
  
  const { isAuthenticated } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch subscription plans
      const plansResponse = await apiService.getSubscriptionPlans();
      setPlans(plansResponse.data.data);

      // Fetch user subscription if authenticated
      if (isAuthenticated) {
        try {
          const subscriptionResponse = await apiService.getUserSubscription();
          setUserSubscription(subscriptionResponse.data.data);
        } catch {
          // User might not have a subscription yet
          // This should not happen as backend auto-assigns free plan
        }
      }
    } catch (error) {
      console.error('Failed to fetch pricing data:', error);
      console.error('Error details:', error);
      // Set empty array as fallback
      setPlans([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    if (!isAuthenticated) {
      // Redirect to landing page to start the onboarding flow
      navigate('/');
      return;
    }

    // Don't allow subscribing to the same plan
    if (isCurrentPlan(planId)) {
      return;
    }

    setIsSubscribing(planId);
    
    try {
      const response = await apiService.createSubscription({
        plan_id: planId,
        billing_cycle: billingCycle
      });
      
      setUserSubscription(response.data.data);
      
      // Show success message or redirect
      alert('Subscription created successfully!');
      
    } catch (error) {
      console.error('Failed to create subscription:', error);
      alert('Failed to create subscription. Please try again.');
    } finally {
      setIsSubscribing(null);
    }
  };

  const getPlanIcon = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'free':
        return <SparklesIcon className="w-8 h-8" />;
      case 'starter':
        return <BoltIcon className="w-8 h-8" />;
      case 'professional':
        return <StarIcon className="w-8 h-8" />;
      case 'enterprise':
        return <ShieldCheckIcon className="w-8 h-8" />;
      default:
        return <UserGroupIcon className="w-8 h-8" />;
    }
  };

  const getPlanColor = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'free':
        return 'from-gray-500 to-gray-600';
      case 'starter':
        return 'from-blue-500 to-blue-600';
      case 'professional':
        return 'from-purple-500 to-purple-600';
      case 'enterprise':
        return 'from-orange-500 to-orange-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const formatPrice = (price: number) => {
    if (price === 0) return 'Free';
    return `$${price.toFixed(2)}`;
  };

  const getCurrentPlanId = () => {
    return userSubscription?.plan_id;
  };

  const isCurrentPlan = (planId: string) => {
    return getCurrentPlanId() === planId;
  };

  const isFreePlan = (planId: string) => {
    return planId === '00000000-0000-0000-0000-000000000001';
  };



  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Choose Your Plan
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Select the perfect plan for your interview preparation needs
            </p>
            
            {/* Billing Toggle */}
            <div className="flex items-center justify-center space-x-4 mb-8">
              <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
                Monthly
              </span>
              <button
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-gray-900' : 'text-gray-500'}`}>
                Yearly
              </span>
              {billingCycle === 'yearly' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Save 17%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Current Subscription Status */}
      {isAuthenticated && userSubscription && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Your Current Plan: {userSubscription.plan.name}
            </h3>
            <p className="text-blue-700">
              {userSubscription.plan.description}
            </p>
            {userSubscription.plan.name === 'Free' && (
              <p className="text-sm text-blue-600 mt-2">
                Upgrade to unlock more features and unlimited sessions!
              </p>
            )}
          </div>
        </div>
      )}

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {!Array.isArray(plans) || plans.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <p className="text-gray-500">No subscription plans available at the moment.</p>
            </div>
          ) : (
            plans.map((plan) => {
            const isCurrent = isCurrentPlan(plan.id);
            const isPopular = plan.name.toLowerCase() === 'professional';
            const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
            
            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl shadow-lg border-2 transition-all duration-300 hover:shadow-xl ${
                  isPopular ? 'border-purple-500 scale-105' : 'border-gray-200'
                } ${isCurrent ? 'ring-2 ring-blue-500' : ''}`}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-purple-500 text-white">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Current Plan Badge */}
                {isCurrent && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-blue-500 text-white">
                      {isFreePlan(plan.id) ? 'Your Free Plan' : 'Current Plan'}
                    </span>
                  </div>
                )}

                <div className="p-8">
                  {/* Plan Header */}
                  <div className="text-center mb-8">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r ${getPlanColor(plan.name)} text-white mb-4`}>
                      {getPlanIcon(plan.name)}
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <p className="text-gray-600 mb-4">{plan.description}</p>
                    
                    {/* Price */}
                    <div className="mb-4">
                      <span className="text-4xl font-bold text-gray-900">
                        {formatPrice(price)}
                      </span>
                      {price > 0 && (
                        <span className="text-gray-600 ml-2">
                          /{billingCycle === 'monthly' ? 'month' : 'year'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-4 mb-8">
                    {plan.features.features.map((feature, index) => (
                      <div key={index} className="flex items-start">
                        <CheckIcon className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                    
                    {plan.features.limitations && plan.features.limitations.map((limitation, index) => (
                      <div key={index} className="flex items-start">
                        <XMarkIcon className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                        <span className="text-gray-500 text-sm">{limitation}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={isSubscribing === plan.id || isCurrent}
                    className={`w-full py-3 px-6 rounded-lg font-medium transition-all duration-300 ${
                      isCurrent
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : isPopular
                        ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 shadow-lg hover:shadow-xl'
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isSubscribing === plan.id ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Processing...
                      </div>
                    ) : isCurrent ? (
                      isFreePlan(plan.id) ? 'Your Free Plan' : 'Current Plan'
                    ) : (
                      <div className="flex items-center justify-center">
                        {isAuthenticated ? 'Upgrade' : 'Get Started'}
                        <ArrowRightIcon className="w-5 h-5 ml-2" />
                      </div>
                    )}
                  </button>
                </div>
              </div>
            );
          })
          )}
        </div>

        {/* FAQ Section */}
        <div className="mt-24">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Frequently Asked Questions
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Can I change my plan anytime?
              </h3>
              <p className="text-gray-600">
                Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                What happens to my data if I cancel?
              </h3>
              <p className="text-gray-600">
                Your interview history and progress data will be preserved for 30 days after cancellation, giving you time to reactivate.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Do you offer refunds?
              </h3>
              <p className="text-gray-600">
                We offer a 30-day money-back guarantee for all paid plans. Contact support if you're not satisfied.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Is there a free trial?
              </h3>
              <p className="text-gray-600">
                Yes! The Free plan gives you 3 mock interviews per month to try out our platform with no commitment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
