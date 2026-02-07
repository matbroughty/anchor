import Link from "next/link";

/**
 * Custom 404 page for /[handle] routes.
 * Triggered when getPublicProfile returns null (handle doesn't exist or is unpublished).
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
      <main className="max-w-md mx-auto px-6 py-16 text-center">
        <h1 className="text-3xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
          Profile Not Found
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 mb-8">
          This page doesn&apos;t exist or is not published.
        </p>
        <Link
          href="/"
          className="inline-block px-5 py-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
        >
          Back to home
        </Link>
      </main>
    </div>
  );
}
