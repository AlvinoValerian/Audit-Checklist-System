"use client";

import { toast } from "sonner";
import { AuthService } from "@/lib/auth";
import { isPublicRoute } from "@/lib/routes-acl";

let isHandlingAuthFailure = false;

export type AuthFailureReason = "expired" | "inactive";

function shouldSkipUnauthorizedHandling(url?: string): boolean {
  if (!url) return false;
  return (
    url.includes("/api/auth/login") ||
    url.includes("/api/auth/register") ||
    url.includes("/api/auth/logout")
  );
}

export function triggerForcedLogout(
  reason: AuthFailureReason,
  customMessage?: string
): void {
  if (typeof window === "undefined") return;
  if (isHandlingAuthFailure) return;
  isHandlingAuthFailure = true;

  const message =
    customMessage ||
    (reason === "inactive"
      ? "Akun Anda dinonaktifkan oleh administrator."
      : "Sesi login Anda telah berakhir. Silakan masuk kembali.");

  try {
    toast.error(message);
  } catch {}

  const token = AuthService.getToken();
  try {
    fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
      keepalive: true,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).catch(() => {});
  } catch {}

  AuthService.logout({ broadcast: true });

  const currentPath = window.location.pathname || "/";
  if (!isPublicRoute(currentPath)) {
    const loginUrl = `/login?reason=${reason}&redirect=${encodeURIComponent(
      `${window.location.pathname}${window.location.search}`
    )}`;
    setTimeout(() => {
      window.location.replace(loginUrl);
    }, 150);
  } else {
    isHandlingAuthFailure = false;
  }
}

/**
 * Memeriksa HTTP 401 dan HTTP 403 (khusus ACCOUNT_INACTIVE).
 * Mengembalikan `true` jika terjadi pemutusan sesi paksa.
 */
export async function handleUnauthorizedResponse(
  res: Response | null | undefined,
  url?: string
): Promise<boolean> {
  if (!res || typeof window === "undefined") return false;
  if (shouldSkipUnauthorizedHandling(url)) return false;

  if (res.status === 401) {
    const body = await res.clone().json().catch(() => null);
    triggerForcedLogout(
      "expired",
      body?.message || "Sesi login Anda telah berakhir atau dicabut. Silakan masuk kembali."
    );
    return true;
  }

  if (res.status === 403) {
    const body = await res.clone().json().catch(() => null);
    if (body?.code === "ACCOUNT_INACTIVE") {
      triggerForcedLogout(
        "inactive",
        body?.message || "Akun Anda berstatus Nonaktif atau telah dinonaktifkan."
      );
      return true;
    }
  }

  return false;
}

/**
 * Wrapper fetch standar:
 * - Selalu menyertakan credentials: "include" agar HttpOnly cookie dikirim pada rewrite /api/*
 * - Otomatis menyisipkan Bearer token jika tersedia
 * - Tidak pernah mengirim header x-user-* atau x-super-admin-id spoofing
 * - Menangani 401 & 403 ACCOUNT_INACTIVE secara terpusat
 */
export async function apiFetch(
  input: string,
  init: RequestInit = {}
): Promise<Response> {
  const mergedHeaders = new Headers(init.headers || {});

  // Pastikan header identitas spoofing tidak pernah dikirim dari client
  mergedHeaders.delete("x-user-id");
  mergedHeaders.delete("x-user-role");
  mergedHeaders.delete("x-user-email");
  mergedHeaders.delete("x-super-admin-id");

  if (!mergedHeaders.has("Authorization")) {
    const token = AuthService.getToken();
    if (token) {
      mergedHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  const res = await fetch(input, {
    ...init,
    credentials: init.credentials ?? "include",
    headers: mergedHeaders,
  });

  await handleUnauthorizedResponse(res, input);
  return res;
}
