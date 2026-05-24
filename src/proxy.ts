import { auth } from "./auth-middleware";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = req.nextUrl.pathname === "/login";

  if (isAuthPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  // Inject user role header for downstream server components
  const role = (req.auth?.user as any)?.role || "VIEWER";
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-role", role);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
});

export const config = {
  matcher: [
    "/((?!login|forgot-password|verify-otp|reset-password|api|_next|favicon.ico|next.svg|vercel.svg).*)",
  ],
};
