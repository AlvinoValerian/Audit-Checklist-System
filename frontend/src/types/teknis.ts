export type TeknisStatus = "Aktif" | "Nonaktif";

export interface TeknisUser {
  id: string;
  rawId?: string;
  fullName: string;
  email: string;
  phone?: string;
  role: "Divisi Teknis";
  specialization: string;
  status: TeknisStatus;
  rawStatus?: string;
  workspaceId?: string | null;
  workspaceName?: string;
  password?: string;
  profilePicture?: string | null;
  createdAt?: string;
  deletedAt?: string;
}

export interface TeknisStats {
  total: number;
  active: number;
  inactive: number;
  activePercentage: number;
}
