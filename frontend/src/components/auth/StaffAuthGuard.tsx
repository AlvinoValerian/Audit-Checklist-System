"use client";

import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Clock, Loader2, LogOut, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { AuthService, LAST_ACTIVITY_KEY, LOGOUT_EVENT_KEY } from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";
import { canRoleAccessPath, getHomeRouteForRole, normalizeRole } from "@/lib/routes-acl";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 menit
const IDLE_WARNING_MS = 28 * 60 * 1000; // Peringatan mulai menit ke-28 (hitung mundur 2 menit)
const SILENT_REFRESH_MS = 20 * 60 * 1000; // Silent refresh tiap 20 menit saat aktif & online
const ACTIVITY_THROTTLE_MS = 10 * 1000; // Maksimal 1x tulis localStorage tiap 10 detik

const SSR_SENTINEL = "__SSR__";

const subscribeAuth = (onStoreChange: () => void) => {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("auth-changed", onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener("auth-changed", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
};

const getAuthSnapshot = (): string => {
  const user = AuthService.getCurrentUser();
  if (!user) return "";
  return `${user.id || ""}|${user.role || ""}|${user.storeId || ""}`;
};

const getAuthServerSnapshot = (): string => SSR_SENTINEL;

function formatCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function StaffAuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/jadwal-staff";
  const authSnapshot = useSyncExternalStore(
    subscribeAuth,
    getAuthSnapshot,
    getAuthServerSnapshot
  );

  const isHydrated = authSnapshot !== SSR_SENTINEL;
  const currentUser = isHydrated ? AuthService.getCurrentUser() : null;
  const normalizedRole = normalizeRole(currentUser?.role);

  const isAuthorized =
    isHydrated &&
    Boolean(currentUser) &&
    normalizedRole === "staff" &&
    canRoleAccessPath(currentUser?.role, pathname);

  const [isRecoveringSession, setIsRecoveringSession] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(120);
  const [isExtending, setIsExtending] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const showWarningRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const isLoggingOutRef = useRef(false);
  const lastActivityWriteRef = useRef(0);
  const meAttemptedRef = useRef(false);
  const deniedToastShownRef = useRef<string | null>(null);

  useEffect(() => {
    showWarningRef.current = showWarningModal;
  }, [showWarningModal]);

  // Tampilkan notifikasi jika diarahkan karena mencoba mengakses portal lain (?denied=1)
  useEffect(() => {
    if (!isHydrated || !isAuthorized || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("denied") === "1" && deniedToastShownRef.current !== pathname) {
      deniedToastShownRef.current = pathname;
      toast.error("Anda tidak memiliki hak akses untuk membuka halaman tersebut.");
      params.delete("denied");
      const nextSearch = params.toString();
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash || ""}`;
      window.history.replaceState(null, "", nextUrl);
    }
  }, [isHydrated, isAuthorized, pathname]);

  // Verifikasi user Staff / recovery sesi via HttpOnly cookie jika localStorage kosong
  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") return;

    if (!currentUser) {
      if (meAttemptedRef.current) return;
      meAttemptedRef.current = true;
      setIsRecoveringSession(true);

      let cancelled = false;
      (async () => {
        try {
          const res = await fetch("/api/auth/me", {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          });
          if (cancelled) return;
          if (res.ok) {
            const json = await res.json().catch(() => null);
            const meUser = json?.data?.user;
            const meToken = json?.data?.token;
            if (meUser) {
              if (meToken) AuthService.setToken(meToken);
              AuthService.setCurrentUser(meUser);
              if (meUser.workspaceId && !AuthService.getActiveWorkspace()) {
                AuthService.setActiveWorkspace({
                  id: meUser.workspaceId,
                  name: meUser.workspaceName || "Workspace",
                });
              }
              setIsRecoveringSession(false);
              return;
            }
          }
        } catch {
          // Abaikan network error pada pemulihan sesi; alihkan ke login di bawah
        }

        if (cancelled) return;
        await AuthService.logoutAsync({ broadcast: false });
        const fullTarget = `${window.location.pathname}${window.location.search}`;
        window.location.replace(
          `/login?reason=expired&redirect=${encodeURIComponent(fullTarget)}`
        );
      })();

      return () => {
        cancelled = true;
      };
    }

    if (normalizedRole !== "staff") {
      const homeRoute = getHomeRouteForRole(currentUser.role);
      window.location.replace(`${homeRoute}?denied=1`);
    }
  }, [isHydrated, currentUser, normalizedRole]);

  const performTokenRefresh = useCallback(async (isManual: boolean) => {
    if (isRefreshingRef.current || isLoggingOutRef.current) return;
    isRefreshingRef.current = true;
    if (isManual) setIsExtending(true);

    try {
      // Toleran terhadap mode offline lapangan: network error tidak me-logout Staff
      const res = await apiFetch("/api/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        const json = await res.json().catch(() => null);
        const newToken = json?.data?.token;
        if (newToken) {
          AuthService.setToken(newToken);
        } else {
          AuthService.touchActivity();
          AuthService.touchRefresh();
        }
        if (isManual) {
          setShowWarningModal(false);
          setSecondsRemaining(120);
          toast.success("Sesi berhasil diperpanjang.");
        }
      } else if (isManual && res.status !== 401 && res.status !== 403) {
        toast.error("Gagal memperpanjang sesi. Periksa koneksi internet Anda.");
      }
    } catch {
      // Jangan logout Staff ketika sedang offline di lapangan; cukup pertahankan aktivitas lokal bila manual
      if (isManual) {
        AuthService.touchActivity();
        setShowWarningModal(false);
        toast.warning("Koneksi offline. Draf lokal Anda tetap tersimpan aman.");
      }
    } finally {
      isRefreshingRef.current = false;
      if (isManual) setIsExtending(false);
    }
  }, []);

  const performAutoTimeoutLogout = useCallback(async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    setIsLoggingOut(true);
    // AuthService.logoutAsync menjaga staff_saved_audit_* dan staff_active_audit tetap utuh
    await AuthService.logoutAsync({ broadcast: true });
    if (typeof window !== "undefined") {
      window.location.replace("/login?reason=timeout");
    }
  }, []);

  const handleManualLogout = useCallback(async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    setIsLoggingOut(true);
    await AuthService.logoutAsync({ broadcast: true });
    if (typeof window !== "undefined") {
      window.location.replace("/login?reason=logout");
    }
  }, []);

  // Pelacakan aktivitas Staff & idle timeout 30 menit + warning 28 menit
  useEffect(() => {
    if (!isAuthorized || typeof window === "undefined") return;

    if (!localStorage.getItem(LAST_ACTIVITY_KEY)) {
      AuthService.touchActivity();
    }
    if (!localStorage.getItem("audit_pro_last_refresh")) {
      AuthService.touchRefresh();
    }

    const recordActivity = () => {
      if (showWarningRef.current || isLoggingOutRef.current) return;
      const now = Date.now();
      if (now - lastActivityWriteRef.current >= ACTIVITY_THROTTLE_MS) {
        lastActivityWriteRef.current = now;
        AuthService.touchActivity();
      }
    };

    const checkIdleAndRefresh = () => {
      if (isLoggingOutRef.current) return;
      const now = Date.now();
      const lastActivity = AuthService.getLastActivity();
      const elapsed = now - lastActivity;

      if (elapsed >= IDLE_TIMEOUT_MS) {
        void performAutoTimeoutLogout();
        return;
      }

      if (elapsed >= IDLE_WARNING_MS) {
        const remainingSec = Math.max(0, Math.ceil((IDLE_TIMEOUT_MS - elapsed) / 1000));
        setShowWarningModal(true);
        setSecondsRemaining(remainingSec);
        return;
      }

      if (showWarningRef.current) {
        setShowWarningModal(false);
      }

      const lastRefresh = AuthService.getLastRefresh();
      if (
        now - lastRefresh >= SILENT_REFRESH_MS &&
        !isRefreshingRef.current &&
        (typeof navigator === "undefined" || navigator.onLine !== false)
      ) {
        void performTokenRefresh(false);
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LOGOUT_EVENT_KEY) {
        AuthService.logout({ broadcast: false });
        window.location.replace("/login?reason=logout");
        return;
      }
      if (e.key === LAST_ACTIVITY_KEY && e.newValue) {
        const parsed = Number(e.newValue);
        if (Number.isFinite(parsed) && Date.now() - parsed < IDLE_WARNING_MS && showWarningRef.current) {
          setShowWarningModal(false);
        }
      }
    };

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        checkIdleAndRefresh();
      }
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
    ];

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, recordActivity, { passive: true });
    });
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    checkIdleAndRefresh();
    const timer = window.setInterval(checkIdleAndRefresh, 1000);

    return () => {
      window.clearInterval(timer);
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, recordActivity);
      });
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    };
  }, [isAuthorized, performAutoTimeoutLogout, performTokenRefresh]);

  if (!isHydrated || isRecoveringSession || !isAuthorized) {
    return (
      <div className="min-h-screen w-full bg-[#eef2f5] flex items-center justify-center p-5 font-sans">
        <div className="w-full max-w-[360px] bg-white border border-slate-200 rounded-2xl p-6 flex flex-col items-center gap-3 shadow-xs text-center">
          <Loader2 className="w-7 h-7 animate-spin text-[#193f53]" />
          <p className="text-xs font-semibold text-slate-700">
            {isHydrated && currentUser && normalizedRole !== "staff"
              ? "Mengalihkan ke portal yang sesuai..."
              : "Memverifikasi sesi Auditor Lapangan..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}

      {showWarningModal && (
        <div
          className="fixed inset-0 z-[9999] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="staff-idle-warning-title"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3
                  id="staff-idle-warning-title"
                  className="text-sm font-bold text-slate-900 leading-snug"
                >
                  Sesi Akan Segera Berakhir
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Tidak ada aktivitas dalam 28 menit terakhir. Draf audit lokal Anda tetap aman, silakan perpanjang sesi untuk melanjutkan.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-amber-50/80 border border-amber-200 px-3.5 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Waktu Tersisa</span>
              </div>
              <span className="text-base font-mono font-extrabold text-amber-700">
                {formatCountdown(secondsRemaining)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleManualLogout}
                disabled={isExtending || isLoggingOut}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
              <button
                type="button"
                onClick={() => void performTokenRefresh(true)}
                disabled={isExtending || isLoggingOut}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#193f53] hover:bg-[#133140] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
              >
                {isExtending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Perpanjang Sesi</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
