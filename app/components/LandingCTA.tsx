import Link from "next/link";

/**
 * Landing page bottom CTA section
 * Repeats the main call-to-action before the footer
 */
export function LandingCTA() {
  return (
    <section className="bg-neutral-100 dark:bg-neutral-900 py-16 md:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-xl md:text-2xl text-neutral-900 dark:text-neutral-100 mb-8">
          Ready to share your taste?
        </h2>
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
