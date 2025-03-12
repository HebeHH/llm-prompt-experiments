'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Results page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-teal-900 py-8 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8 text-center">
        <h2 className="text-2xl font-semibold text-violet-900 mb-4">Results Error</h2>
        <p className="text-gray-600 mb-6">
          {error.message || 'An error occurred while displaying the results'}
        </p>
        <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3 justify-center">
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 font-medium"
          >
            Try again
          </button>
          <button
            onClick={() => router.push('/create')}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium"
          >
            New Experiment
          </button>
        </div>
      </div>
    </div>
  );
} 