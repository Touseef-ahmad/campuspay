import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const PUBLIC_ROUTES = ["/login", "/onboarding", "/pending-approval"];
const API_PUBLIC_ROUTES = ["/api/auth/login", "/api/auth/register"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r)))
    return NextResponse.next();
  if (API_PUBLIC_ROUTES.some((r) => pathname.startsWith(r)))
    return NextResponse.next();

  // Check for token
  const token =
    req.cookies.get("token")?.value ??
    req.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const payload = verifyToken(token);

    // Non-approved staff → redirect to pending-approval
    if (!payload.isApproved && !payload.isSystemAdmin) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Account pending approval" },
          { status: 403 },
        );
      }
      if (!pathname.startsWith("/pending-approval")) {
        return NextResponse.redirect(new URL("/pending-approval", req.url));
      }
    }

    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const response = NextResponse.redirect(new URL("/login", req.url));
    response.cookies.delete("token");
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
