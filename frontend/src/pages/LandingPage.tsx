import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import apiService from '../services/api';
import { 
  PlayIcon, 
  CheckCircleIcon,
  StarIcon,
  UserGroupIcon,
  ClockIcon,
  AcademicCapIcon 
} from '@heroicons/react/24/outline';

const LandingPage = () => {
  const [roleInput, setRoleInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setCurrentSession, isAuthenticated } = useAppStore();
  const navigate = useNavigate();

  const handleStartPreparing = async () => {
    if (!roleInput.trim()) return;
    
    setIsLoading(true);
    
    try {
      if (!isAuthenticated) {
        // Create a guest session for unauthenticated users
        const tempSession = {
          id: 'temp-session',
          user_id: 'guest-user',
          session_type: 'standard' as const,
          status: 'active' as const,
          tags: [roleInput.trim()],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setCurrentSession(tempSession);
      } else {
        // For authenticated users, create a real session
        const sessionData = {
          session_type: 'standard' as const,
          tags: [roleInput.trim()],
        };
        
        const session = await apiService.createSession(sessionData);
        setCurrentSession(session);
      }
      
      navigate('/role-setup');
    } catch (error) {
      console.error('Failed to start session:', error);
      // Fallback to guest session
      const tempSession = {
        id: 'temp-session',
        user_id: 'guest-user',
        session_type: 'standard' as const,
        status: 'active' as const,
        tags: [roleInput.trim()],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setCurrentSession(tempSession);
      navigate('/role-setup');
    } finally {
      setIsLoading(false);
    }
  };


  const features = [
    {
      icon: <AcademicCapIcon className="w-8 h-8 text-primary-600" />,
      title: "AI-Powered Questions",
      description: "Get personalized interview questions based on your role and experience level"
    },
    {
      icon: <StarIcon className="w-8 h-8 text-primary-600" />,
      title: "Real-time Feedback",
      description: "Receive instant evaluation on technical depth, communication, and problem-solving"
    },
    {
      icon: <ClockIcon className="w-8 h-8 text-primary-600" />,
      title: "Flexible Sessions",
      description: "Choose from quick drills (15 min), standard (30 min), or deep dive (60 min) sessions"
    },
    {
      icon: <UserGroupIcon className="w-8 h-8 text-primary-600" />,
      title: "Progress Tracking",
      description: "Monitor your improvement over time with detailed analytics and recommendations"
    }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Software Engineer",
      company: "Google",
      content: "PreparationAI helped me land my dream job at Google. The AI feedback was incredibly detailed and actionable.",
      rating: 5
    },
    {
      name: "Michael Rodriguez",
      role: "Full Stack Developer",
      company: "Netflix",
      content: "The mock interviews were so realistic. I felt completely prepared for my actual interviews.",
      rating: 5
    },
    {
      name: "Emily Johnson",
      role: "Product Manager",
      company: "Meta",
      content: "The personalized questions based on my background made all the difference. Highly recommended!",
      rating: 5
    }
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden hero-gradient py-24 lg:py-32">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 floating-animation"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 floating-animation" style={{animationDelay: '2s'}}></div>
        </div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="fade-in">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 leading-tight">
              Interview Copilot™
              <span className="block text-white mt-2">Your Ultimate AI Interview Assistant</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-white/90 mb-12 max-w-4xl mx-auto leading-relaxed">
              Get AI-powered responses that keep you calm, cool, and collected. 
              <span className="font-semibold text-white">Even when the pressure's on.</span>
            </p>
          </div>

          {/* Role Input */}
          <div className="max-w-3xl mx-auto mb-12 slide-up">
            <div className="glass-effect rounded-2xl p-8 shadow-2xl">
              <h3 className="text-lg font-semibold text-white mb-4">What role are you preparing for?</h3>
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  placeholder="Enter your role or skills (e.g., Unity Developer, React Engineer, Data Scientist)"
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  className="input-field flex-1 text-lg"
                  onKeyPress={(e) => e.key === 'Enter' && handleStartPreparing()}
                />
                <button
                  onClick={handleStartPreparing}
                  disabled={isLoading}
                  className="btn-primary flex items-center justify-center space-x-3 px-8 py-4 text-lg glow-effect disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>{isLoading ? 'Starting...' : 'Get Started for Free'}</span>
                  {!isLoading && <PlayIcon className="w-6 h-6" />}
                </button>
              </div>
            </div>
          </div>

          {/* Sample Question Preview */}
          <div className="max-w-5xl mx-auto slide-up">
            <div className="card-hover border-l-4 border-blue-500">
              <div className="flex items-center mb-4">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3 glow-effect"></div>
                <h3 className="text-xl font-bold text-gray-900">Sample AI-Generated Question:</h3>
              </div>
              <p className="text-lg text-gray-700 italic leading-relaxed">
                "How would you secure a client–server multiplayer architecture in Unity using Netcode?"
              </p>
              <div className="mt-4 flex items-center text-sm text-gray-600">
                <CheckCircleIcon className="w-4 h-4 mr-2 text-green-600" />
                <span>Personalized based on your role and experience level</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Secret Weapons, 
              <span className="text-gradient"> Just for You</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Interview Copilot™ offers an all-in-one AI interview helper to help you tackle every hurdle, and keep you prepared and ready to excel, no matter what's thrown your way.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card-hover text-center group">
                <div className="flex justify-center mb-6">
                  <div className="p-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-gray-50 relative overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Join a community of 
              <span className="text-gradient"> 500k+ candidates</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              who've landed jobs at top companies. Loved by job seekers. Backed by real results.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="card-hover group">
                <div className="flex items-center mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <StarIcon key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic text-lg leading-relaxed">
                  "{testimonial.content}"
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg mr-4">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-lg">{testimonial.name}</p>
                    <p className="text-gray-600">{testimonial.role} at {testimonial.company}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 hero-gradient relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Your Next Move 
            <span className="block text-white">Starts Now</span>
          </h2>
          <p className="text-xl md:text-2xl text-white/90 mb-12 max-w-3xl mx-auto leading-relaxed">
            A strong resume gets you in the door, but landing the job requires confidence, preparation, and strategy. Interview Copilot™ gives you the tools to master every question.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => navigate('/onboarding', { state: { mode: 'signup' } })}
              className="bg-white text-blue-600 hover:bg-gray-100 font-bold py-4 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl text-lg glow-effect"
            >
              Get Started for Free
            </button>
            <button
              onClick={() => navigate('/onboarding', { state: { mode: 'signin' } })}
              className="border-2 border-white text-white hover:bg-white hover:text-blue-600 font-semibold py-4 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 text-lg"
            >
              Sign In
            </button>
          </div>
          <p className="text-white/80 mt-6 text-sm">
            No credit card required • Start practicing in minutes
          </p>
        </div>
      </section>

    </div>
  );
};

export default LandingPage;
