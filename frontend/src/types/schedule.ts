export type ScheduleStatus = "Terjadwal" | "Selesai" | "Dibatalkan";
export type RecurrenceType = "Setiap Hari" | "Hari Tertentu";

export interface AuditSchedule {
  id: string;
  storeName: string;
  storeLocation: string;
  scheduleName: string;
  templateId?: string;
  auditorName?: string;
  timeRange: string;
  startTime?: string;
  endTime?: string;
  date: string; // YYYY-MM-DD
  recurrence: RecurrenceType;
  selectedDays?: string[];
  status: ScheduleStatus;
  notes?: string;
  createdAt: string;
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
