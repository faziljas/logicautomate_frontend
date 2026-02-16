import Link from "next/link";

export default function BusinessNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center text-center px-4 bg-gray-50">
      <div>
        <p className="text-5xl mb-4">😔</p>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Business not found</h1>
        <p className="text-gray-500 text-sm mb-6 max-w-sm">
          The booking page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>
        <Link
          href="/"
          className="inline-block px-5 py-2.5 rounded-xl font-semibold text-white bg-violet-600 hover:bg-violet-700 transition-colors"
        >
          Go to BookFlow
        </Link>
      </div>
    </div>
  );
}
