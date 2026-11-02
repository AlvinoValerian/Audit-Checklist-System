export type HolidayStatus = "Terjadwal" | "Selesai" | "Dibatalkan";

export interface Holiday {
  id: string;
  holidayId?: string;
  storeId?: string;
  workspaceId?: string;
  storeName: string;
  storeLocation: string;
  startDate: string; // ISO string
  endDate: string; // ISO string
  durationDays: number;
  reason: string;
  createdBy: string;
  creatorRole: string;
  status: HolidayStatus;
  liburType?: "full" | "partial";
  schedules?: string[];
  deletedAt?: string;  
}
