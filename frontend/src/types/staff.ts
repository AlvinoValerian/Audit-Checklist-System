export type StaffStatus = "Aktif" | "Dinonaktifkan";

export interface StaffUser {
  id: string;
  fullName: string;
  email: string;
  storeName: string;
  storeLocation: string;
  position: string;
  status: StaffStatus;
  phone?: string;
  joinDate?: string;
}

export interface StaffStats {
  total: number;
  active: number;
  inactive: number;
  activePercentage: number;
}
