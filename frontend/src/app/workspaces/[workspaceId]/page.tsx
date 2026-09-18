"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Header from "@/components/layout/Header";
import { WorkspaceService } from "@/services/workspace.service";
import { AdminService } from "@/services/admin.service";
import { Workspace } from "@/types/workspace";
import { AdminUser } from "@/types/admin";
import {
  ArrowLeft,
  Store,
  Users,
  CheckCircle2,
  Calendar,
  Pencil,
  MapPin,
  Building,
} from "lucide-react";
import { toast } from "sonner";

export default function WorkspaceDetailPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [assignedAdmins, setAssignedAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const ws = WorkspaceService.getById(resolvedParams.workspaceId);
    if (!ws) {
      toast.error("Workspace tidak ditemukan");
      router.push("/workspaces");
      return;
    }
    setWorkspace(ws);

    // Get admins matching this workspace
    const allAdmins = AdminService.getAll();
    const related = allAdmins.filter(
      (a) =>
        a.workspaceName.toLowerCase().includes(ws.name.toLowerCase()) ||
        a.role === "Super Admin"
    );
    setAssignedAdmins(related);
    setIsLoading(false);
  }, [resolvedParams.workspaceId, router]);

  if (isLoading || !workspace) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20 text-slate-400">
          Memuat data workspace...
        </div>
      </DashboardLayout>
    );
  }

  // Generate sample store outlets based on storeCount
  const stores = Array.from({ length: Math.min(workspace.storeCount, 8) }).map(
    (_, idx) => ({
      code: `STR-${workspace.name.replace(/\s+/g, "").toUpperCase()}-${101 + idx}`,
      name: `Gerai Retail #${idx + 1} - ${workspace.name}`,
      location: `Jl. Protokol No. ${15 + idx * 4}, Wilayah Operasional`,
      status: idx % 4 === 3 ? "Perlu Audit" : "Sesuai Standar",
      lastAudit: `${10 + (idx % 15)} Sep 2024`,
    })
  );

  return (
    <DashboardLayout>
      {/* Back button */}
      <div className="mb-6">
        <Link
          href="/workspaces"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-[#193f53] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Workspace</span>
        </Link>
      </div>

      {/* Header Info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 mb-8 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                {workspace.name}
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  workspace.status === "Aktif"
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200/50"
                    : "bg-rose-50 text-rose-600 border border-rose-200/50"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    workspace.status === "Aktif"
                      ? "bg-emerald-500"
                      : "bg-rose-500"
                  }`}
                />
                {workspace.status}
              </span>
            </div>
            <p className="text-slate-600 text-sm mt-2 max-w-2xl">
              {workspace.description}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Calendar className="w-4 h-4" />
            <span>Terdaftar sejak {workspace.createdAt}</span>
          </div>
        </div>

        {/* Quick KPI stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">
                Total Gerai Terhubung
              </div>
              <div className="text-xl font-bold text-slate-900">
                {workspace.storeCount} Toko
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">
                Kepatuhan Audit
              </div>
              <div className="text-xl font-bold text-emerald-600">96.4%</div>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">
                Tim Pengawas / Admin
              </div>
              <div className="text-xl font-bold text-slate-900">
                {assignedAdmins.length} Petugas
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Store Outlets & Assigned Admins */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Outlets List (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Daftar Toko & Gerai Terhubung
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Unit operasional ritel di bawah naungan {workspace.name}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-5">KODE & TOKO</th>
                  <th className="py-3 px-4">LOKASI</th>
                  <th className="py-3 px-4 text-center">STATUS AUDIT</th>
                  <th className="py-3 px-4">AUDIT TERAKHIR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stores.map((store, i) => (
                  <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-slate-800">
                        {store.name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {store.code}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs">
                      {store.location}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          store.status === "Sesuai Standar"
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-amber-50 text-amber-600"
                        }`}
                      >
                        {store.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-xs whitespace-nowrap">
                      {store.lastAudit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Assigned Admin List (1 col) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-base">
              Tim Pengawas
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Admin & Auditor yang bertanggung jawab
            </p>
          </div>

          <div className="p-5 divide-y divide-slate-100 flex-1">
            {assignedAdmins.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Belum ada admin ditugaskan secara khusus pada workspace ini.
              </div>
            ) : (
              assignedAdmins.map((adm) => (
                <div key={adm.id} className="py-3.5 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800 text-sm">
                        {adm.fullName}
                      </div>
                      <div className="text-xs text-slate-400">{adm.email}</div>
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {adm.role}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 font-mono">
                    {adm.phone}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
            <Link
              href="/admins/create"
              className="text-xs font-semibold text-[#193f53] hover:underline"
            >
              + Tugaskan Admin Baru
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
