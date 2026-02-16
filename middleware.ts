import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  // If OAuth redirects to /?code=... instead of /auth/callback, forward there
  if (url.pathname === "/" && url.searchParams.has("code")) {
    return NextResponse.redirect(new URL(`/auth/callback${url.search}`, request.url));
  }
  return NextResponse.next();
}
