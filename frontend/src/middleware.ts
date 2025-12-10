import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Create the intl middleware
const intlMiddleware = createIntlMiddleware(routing);

// Public routes that don't require authentication
const publicRoutes = ["/login", "/api/auth"];

// Check if the path is a public route
function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files, API routes, and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check if this is a public route
  if (isPublicRoute(pathname)) {
    return intlMiddleware(request);
  }

  // For protected routes, check for session token
  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value;

  // If no session token, redirect to login
  if (!sessionToken) {
    const loginUrl = new URL("/login", request.url);
    // Add the original URL as a callback parameter
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // User is authenticated, continue with intl middleware
  return intlMiddleware(request);
}

export const config = {
  // Match all pathnames except for
  // - API routes (except auth which we handle)
  // - Next.js internals
  // - Static files
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};
