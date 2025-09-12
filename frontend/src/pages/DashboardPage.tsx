import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { 
  PlusIcon, 
  ChartBarIcon, 
  ClockIcon,
  StarIcon,
  ArrowTrendingUpIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, sessions } = useAppStore();

  // Mock data for demo
  const mockSessions = [
    {
      id: 'session-1',
      user_id: 'user-1',
      session_type: 'standard' as const,
      status: 'completed' as const,
      tags: ['Unity', 'Netcode', 'Multiplayer'],
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:30:00Z',
      score: 8.2
    },
    {
      id: 'session-2',
      user_id: 'user-1',
      session_type: 'quick_drill' as const,
      status: 'completed' as const,
      tags: ['React', 'TypeScript'],
      created_at: '2024-01-10T14:00:00Z',
      updated_at: '2024-01-10T14:15:00Z',
      score: 7.5
    },
    {
      id: 'session-3',
      user_id: 'user-1',
      session_type: 'deep_dive' as const,
      status: 'completed' as const,
      tags: ['System Design', 'Scalability'],
      created_at: '2024-01-05T09:00:00Z',
      updated_at: '2024-01-05T10:00:00Z',
      score: 9.1
    }
  ];

  const currentSessions = sessions.length > 0 ? sessions : mockSessions;

  const stats = {
    totalSessions: currentSessions.length,
    averageScore: currentSessions.reduce((acc, session) => acc + (session.score || 0), 0) / currentSessions.length,
    improvement: '+12%', // Mock improvement
    streak: 5 // Mock streak
  };

  const recentSessions = currentSessions.slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.name || 'User'}!
          </h1>
          <p className="text-gray-600 mt-1">
            Ready to continue your interview preparation journey?
          </p>
        </div>
        <button
          onClick={() => navigate('/role-setup')}
          className="btn-primary flex items-center space-x-2"
        >
          <PlusIcon className="w-5 h-5" />
          <span>New Interview</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSessions}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <StarIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Score</p>
              <p className="text-2xl font-bold text-gray-900">{stats.averageScore.toFixed(1)}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <ArrowTrendingUpIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Improvement</p>
              <p className="text-2xl font-bold text-gray-900">{stats.improvement}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <CalendarIcon className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Current Streak</p>
              <p className="text-2xl font-bold text-gray-900">{stats.streak} days</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Recent Sessions */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Recent Sessions</h2>
              <button
                onClick={() => navigate('/dashboard')}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                View All
              </button>
            </div>

            <div className="space-y-4">
              {recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/feedback/${session.id}`)}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      session.session_type === 'quick_drill'
                        ? 'bg-green-100'
                        : session.session_type === 'standard'
                        ? 'bg-blue-100'
                        : 'bg-purple-100'
                    }`}>
                      <ClockIcon className={`w-6 h-6 ${
                        session.session_type === 'quick_drill'
                          ? 'text-green-600'
                          : session.session_type === 'standard'
                          ? 'text-blue-600'
                          : 'text-purple-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 capitalize">
                        {session.session_type.replace('_', ' ')} Session
                      </h3>
                      <p className="text-sm text-gray-600">
                        {session.tags.join(', ')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(session.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-1">
                      <StarIcon className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="font-medium text-gray-900">
                        {session.score?.toFixed(1) || 'N/A'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">Score</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions & Recommendations */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/role-setup')}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
                <span>Start New Interview</span>
              </button>
              
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                <ChartBarIcon className="w-5 h-5" />
                <span>View Progress</span>
              </button>
            </div>
          </div>

          {/* Recommendations */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recommendations</h2>
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900">Practice System Design</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Your last session showed strength in technical questions. Try a system design session next.
                </p>
              </div>
              
              <div className="p-3 bg-green-50 rounded-lg">
                <h3 className="font-medium text-green-900">Improve Communication</h3>
                <p className="text-sm text-green-700 mt-1">
                  Focus on explaining technical concepts more clearly in your next session.
                </p>
              </div>
            </div>
          </div>

          {/* Upsell */}
          <div className="card bg-gradient-to-br from-primary-50 to-secondary-50 border-primary-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Unlock More Sessions</h2>
            <p className="text-gray-600 mb-4">
              Get 5 more interviews for just $30 and save 15%!
            </p>
            <button className="w-full btn-primary">
              Upgrade Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
