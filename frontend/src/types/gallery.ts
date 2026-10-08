export type AuditStatus = "Semua Sesuai" | "Issue";

export interface AuditPhoto {
  id: string;
  url: string;
  caption: string;
  category: string;
  checklistQuestion: string;
  hasIssue: boolean;
  /**
   * Deskripsi wajib ada jika hasIssue = true (temuan ketidaksesuaian),
   * atau opsional berupa catatan hasil inspeksi untuk foto yang sesuai SOP.
   */
  description?: string;
  issueDescription?: string;
  issueSeverity?: "Rendah" | "Sedang" | "Tinggi";
  timestamp: string;
  auditorName: string;
  notes?: string;
}

export interface AuditGalleryLog {
  id: string;
  storeId: string;
  storeName: string;
  storeLocation?: string; // e.g. "Jakarta Pusat"
  scheduleTitle: string;
  date: string; // e.g., "18 Agu 2024"
  dateTimeFull?: string; // e.g., "18 Agu 2024, 10:30 WIB"
  dateRaw: string; // ISO date format: "2024-08-18"
  workspace: string;
  auditor: {
    name: string;
    role: string;
  };
  validationStatus?: "Perlu Tindak Lanjut" | "Terverifikasi Sesuai";
  status: AuditStatus;
  issueCount: number;
  photos: AuditPhoto[];
}
