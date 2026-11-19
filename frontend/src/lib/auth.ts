export interface AuthUser {
  id: string;
  rawId?: string;
  email: string;
  fullName: string;
  phone?: string;
  companyName?: string;
  role: "Super Admin" | "Divisi Teknis" | "Admin" | "Area Admin" | "Auditor Lapangan" | "Staff" | "Teknis";
  position?: string;
  workspaceId?: string;
  workspaceName?: string;
  storeId?: string;
  storeName?: string;
  storeLocation?: string;
  storeCode?: string;
  storeAddress?: string;
  status?: string;
  profilePicture?: string | null;
  token?: string;
}

export interface ActiveWorkspace {
  id: string;
  name: string;
  companyName?: string;
}

const AUTH_USER_KEY = "audit_pro_auth_user";
const AUTH_TOKEN_KEY = "audit_pro_auth_token";
const AUTH_ACTIVE_WORKSPACE_KEY = "audit_pro_active_workspace";
export const LOGOUT_TRANSITION_EVENT = "auth-logout-transition";

let manualLogoutInProgress = false;
export const LAST_ACTIVITY_KEY = "audit_pro_last_activity";
export const LAST_REFRESH_KEY = "audit_pro_last_refresh";
export const LOGOUT_EVENT_KEY = "audit_pro_logout_event";

export const AuthService = {
  getCurrentUser(): AuthUser | null {
    if (typeof window === "undefined") return null;
    try {
      const data = localStorage.getItem(AUTH_USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setCurrentUser(user: AuthUser): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      this.touchActivity();
      window.dispatchEvent(new Event("auth-changed"));
    }
  },

  setActiveWorkspace(workspace: ActiveWorkspace | null): void {
    if (typeof window !== "undefined") {
      if (workspace) {
        localStorage.setItem(AUTH_ACTIVE_WORKSPACE_KEY, JSON.stringify(workspace));
      } else {
        localStorage.removeItem(AUTH_ACTIVE_WORKSPACE_KEY);
      }
      window.dispatchEvent(new Event("workspace-changed"));
    }
  },

  getActiveWorkspace(): ActiveWorkspace | null {
    if (typeof window === "undefined") return null;
    try {
      const data = localStorage.getItem(AUTH_ACTIVE_WORKSPACE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(AUTH_TOKEN_KEY);
  },

  setToken(token: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      this.touchActivity();
      this.touchRefresh();
    }
  },

  touchActivity(): number {
    const now = Date.now();
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
      } catch {}
    }
    return now;
  },

  getLastActivity(): number {
    if (typeof window === "undefined") return Date.now();
    try {
      const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
      if (!raw) return Date.now();
      const parsed = Number(raw);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : Date.now();
    } catch {
      return Date.now();
    }
  },

  touchRefresh(): number {
    const now = Date.now();
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(LAST_REFRESH_KEY, String(now));
      } catch {}
    }
    return now;
  },

  getLastRefresh(): number {
    if (typeof window === "undefined") return Date.now();
    try {
      const raw = localStorage.getItem(LAST_REFRESH_KEY);
      if (!raw) return 0;
      const parsed = Number(raw);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    } catch {
      return 0;
    }
  },

  logout(options?: { broadcast?: boolean }): void {
    if (typeof window !== "undefined") {
      // HANYA hapus key sesi — JANGAN pernah hapus draf offline staf (staff_saved_audit_*, staff_active_audit, audit_pro_draft_*)
      localStorage.removeItem(AUTH_USER_KEY);
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_ACTIVE_WORKSPACE_KEY);
      localStorage.removeItem("audit_pro_admin_name");
      localStorage.removeItem("audit_pro_avatar");
      localStorage.removeItem(LAST_ACTIVITY_KEY);
      localStorage.removeItem(LAST_REFRESH_KEY);

      // Bersihkan cache template lintas workspace agar tidak bocor antar akun saat ganti login
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith("audit_pro_template_checklist_v1")) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch {}

      if (options?.broadcast !== false) {
        try {
          localStorage.setItem(LOGOUT_EVENT_KEY, String(Date.now()));
        } catch {}
      }
      window.dispatchEvent(new Event("auth-changed"));
    }
  },

  async logoutAsync(options?: { broadcast?: boolean }): Promise<void> {
    if (typeof window !== "undefined") {
      const token = this.getToken();
      try {
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        await Promise.race([
          fetch("/api/auth/logout", {
            method: "POST",
            credentials: "include",
            keepalive: true,
            headers,
          }).catch(() => null),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
        ]);
      } catch {}
    }
    this.logout(options);
  },

  isManualLogoutInProgress(): boolean {
    return manualLogoutInProgress;
  },

  async logoutWithTransition(
    reason: "logout" | "timeout" = "logout",
    durationMs = 3000
  ): Promise<void> {
    if (typeof window === "undefined") return;
    if (manualLogoutInProgress) return;

    manualLogoutInProgress = true;
    window.dispatchEvent(new Event(LOGOUT_TRANSITION_EVENT));

    const startedAt = Date.now();
    await this.logoutAsync({ broadcast: true });

    const remaining = Math.max(0, durationMs - (Date.now() - startedAt));
    if (remaining > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, remaining));
    }

    window.location.replace(`/login?reason=${reason}`);
  },

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  },
};
