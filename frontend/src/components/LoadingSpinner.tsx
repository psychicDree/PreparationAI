import { useIsLoading } from '../store/useAppStore';

const LoadingSpinner = () => {
  const isLoading = useIsLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
        <span className="text-gray-700">Loading...</span>
      </div>
    </div>
  );
};

export default LoadingSpinner;
