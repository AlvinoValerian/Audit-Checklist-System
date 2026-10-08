import { StaffUser, StaffStats, StaffStatus } from "@/types/staff";

const STAFF_STORAGE_KEY = "audit_pro_staff_data";

export const defaultStaffs: StaffUser[] = [
  {
    id: "1",
    fullName: "Andi Wijaya",
    email: "andi.wijaya@auditpro.com",
    storeName: "Cabang Sudirman",
    storeLocation: "Jakarta Pusat",
    position: "Auditor Lapangan",
    status: "Aktif",
    phone: "0812-3456-7890",
    joinDate: "10 Jan 2023",
  },
  {
    id: "2",
    fullName: "Budi Santoso",
    email: "budi.santoso@auditpro.com",
    storeName: "Cabang Thamrin",
    storeLocation: "Jakarta Pusat",
    position: "Auditor Lapangan",
    status: "Aktif",
    phone: "0812-3456-7891",
    joinDate: "15 Feb 2023",
  },
  {
    id: "3",
    fullName: "Chandra Pratama",
    email: "chandra.pratama@auditpro.com",
    storeName: "Cabang Kemang",
    storeLocation: "Jakarta Selatan",
    position: "Auditor Lapangan",
    status: "Aktif",
    phone: "0812-3456-7892",
    joinDate: "01 Mar 2023",
  },
  {
    id: "4",
    fullName: "Siti Rahmawati",
    email: "siti.rahma@auditpro.com",
    storeName: "Cabang Senayan",
    storeLocation: "Jakarta Pusat",
    position: "Auditor Lapangan",
    status: "Aktif",
    phone: "0812-3456-7893",
    joinDate: "12 Apr 2023",
  },
  {
    id: "5",
    fullName: "Dewi Lestari",
    email: "dewi.lestari@auditpro.com",
    storeName: "Cabang PIK",
    storeLocation: "Jakarta Utara",
    position: "Auditor Lapangan",
    status: "Nonaktif",
    phone: "0812-3456-7894",
    joinDate: "20 Mei 2023",
  },
  {
    id: "6",
    fullName: "Eko Prasetyo",
    email: "eko.prasetyo@auditpro.com",
    storeName: "Cabang Kelapa Gading",
    storeLocation: "Jakarta Utara",
    position: "Auditor Lapangan",
    status: "Aktif",
    phone: "0812-3456-7895",
    joinDate: "05 Jun 2023",
  },
  {
    id: "7",
    fullName: "Fajar Nugraha",
    email: "fajar.nugraha@auditpro.com",
    storeName: "Cabang Puri Indah",
    storeLocation: "Jakarta Barat",
    position: "Auditor Lapangan",
    status: "Aktif",
    phone: "0812-3456-7896",
    joinDate: "18 Jul 2023",
  },
  {
    id: "8",
    fullName: "Gita Permata",
    email: "gita.permata@auditpro.com",
    storeName: "Cabang Pondok Indah",
    storeLocation: "Jakarta Selatan",
    position: "Auditor Lapangan",
    status: "Aktif",
    phone: "0812-3456-7897",
    joinDate: "22 Agu 2023",
  },
  {
    id: "9",
    fullName: "Hendra Setiawan",
    email: "hendra.setiawan@auditpro.com",
    storeName: "Cabang Bintaro",
    storeLocation: "Tangerang Selatan",
    position: "Auditor Lapangan",
    status: "Aktif",
    phone: "0812-3456-7898",
    joinDate: "14 Sep 2023",
  },
  {
    id: "10",
    fullName: "Indah Kusuma",
    email: "indah.kusuma@auditpro.com",
    storeName: "Cabang Serpong",
    storeLocation: "Tangerang Selatan",
    position: "Auditor Lapangan",
    status: "Aktif",
    phone: "0812-3456-7899",
    joinDate: "01 Okt 2023",
  },
  {
    id: "11",
    fullName: "Joko Widodo",
    email: "joko.widodo@auditpro.com",
    storeName: "Cabang Grand Indonesia",
    storeLocation: "Jakarta Pusat",
    position: "Auditor Lapangan",
    status: "Aktif",
    phone: "0812-3456-7800",
    joinDate: "15 Nov 2023",
  },
  {
    id: "12",
    fullName: "Kurniawan Dwi",
    email: "kurniawan.dwi@auditpro.com",
    storeName: "Cabang Central Park",
    storeLocation: "Jakarta Barat",
    position: "Auditor Lapangan",
    status: "Nonaktif",
    phone: "0812-3456-7801",
    joinDate: "05 Des 2023",
  },
];

export const StaffService = {
  getAll(): StaffUser[] {
    if (typeof window === "undefined") return defaultStaffs;
    try {
      const data = localStorage.getItem(STAFF_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((s: StaffUser) => ({
            ...s,
            status: (s.status === "Dinonaktifkan" as any) ? "Nonaktif" : s.status,
          }));
        }
      }
      localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(defaultStaffs));
      return defaultStaffs;
    } catch {
      return defaultStaffs;
    }
  },

  getById(id: string): StaffUser | undefined {
    return this.getAll().find((s) => s.id === id);
  },

  create(staff: Omit<StaffUser, "id">): StaffUser {
    const list = this.getAll();
    const newStaff: StaffUser = {
      ...staff,
      id: `staff-${Date.now()}`,
    };
    const updated = [newStaff, ...list];
    if (typeof window !== "undefined") {
      localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(updated));
    }
    return newStaff;
  },

  update(id: string, data: Partial<StaffUser>): StaffUser | null {
    const list = this.getAll();
    const index = list.findIndex((s) => s.id === id);
    if (index === -1) return null;

    const updatedStaff = { ...list[index], ...data };
    list[index] = updatedStaff;
    if (typeof window !== "undefined") {
      localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(list));
    }
    return updatedStaff;
  },

  toggleStatus(id: string): StaffUser | null {
    const staff = this.getById(id);
    if (!staff) return null;
    const newStatus: StaffStatus =
      staff.status === "Aktif" ? "Nonaktif" : "Aktif";
    return this.update(id, { status: newStatus });
  },

  delete(id: string): boolean {
    const list = this.getAll();
    const filtered = list.filter((s) => s.id !== id);
    if (filtered.length === list.length) return false;
    if (typeof window !== "undefined") {
      localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(filtered));
    }
    return true;
  },

  getStats(staffs?: StaffUser[]): StaffStats {
    const list = staffs || this.getAll();
    const total = list.length;
    const active = list.filter((s) => s.status === "Aktif").length;
    const inactive = list.filter((s) => s.status === "Nonaktif").length;
    const activePercentage = total > 0 ? Math.round((active / total) * 100) : 0;

    return {
      total,
      active,
      inactive,
      activePercentage,
    };
  },
};
