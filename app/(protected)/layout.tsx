import { auth } from "@/auth";
import { redirect } from "next/navigation";

/**
 * Layout for protected routes
 * Verifies authentication and redirects to signin if not authenticated
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

  return <>{children}</>;
}
