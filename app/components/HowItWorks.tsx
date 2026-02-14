/**
 * How it works section
 * Simple three-step explanation
 */
export function HowItWorks() {
  return (
    <section className="bg-white py-16 md:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-3xl font-semibold text-neutral-900 mb-12">
          How it works
        </h2>

        <ol className="space-y-8 text-left max-w-xl mx-auto">
          <li className="flex gap-4">
            <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-neutral-900 text-white font-semibold text-sm">
              1
            </span>
            <p className="text-lg text-neutral-900 pt-0.5">
              Connect Spotify, Last.fm, or curate your own
            </p>
          </li>

          <li className="flex gap-4">
            <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-neutral-900 text-white font-semibold text-sm">
              2
            </span>
            <div className="pt-0.5">
              <p className="text-lg text-neutral-900">
                Generate your anchor
              </p>
              <p className="text-sm text-neutral-600 mt-1">
                Create your bio, add your Musical Eras timeline, select your favourite Tim&apos;s Twitter Listening Party, and customize your profile
              </p>
            </div>
          </li>

          <li className="flex gap-4">
            <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-neutral-900 text-white font-semibold text-sm">
              3
            </span>
            <p className="text-lg text-neutral-900 pt-0.5">
              Publish your page
            </p>
          </li>
        </ol>
      </div>
    </section>
  );
}
