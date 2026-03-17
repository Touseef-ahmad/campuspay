import { NextRequest, NextResponse } from "next/server";

const publicPaths = ["/login", "/onboarding", "/pending-approval"];

function decodeJWTPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    // Check expiry
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public pages and API routes
  if (
    publicPaths.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const payload = decodeJWTPayload(token);
  if (!payload) {
    // Invalid or expired token — clear it and redirect to login
    const response = NextResponse.redirect(new URL("/login", req.url));
    response.cookies.delete("token");
    return response;
  }

  // Unapproved users can only see the pending-approval page
  if (!payload.isApproved && pathname !== "/pending-approval") {
    return NextResponse.redirect(new URL("/pending-approval", req.url));
  }

  // Approved users shouldn't be on the pending-approval page
  if (payload.isApproved && pathname === "/pending-approval") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
