export type ReportStatus = "Masalah" | "Sesuai" | "Tidak Mengerjakan";

export interface ChecklistFinding {
  id: string;
  itemTitle: string;
  category: string;
  hasIssue: boolean;
  priority?: "High" | "Low";
  isPhotoRequired?: boolean;
  issueNote?: string;
  severity?: "Rendah" | "Sedang" | "Tinggi";
  photoUrl?: string;
  photoCaption?: string;
  photoTimestamp?: string;
  recommendation?: string;
  auditorNote?: string;
}

export interface AuditReportItem {
  id: string;
  storeName: string;
  storeLocation: string; // e.g., "Jakarta Pusat", "Malang Singosari"
  scheduleName: string; // e.g., "Checklist Operasional Harian", "Audit Opening"
  auditorName: string; // e.g., "Budi Santoso", "Dina Lestari"
  auditorRole: string; // e.g., "Auditor Lapangan"
  submitDate: string; // e.g., "4 November 2026"
  submitTime: string; // e.g., "14:15 WIB"
  month: string; // e.g., "November 2026"
  status: ReportStatus;
  issueCount: number; // e.g., 0, 1, 2
  complianceScore: number; // e.g., 88, 100
  summaryNote?: string;
  findings: ChecklistFinding[];
  signatureUrl?: string;
  auditorPhoto?: string;
  workspaceName?: string;
}
