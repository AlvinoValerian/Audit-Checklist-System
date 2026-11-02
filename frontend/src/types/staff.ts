export type StaffStatus = "Aktif" | "Nonaktif";

export interface StaffUser {
  id: string;
  fullName: string;
  email: string;
  storeName: string;
  storeLocation: string;
  position: string;
  status: StaffStatus;
  phone?: string;
  password?: string;
  joinDate?: string;
  storeId?: string;
  workspaceId?: string;
  rawId?: string;
  photo?: string | null;
  adminId?: string;
  adminName?: string | null;
  deletedAt?: string;
}

export interface StaffStats {
  total: number;
  active: number;
  inactive: number;
  activePercentage: number;
}
