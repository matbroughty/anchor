"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"

export default function SignInPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await signIn("resend", { email, callbackUrl: "/profile" })
    } catch (error) {
      console.error("Magic link error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Welcome to Anchor
        </h1>
        <p className="text-slate-600">
          Sign in to share your music taste beautifully
        </p>
      </div>

      <div className="space-y-4">
        {/* Google Sign In */}
        <button
          onClick={() => signIn("google", { callbackUrl: "/profile" })}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium text-slate-700"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-slate-500">or</span>
          </div>
        </div>

        {/* Magic Link Email - Disabled temporarily */}
        <div className="relative group">
          <form onSubmit={(e) => e.preventDefault()} className="space-y-3 opacity-50 pointer-events-none">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              disabled
              className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-slate-50 cursor-not-allowed"
            />
            <button
              type="submit"
              disabled
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium cursor-not-allowed"
            >
              Send Magic Link
            </button>
          </form>
          {/* Coming Soon Tooltip */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto cursor-not-allowed">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="bg-slate-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
                Coming Soon
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900"></div>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-400 text-center mt-6">
          You&apos;ll connect Spotify after creating your account.
        </p>
      </div>
    </div>
  )
}
