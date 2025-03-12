export default function Loading() {
  return (
    <div className="min-h-screen bg-teal-900 py-8 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8 text-center">
        <div className="animate-pulse">
          <div className="h-8 bg-violet-100 rounded w-1/2 mx-auto mb-4"></div>
          <div className="h-4 bg-violet-100 rounded w-3/4 mx-auto mb-2"></div>
          <div className="h-4 bg-violet-100 rounded w-2/3 mx-auto mb-2"></div>
          <div className="h-4 bg-violet-100 rounded w-1/2 mx-auto"></div>
        </div>
        <p className="mt-6 text-gray-600">Loading results...</p>
      </div>
    </div>
  );
} 