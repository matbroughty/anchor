"use client";

import { useEffect, useState } from "react";

interface CelebrationModalProps {
  handle: string;
  onClose: () => void;
}

export function CelebrationModal({ handle, onClose }: CelebrationModalProps) {
  const [copySuccess, setCopySuccess] = useState(false);
  const fullUrl = `https://anchor.band/${handle}`;

  // Add confetti effect
  useEffect(() => {
    // Simple confetti effect using emojis
    const confettiCount = 50;
    const confetti: HTMLDivElement[] = [];

    for (let i = 0; i < confettiCount; i++) {
      const emoji = ["🎉", "⚓", "🎵", "🎸", "🎤", "🎧"][Math.floor(Math.random() * 6)];
      const el = document.createElement("div");
      el.textContent = emoji;
      el.style.position = "fixed";
      el.style.left = `${Math.random() * 100}%`;
      el.style.top = "-20px";
      el.style.fontSize = "24px";
      el.style.zIndex = "9999";
      el.style.pointerEvents = "none";
      el.style.transition = `all ${2 + Math.random() * 2}s ease-out`;
      document.body.appendChild(el);
      confetti.push(el);

      // Animate
      setTimeout(() => {
        el.style.top = "100vh";
        el.style.transform = `rotate(${Math.random() * 720 - 360}deg)`;
        el.style.opacity = "0";
      }, 50);
    }

    // Cleanup
    const cleanup = setTimeout(() => {
      confetti.forEach((el) => el.remove());
    }, 4000);

    return () => {
      clearTimeout(cleanup);
      confetti.forEach((el) => el.remove());
    };
  }, []);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleShare = async (platform: "twitter" | "facebook" | "linkedin") => {
    const text = encodeURIComponent("Check out my music profile on Anchor.band!");
    const url = encodeURIComponent(fullUrl);

    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    };

    window.open(urls[platform], "_blank", "width=600,height=400");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Celebration content */}
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Your anchor is now live!
          </h2>
          <p className="text-gray-600 mb-6">
            Your music profile is now public and ready to share with the world.
          </p>

          {/* View page button */}
          <a
            href={`/${handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 w-full justify-center px-4 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View Your Page
          </a>

          {/* Share buttons */}
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-3">Share your profile:</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => handleShare("twitter")}
                className="inline-flex items-center px-3 py-2 bg-sky-500 text-white rounded-md text-sm font-medium hover:bg-sky-600"
                title="Share on Twitter"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </button>
              <button
                onClick={() => handleShare("facebook")}
                className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                title="Share on Facebook"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </button>
              <button
                onClick={() => handleShare("linkedin")}
                className="inline-flex items-center px-3 py-2 bg-blue-700 text-white rounded-md text-sm font-medium hover:bg-blue-800"
                title="Share on LinkedIn"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Copy link */}
          <button
            onClick={handleCopyUrl}
            className="inline-flex items-center gap-2 w-full justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 mb-6"
          >
            {copySuccess ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Link Copied!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Link
              </>
            )}
          </button>

          {/* Tips */}
          <div className="bg-blue-50 rounded-lg p-4 text-left">
            <p className="text-sm font-semibold text-blue-900 mb-2">What's next?</p>
            <ul className="text-xs text-blue-800 space-y-1">
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 mt-0.5">📣</span>
                <span>Share your profile on social media</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 mt-0.5">🔄</span>
                <span>Update your music data monthly to keep it fresh</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 mt-0.5">✏️</span>
                <span>Regenerate your bio as your taste evolves</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 mt-0.5">🎨</span>
                <span>Add a musical eras timeline to tell your story</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
