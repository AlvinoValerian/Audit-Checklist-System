export interface Workspace {
  id: string;
  name: string;
  companyName?: string;
  companyDescription?: string;
  headquartersAddress?: string;
  storeCount: number;
  description: string;
  status: "Aktif" | "Nonaktif";
  createdAt: string;
  updatedAt?: string;
  managerEmail?: string;
  adminEmail?: string;
  picName?: string;
  picPhone?: string;
  stores?: string[];
}

export interface WorkspaceFilter {
  searchQuery: string;
  status: "Semua" | "Aktif" | "Nonaktif";
}

export interface WorkspaceStatsData {
  totalWorkspaces: number;
  activeWorkspaces: number;
  inactiveWorkspaces: number;
  totalStores: number;
}
