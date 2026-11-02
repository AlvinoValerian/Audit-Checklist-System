export interface AuthUser {
  id: string;
  rawId?: string;
  email: string;
  fullName: string;
  phone?: string;
  companyName?: string;
  role: "Super Admin" | "Divisi Teknis" | "Admin" | "Area Admin" | "Auditor Lapangan" | "Staff";
  workspaceId?: string;
  workspaceName?: string;
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
    }
  },

  logout(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem(AUTH_USER_KEY);
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_ACTIVE_WORKSPACE_KEY);
      localStorage.removeItem("audit_pro_admin_name");
      localStorage.removeItem("audit_pro_avatar");
    }
  },

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  },
};
