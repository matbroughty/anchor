import Link from "next/link"

export default function VerifyEmailPage() {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
          <svg
            className="w-8 h-8 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-3">
          Check your email
        </h1>

        <p className="text-slate-600 mb-8">
          We&apos;ve sent you a magic link to sign in.
          <br />
          Click the link in your email to continue.
        </p>

        <Link
          href="/signin"
          className="inline-block text-blue-600 hover:text-blue-700 font-medium"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
