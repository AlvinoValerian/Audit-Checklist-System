export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: "Super Admin" | "Area Admin" | "Auditor Lapangan";
}

const AUTH_USER_KEY = "audit_pro_auth_user";

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
    }
  },

  logout(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem(AUTH_USER_KEY);
    }
  },

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  },
};
