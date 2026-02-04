import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isProtected =
    req.nextUrl.pathname.startsWith("/profile") ||
    req.nextUrl.pathname.startsWith("/settings")
  const isAuthPage =
    req.nextUrl.pathname.startsWith("/signin") ||
    req.nextUrl.pathname.startsWith("/verify-email")

  // Redirect to signin if accessing protected route while logged out
  if (isProtected && !isLoggedIn) {
    return NextResponse.redirect(new URL("/signin", req.url))
  }

  // Redirect to profile if accessing auth pages while logged in
  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/profile", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
