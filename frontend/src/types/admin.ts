export type AdminRole = "Super Admin" | "Divisi Teknis" | "Admin" | "Staff";

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: AdminRole;
  workspaceName: string;
  companyName?: string;
  isSystemTeknis?: boolean;
  isManualSuperAdmin?: boolean;
  status: "Aktif" | "Nonaktif";
  createdAt: string;
}

export interface AdminStatsData {
  totalAdmins: number;
  activeAdmins: number;
  inactiveAdmins: number;
  totalAuditors: number;
  totalWorkspaces?: number;
}
