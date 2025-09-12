import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';

const RoleSetupPage = () => {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const { setCurrentSession, currentSession } = useAppStore();
  const navigate = useNavigate();

  // Initialize tags from current session if available
  useEffect(() => {
    if (currentSession && currentSession.tags.length > 0) {
      setSelectedTags(currentSession.tags);
    }
  }, [currentSession]);

  const predefinedTags = [
    'Unity', 'React', 'Node.js', 'Python', 'JavaScript', 'TypeScript',
    'AWS', 'Docker', 'Kubernetes', 'PostgreSQL', 'MongoDB', 'Redis',
    'Machine Learning', 'AI', 'Blockchain', 'Web3', 'Mobile Development',
    'Frontend', 'Backend', 'Full Stack', 'DevOps', 'Cloud Computing'
  ];

  const industries = [
    'Technology', 'Finance', 'Healthcare', 'E-commerce', 'Gaming',
    'Education', 'Media', 'Automotive', 'Manufacturing', 'Other'
  ];

  const roles = [
    'Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
    'DevOps Engineer', 'Data Scientist', 'Product Manager', 'UI/UX Designer',
    'Mobile Developer', 'Game Developer', 'Machine Learning Engineer', 'Other'
  ];

  const specialties = [
    'Web Development', 'Mobile Development', 'Game Development', 'Data Science',
    'Machine Learning', 'Cloud Computing', 'DevOps', 'Cybersecurity',
    'Blockchain', 'IoT', 'AR/VR', 'Other'
  ];

  const addTag = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const removeTag = (tag: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tag));
  };

  const addCustomTag = () => {
    if (customTag.trim() && !selectedTags.includes(customTag.trim())) {
      setSelectedTags([...selectedTags, customTag.trim()]);
      setCustomTag('');
    }
  };

  const handleNext = () => {
    if (selectedTags.length > 0) {
      // Update the current session with selected tags
      const updatedSession = {
        id: 'temp-session',
        user_id: 'temp-user',
        session_type: 'standard' as const,
        status: 'active' as const,
        tags: selectedTags,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setCurrentSession(updatedSession);
      navigate('/warmup');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Let's customize your interview experience
        </h1>
        <p className="text-xl text-gray-600">
          Select your skills and preferences to generate personalized interview questions
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Tag Selection */}
        <div className="card">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Select Your Skills & Technologies
          </h2>
          
          {/* Selected Tags */}
          {selectedTags.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-700 mb-3">Selected Skills:</h3>
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-2 text-primary-600 hover:text-primary-800"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Predefined Tags */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-700 mb-3">Popular Skills:</h3>
            <div className="flex flex-wrap gap-2">
              {predefinedTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => addTag(tag)}
                  disabled={selectedTags.includes(tag)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Tag Input */}
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-3">Add Custom Skill:</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter a skill or technology"
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                className="input-field flex-1"
                onKeyPress={(e) => e.key === 'Enter' && addCustomTag()}
              />
              <button
                onClick={addCustomTag}
                className="btn-primary flex items-center space-x-2"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>
          </div>
        </div>

        {/* Industry & Role Selection */}
        <div className="space-y-6">
          {/* Industry Selection */}
          <div className="card">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Industry</h2>
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="input-field"
            >
              <option value="">Select your industry</option>
              {industries.map((industry) => (
                <option key={industry} value={industry}>
                  {industry}
                </option>
              ))}
            </select>
          </div>

          {/* Role Selection */}
          <div className="card">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Role</h2>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="input-field"
            >
              <option value="">Select your role</option>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          {/* Specialty Selection */}
          <div className="card">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Specialty</h2>
            <select
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              className="input-field"
            >
              <option value="">Select your specialty</option>
              {specialties.map((specialty) => (
                <option key={specialty} value={specialty}>
                  {specialty}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center mt-8">
        <button
          onClick={() => navigate('/')}
          className="btn-secondary"
        >
          Back to Home
        </button>
        
        <button
          onClick={handleNext}
          disabled={selectedTags.length === 0}
          className={`px-8 py-3 rounded-lg font-medium transition-colors ${
            selectedTags.length === 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-primary-600 hover:bg-primary-700 text-white'
          }`}
        >
          Next: Warmup & Calibration
        </button>
      </div>
    </div>
  );
};

export default RoleSetupPage;
