/**
 * Landing page footer
 * Copyright and attribution to Tim's Twitter Listening Party
 */
export function LandingFooter() {
  return (
    <footer className="bg-neutral-50 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-neutral-600 text-center">
            Anchor.band brought to you by the tech team that created{" "}
            <a
              href="https://archive.timstwitterlisteningparty.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 underline transition-colors"
            >
              Tim&apos;s Twitter Listening Party
            </a>
          </p>
          <p className="text-sm text-neutral-500">
            Copyright 2026 Anchor.band
          </p>
        </div>
      </div>
    </footer>
  );
}
