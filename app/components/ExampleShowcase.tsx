import Image from "next/image";
import { LANDING_EXAMPLES } from "@/lib/landing-examples";

/**
 * Landing page examples showcase
 * Displays three curated profile previews demonstrating era diversity
 */
export function ExampleShowcase() {
  return (
    <section className="bg-neutral-50 dark:bg-neutral-950 py-16 md:py-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-8 text-center">
          See it in action
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {LANDING_EXAMPLES.map((example) => (
            <div key={example.id} className="group">
              {/* Era label */}
              <p className="text-sm font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-500 mb-3">
                {example.label}
              </p>
              {/* Profile preview image */}
              <div className="aspect-[3/4] w-full rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-800 shadow-sm">
                {/* Placeholder for profile screenshot */}
                <div className="w-full h-full flex items-center justify-center p-8">
                  <div className="text-center">
                    <div className="text-6xl font-bold text-neutral-400 dark:text-neutral-600 mb-4">
                      {example.displayName.charAt(0)}
                    </div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-500">
                      {example.displayName}'s profile
                    </p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-600 mt-2">
                      @{example.handle}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
