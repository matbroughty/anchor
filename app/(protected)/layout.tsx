import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/app/components/SignOutButton";

/**
 * Layout for protected routes
 * Verifies authentication and provides sign out access
 */
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/signin");
  }

  return (
    <>
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <a href="/dashboard" className="text-lg font-semibold text-gray-900">
              Anchor
            </a>
            <SignOutButton />
          </div>
        </div>
      </header>
      {children}
    </>
  );
}
