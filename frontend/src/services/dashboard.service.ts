import { AuthService } from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";
import { MetricStats } from "@/app/dashboard-monitoring/components/MetricCards";

export interface StoreRankingItem {
  name: string;
  score: number;
  lateCount: number;
  criticalIssueCount: number;
  lowIssueCount: number;
  missedCount: number;
  totalFindings: number;
  totalDeduction: number;
}

export interface AuditStatusSegment {
  name: string;
  value: number;
  color: string;
}

export interface WeeklyTrendItem {
  week: string;
  score: number;
}

export interface FindingPriorityItem {
  name: string;
  count: number;
  color: string;
  percentage: number;
}

export interface TopStoreFindingItem {
  name: string;
  fullName?: string;
  count: number;
}

export interface FindingsAnalysisData {
  priorities: FindingPriorityItem[];
  totalFindings: number;
  topStores: TopStoreFindingItem[];
}

export interface DashboardMonitoringData {
  workspace?: {
    id: string;
    name: string;
    status?: string;
    category?: string;
  } | null;
  metrics: MetricStats;
  auditStatusSegments: AuditStatusSegment[];
  weeklyTrend: WeeklyTrendItem[];
  storeRanking: StoreRankingItem[];
  findingsAnalysis: FindingsAnalysisData;
  stores: string[];
}

export interface DashboardFilterParams {
  workspaceId?: string;
  storeName?: string;
  startDate?: string;
  endDate?: string;
  month?: string;
  status?: string;
}

const getBackendUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") return "";
  return "http://127.0.0.1:5000";
};
const BACKEND_URL = getBackendUrl();

const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = AuthService.getToken();
  const user = AuthService.getCurrentUser();
  const activeWs = AuthService.getActiveWorkspace();

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (activeWs?.id) {
    headers["x-workspace-id"] = activeWs.id;
  } else if (user?.workspaceId) {
    headers["x-workspace-id"] = user.workspaceId;
  }

  return headers;
};

export const DashboardService = {
  async fetchMonitoringStats(params?: DashboardFilterParams): Promise<DashboardMonitoringData> {
    const query = new URLSearchParams();
    if (params?.workspaceId) query.set("workspaceId", params.workspaceId);
    if (params?.storeName && !params.storeName.startsWith("Semua Toko")) {
      query.set("storeName", params.storeName);
    }
    if (params?.startDate) query.set("startDate", params.startDate);
    if (params?.endDate) query.set("endDate", params.endDate);
    if (params?.month && params.month !== "Semua Bulan") query.set("month", params.month);
    if (params?.status && params.status !== "Status Audit" && params.status !== "Semua Status") {
      query.set("status", params.status);
    }

    const endpoint = `${BACKEND_URL}/api/dashboard/monitoring${query.toString() ? `?${query.toString()}` : ""}`;

    const res = await apiFetch(endpoint, {
      method: "GET",
      headers: getAuthHeaders(),
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Gagal memuat data monitoring: ${res.statusText}`);
    }

    const json = await res.json();
    return json.data;
  },
};
