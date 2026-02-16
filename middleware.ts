import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const RESERVED_PATHS = new Set([
  "", "dashboard", "login", "onboarding", "staff", "booking", "api", "auth",
  "_next", "favicon.ico", "manifest.json", "sitemap.xml", "robots.txt",
]);

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  // If OAuth redirects to /?code=... instead of /auth/callback, forward there
  if (url.pathname === "/" && url.searchParams.has("code")) {
    return NextResponse.redirect(new URL(`/auth/callback${url.search}`, request.url));
  }
  const res = NextResponse.next();
  // Disable caching for booking pages (e.g. /nabisa) — ensure 404 when business deleted
  const segment = url.pathname.split("/").filter(Boolean)[0];
  if (segment && !RESERVED_PATHS.has(segment) && !url.pathname.includes("/api/")) {
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  }
  return res;
}
