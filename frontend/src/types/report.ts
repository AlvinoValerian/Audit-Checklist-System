export type ReportStatus = "Masalah" | "Sesuai";

export interface ChecklistFinding {
  id: string;
  itemTitle: string;
  category: string;
  hasIssue: boolean;
  issueNote?: string;
  severity?: "Rendah" | "Sedang" | "Tinggi";
  photoUrl?: string;
}

export interface AuditReportItem {
  id: string;
  storeName: string;
  storeLocation: string; // e.g., "Jakarta Pusat", "Jakarta Selatan"
  scheduleName: string; // e.g., "Checklist Operasional Harian", "Audit Display & Promosi"
  auditorName: string; // e.g., "Budi Santoso", "Andi Wijaya"
  auditorRole: string; // e.g., "Auditor Lapangan"
  submitDate: string; // e.g., "18 Agustus 2024"
  submitTime: string; // e.g., "14:15 WIB"
  month: string; // e.g., "Agustus 2024"
  status: ReportStatus;
  issueCount: number; // e.g., 1, 2, 0
  complianceScore: number; // e.g. 85%, 98%
  summaryNote?: string;
  findings: ChecklistFinding[];
}
