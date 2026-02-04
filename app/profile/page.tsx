import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function ProfilePage() {
  const session = await auth()

  if (!session) {
    redirect("/signin")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            Welcome, {session.user.name}!
          </h1>
          <div className="space-y-2 text-slate-600">
            <p>
              <strong>Email:</strong> {session.user.email}
            </p>
            <p>
              <strong>User ID:</strong> {session.user.id}
            </p>
            {session.user.handle && (
              <p>
                <strong>Handle:</strong> @{session.user.handle}
              </p>
            )}
            {session.user.spotifyConnected && (
              <p className="text-green-600">Spotify Connected</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
