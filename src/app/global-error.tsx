'use client';

import React, { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global application error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen bg-teal-900 py-8 flex items-center justify-center">
          <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8 text-center">
            <h2 className="text-2xl font-semibold text-violet-900 mb-4">Something went wrong!</h2>
            <p className="text-gray-600 mb-6">
              {error.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => reset()}
              className="px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 font-medium"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
} 