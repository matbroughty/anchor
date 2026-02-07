import Link from "next/link";

/**
 * Landing page hero section
 * Server component - no client-side interactivity needed
 */
export function LandingHero() {
  return (
    <section className="min-h-[60vh] flex items-center justify-center bg-gradient-to-b from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-950">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-24 md:py-32 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-neutral-900 dark:text-neutral-100 mb-10">
          Your music profile, tastefully done
        </h1>
        <Link
          href="/signin"
          className="inline-block bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-8 py-4 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors font-medium text-lg"
        >
          Get Started
        </Link>
      </div>
    </section>
  );
}
