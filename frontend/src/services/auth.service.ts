import { AuthUser, AuthService as LocalAuthService } from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";

const getBackendUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") return "";
  return "http://127.0.0.1:5000";
};
const BACKEND_URL = getBackendUrl();

export interface RegisterPayload {
  fullName: string;
  companyEmail: string;
  phoneNumber: string;
  companyName: string;
  password: string;
}

export interface RegisterResponse {
  status: "success" | "error";
  message: string;
  data?: {
    token: string;
    user: AuthUser;
    workspace?: {
      id: string;
      name: string;
    };
  };
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  status: "success" | "error";
  message: string;
  data?: {
    token: string;
    user: AuthUser;
  };
}

export const ApiAuthService = {
  /**
   * Mendaftarkan akun baru ke backend (Otomatis mendapatkan role Super Admin)
   */
  async register(payload: RegisterPayload): Promise<RegisterResponse> {
    let res: Response;
    try {
      res = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: payload.fullName.trim(),
          companyEmail: payload.companyEmail.trim().toLowerCase(),
          phoneNumber: payload.phoneNumber.trim(),
          companyName: payload.companyName.trim(),
          password: payload.password,
        }),
      });
    } catch (networkErr: unknown) {
      console.error("Network error on POST /api/auth/register:", networkErr);
      throw new Error(
        "Tidak dapat terhubung ke server backend. Pastikan server backend sedang aktif."
      );
    }

    const json = await res.json().catch(() => ({}));

    if (!res.ok || json.status !== "success") {
      throw new Error(
        json.message || `Gagal melakukan pendaftaran akun (HTTP ${res.status})`
      );
    }

    // Jika registrasi berhasil, simpan session user dan token secara otomatis
    if (json.data && json.data.user) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("audit_pro_admin_name");
        if (json.data.user.profilePicture) {
          localStorage.setItem("audit_pro_avatar", json.data.user.profilePicture);
        } else {
          localStorage.removeItem("audit_pro_avatar");
        }
      }
      if (json.data.token) {
        LocalAuthService.setToken(json.data.token);
      }
      LocalAuthService.setCurrentUser(json.data.user);
      if (json.data.user.workspaceId) {
        LocalAuthService.setActiveWorkspace({
          id: json.data.user.workspaceId,
          name: json.data.user.workspaceName || "Divisi Teknis - Sandbox Testing",
        });
      }
    }

    return json;
  },

  /**
   * Login ke backend untuk Super Admin atau Admin
   */
  async login(payload: LoginPayload): Promise<LoginResponse> {
    let res: Response;
    try {
      res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: payload.email.trim().toLowerCase(),
          password: payload.password,
        }),
      });
    } catch (networkErr: unknown) {
      console.error("Network error on POST /api/auth/login:", networkErr);
      throw new Error(
        "Tidak dapat terhubung ke server backend. Pastikan server backend sedang aktif."
      );
    }

    const json = await res.json().catch(() => ({}));

    if (!res.ok || json.status !== "success") {
      if (res.status >= 500 && !json.message) {
        throw new Error(
          `Server backend tidak merespons (HTTP ${res.status}). Pastikan server backend aktif lalu coba lagi.`
        );
      }
      throw new Error(
        json.message || `Gagal melakukan login (HTTP ${res.status})`
      );
    }

    if (json.data && json.data.user) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("audit_pro_admin_name");
        if (json.data.user.profilePicture) {
          localStorage.setItem("audit_pro_avatar", json.data.user.profilePicture);
        } else {
          localStorage.removeItem("audit_pro_avatar");
        }
      }
      if (json.data.token) {
        LocalAuthService.setToken(json.data.token);
      }
      LocalAuthService.setCurrentUser(json.data.user);
      if (json.data.user.workspaceId) {
        LocalAuthService.setActiveWorkspace({
          id: json.data.user.workspaceId,
          name: json.data.user.workspaceName || "Divisi Teknis - Sandbox Testing",
        });
      }
    }

    return json;
  },

  /**
   * Update profile (nama dan/atau foto profil) ke backend database
   */
  async updateProfile(data: { name?: string; profilePicture?: string | null }): Promise<void> {
    const user = LocalAuthService.getCurrentUser();
    const token = LocalAuthService.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    let res: Response;
    try {
      res = await apiFetch(`${BACKEND_URL}/api/auth/profile`, {
        method: "PUT",
        headers,
        body: JSON.stringify(data),
      });
    } catch (err) {
      console.warn("Gagal menghubungi server untuk update profil:", err);
      throw new Error("Tidak dapat terhubung ke server backend untuk memperbarui profil.");
    }

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.status !== "success") {
      const msg = json.message || `Gagal menyimpan profil ke database backend (HTTP ${res.status})`;
      console.warn("Gagal menyimpan profil ke database backend:", msg);
      throw new Error(msg);
    }

    if (typeof window !== "undefined") {
      if (json?.data?.fullName || data.name) {
        localStorage.setItem("audit_pro_admin_name", json?.data?.fullName || data.name!);
      }
      if (json?.data?.profilePicture !== undefined) {
        if (json.data.profilePicture) {
          localStorage.setItem("audit_pro_avatar", json.data.profilePicture);
        } else {
          localStorage.removeItem("audit_pro_avatar");
        }
      } else if (data.profilePicture !== undefined) {
        if (data.profilePicture) {
          localStorage.setItem("audit_pro_avatar", data.profilePicture);
        } else {
          localStorage.removeItem("audit_pro_avatar");
        }
      }
    }

    if (user) {
      const updatedUser = {
        ...user,
        ...(json?.data?.fullName
          ? { fullName: json.data.fullName }
          : data.name
            ? { fullName: data.name }
            : {}),
        ...(json?.data?.profilePicture !== undefined
          ? { profilePicture: json.data.profilePicture }
          : data.profilePicture !== undefined
            ? { profilePicture: data.profilePicture }
            : {}),
      };
      LocalAuthService.setCurrentUser(updatedUser);
    }
  },
};
