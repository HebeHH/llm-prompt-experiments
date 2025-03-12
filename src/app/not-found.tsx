import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-teal-900 py-8 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8 text-center">
        <h2 className="text-2xl font-semibold text-violet-900 mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-6">
          Sorry, the page you are looking for does not exist.
        </p>
        <Link 
          href="/"
          className="px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 font-medium inline-block"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
} 