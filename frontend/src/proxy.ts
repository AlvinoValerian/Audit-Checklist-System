import crypto from "crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  canRoleAccessPath,
  getHomeRouteForRole,
  isKnownProtectedRoute,
  isPublicRoute,
  normalizeRole,
} from "@/lib/routes-acl";

const AUTH_COOKIE_NAME = "audit_pro_token";
const REASON_SKIP_AUTO_REDIRECT = new Set(["timeout", "expired", "inactive", "logout"]);

interface VerifiedJwtPayload {
  id: string;
  rawId?: string;
  role: string;
  email?: string;
  exp: number;
}

function verifyJwtCookie(token: string): VerifiedJwtPayload | null {
  const secret = process.env.JWT_SECRET;
  if (!secret || !token) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  if (!headerB64 || !payloadB64 || !signatureB64) {
    return null;
  }

  try {
    const headerJson = JSON.parse(
      Buffer.from(headerB64, "base64url").toString("utf8")
    ) as { alg?: string; typ?: string };

    if (!headerJson || headerJson.alg !== "HS256") {
      return null;
    }

    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest();
    const actualSig = Buffer.from(signatureB64, "base64url");

    if (
      expectedSig.length !== actualSig.length ||
      !crypto.timingSafeEqual(expectedSig, actualSig)
    ) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8")
    ) as Partial<VerifiedJwtPayload>;

    const nowSec = Math.floor(Date.now() / 1000);
    if (
      !payload ||
      !payload.id ||
      typeof payload.exp !== "number" ||
      payload.exp <= nowSec ||
      !normalizeRole(payload.role)
    ) {
      return null;
    }

    return payload as VerifiedJwtPayload;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const rawToken = request.cookies.get(AUTH_COOKIE_NAME)?.value || "";
  const verifiedPayload = rawToken ? verifyJwtCookie(rawToken) : null;

  // Landing page tetap terbuka untuk publik
  if (pathname === "/") {
    return NextResponse.next();
  }

  // Halaman auth publik (/login, /register, /forgot-password)
  if (isPublicRoute(pathname)) {
    const reason = searchParams.get("reason") || "";
    if (REASON_SKIP_AUTO_REDIRECT.has(reason)) {
      const res = NextResponse.next();
      if (rawToken) {
        res.cookies.delete(AUTH_COOKIE_NAME);
      }
      return res;
    }

    if (verifiedPayload && (pathname === "/login" || pathname === "/register")) {
      const homeUrl = new URL(getHomeRouteForRole(verifiedPayload.role), request.url);
      return NextResponse.redirect(homeUrl);
    }

    return NextResponse.next();
  }

  const isProtected = isKnownProtectedRoute(pathname);

  // Semua rute terproteksi (atau selain publik) mewajibkan sesi cookie valid
  if (!verifiedPayload) {
    if (!isProtected && rawToken === "") {
      // Tetap paksa autentikasi untuk direct URL selain rute publik agar tidak bocor halaman privat baru
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", `${pathname}${search || ""}`);
      return NextResponse.redirect(loginUrl);
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", `${pathname}${search || ""}`);
    if (rawToken) {
      loginUrl.searchParams.set("reason", "expired");
    }
    const res = NextResponse.redirect(loginUrl);
    if (rawToken) {
      res.cookies.delete(AUTH_COOKIE_NAME);
    }
    return res;
  }

  // Sesi valid -> Verifikasi Role Matrix untuk rute terproteksi
  if (isProtected && !canRoleAccessPath(verifiedPayload.role, pathname)) {
    const homePath = getHomeRouteForRole(verifiedPayload.role);
    const homeUrl = new URL(homePath, request.url);
    homeUrl.searchParams.set("denied", "1");
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
