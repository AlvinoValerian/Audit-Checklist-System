import { AdminUser, AdminStatsData } from "@/types/admin";

const STORAGE_KEY = "audit_pro_admins_data";

export const INITIAL_ADMINS: AdminUser[] = [
  {
    id: "adm-1",
    fullName: "Rian Hidayat",
    email: "rian.hidayat@storeaudit.com",
    phone: "0812-8822-1920",
    role: "Admin",
    workspaceName: "Workspace A (Jabodetabek)",
    status: "Aktif",
    createdAt: "12 Okt 2023",
  },
  {
    id: "adm-2",
    fullName: "Budi Pratama",
    email: "budi.pratama@storeaudit.com",
    phone: "0813-7711-4455",
    role: "Staff",
    workspaceName: "Workspace B (Jawa Timur)",
    status: "Aktif",
    createdAt: "15 Nov 2023",
  },
  {
    id: "adm-3",
    fullName: "Siti Rahmawati",
    email: "siti.rahma@storeaudit.com",
    phone: "0856-9933-2211",
    role: "Admin",
    workspaceName: "Workspace C (Jawa Barat)",
    status: "Nonaktif",
    createdAt: "01 Jan 2024",
  },
  {
    id: "adm-4",
    fullName: "Alvino Valerian",
    email: "superadmin@storeaudit.com",
    phone: "0811-2233-4455",
    role: "Super Admin",
    workspaceName: "All Workspaces (Central)",
    status: "Aktif",
    createdAt: "01 Jan 2023",
  },
];

export const AdminService = {
  getAll(): AdminUser[] {
    if (typeof window === "undefined") return INITIAL_ADMINS;
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ADMINS));
      return INITIAL_ADMINS;
    } catch {
      return INITIAL_ADMINS;
    }
  },

  getById(id: string): AdminUser | undefined {
    const list = this.getAll();
    return list.find((a) => a.id === id);
  },

  create(admin: Omit<AdminUser, "id" | "createdAt">): AdminUser {
    const list = this.getAll();
    const newAdmin: AdminUser = {
      ...admin,
      id: `adm-${Date.now()}`,
      createdAt: new Date().toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };
    const updated = [newAdmin, ...list];
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
    return newAdmin;
  },

  update(id: string, data: Partial<AdminUser>): AdminUser | null {
    const list = this.getAll();
    const index = list.findIndex((a) => a.id === id);
    if (index === -1) return null;

    const updatedAdmin = { ...list[index], ...data };
    list[index] = updatedAdmin;
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
    return updatedAdmin;
  },

  delete(id: string): boolean {
    const list = this.getAll();
    const filtered = list.filter((a) => a.id !== id);
    if (filtered.length === list.length) return false;

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
    return true;
  },

  getStats(admins?: AdminUser[]): AdminStatsData {
    const list = admins || this.getAll();
    return {
      totalAdmins: list.length,
      activeAdmins: list.filter((a) => a.status === "Aktif").length,
      inactiveAdmins: list.filter((a) => a.status === "Nonaktif").length,
      totalAuditors: list.filter((a) => a.role === "Staff").length,
    };
  },
};
