export type StoreStatus = "Aktif" | "Nonaktif" | "Maintenance";

export type StoreTimezone = "WIB (UTC+7)" | "WITA (UTC+8)" | "WIT (UTC+9)";

export interface StoreItem {
  id: string;
  name: string;
  city?: string;
  address: string;
  timezone: StoreTimezone;
  timezoneLabel?: string;
  geofenceRadius?: number; // e.g. 100 (meters)
  latitude?: number;
  longitude?: number;
  operationalHours?: string;
  description?: string;
  findingsCount: number;
  status: StoreStatus;
  phone?: string;
  managerName?: string;
  workspace?: string;
  createdAt?: string;
}

export interface StoreStats {
  total: number;
  active: number;
  inactive: number;
  activePercentage: number;
}
