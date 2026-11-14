export type ScheduleStatus = "Terjadwal" | "Sedang Berjalan" | "Selesai" | "Dibatalkan";
export type RecurrenceType = "Setiap Hari" | "Hari Tertentu";

export interface AuditSchedule {
  id: string;
  workspaceId?: string;
  storeId?: string;
  storeName: string;
  storeLocation: string;
  selectedStores?: string[];
  scheduleName: string;
  templateId?: string;
  templateName?: string;
  auditorName?: string;
  timeRange: string;
  startTime?: string;
  endTime?: string;
  duration?: string;
  isCompletedByStaff?: boolean;
  isCompletedToday?: boolean;
  date: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD opsional
  recurrence: RecurrenceType;
  selectedDays?: string[];
  status: ScheduleStatus;
  isHolidayToday?: boolean;
  holidayReason?: string;
  notes?: string;
  createdAt: string;
  deletedAt?: string | null; // YYYY-MM-DD saat di-soft delete
}

export interface ScheduleStats {
  total: number;
  active: number;
  inactive: number;
  activePercentage: number;
  completed: number;
  scheduled: number;
  cancelled: number;
}
