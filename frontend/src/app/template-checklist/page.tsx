"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Header from "@/components/layout/Header";
import {
  SlidersHorizontal,
  Check,
  Ban,
  Search,
  Filter,
  Plus,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  FileCheck2,
} from "lucide-react";
import { TemplateService } from "@/services/template.service";
import { TemplateItem, TemplateStats, TemplateStatus } from "@/types/template";
import { toast } from "sonner";
import ActionButtons from "@/components/ui/ActionButtons";
import CreateTemplate from "./components/CreateTemplate";
import EditTemplate from "./components/EditTemplate";
import SoftDeleteModal from "./components/SoftDeleteModal";
import RestoreTemplateModal from "./components/RestoreTemplateModal";

export default function TemplateChecklistPage() {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [stats, setStats] = useState<TemplateStats>({
    total: 0,
    active: 0,
    inactive: 0,
    activePercentage: 0,
  });

  // Modal & View States
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<TemplateItem | null>(null);

  // Soft Delete / Nonaktifkan Modal State
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [templateToDeactivate, setTemplateToDeactivate] = useState<TemplateItem | null>(null);

  // Restore / Aktifkan Kembali Modal State
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [templateToRestore, setTemplateToRestore] = useState<TemplateItem | null>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"Semua" | TemplateStatus>("Semua");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const refreshData = useCallback(() => {
    const list = TemplateService.getAll();
    setTemplates(list);
    setStats(TemplateService.getStats(list));
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Handlers
  const handleConfirmDeactivate = () => {
    if (templateToDeactivate) {
      TemplateService.update(templateToDeactivate.id, { status: "Dinonaktifkan" });
      toast.success(`Template "${templateToDeactivate.title}" berhasil dinonaktifkan.`);
      setIsDeactivateModalOpen(false);
      setTemplateToDeactivate(null);
      refreshData();
    }
  };

  const handleConfirmRestore = () => {
    if (templateToRestore) {
      TemplateService.update(templateToRestore.id, { status: "Aktif" });
      toast.success(`Template "${templateToRestore.title}" berhasil diaktifkan kembali.`);
      setIsRestoreModalOpen(false);
      setTemplateToRestore(null);
      refreshData();
    }
  };

  // Filter Logic
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesSearch =
        template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.createdBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.creatorRole.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (template.category && template.category.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus =
        filterStatus === "Semua" ? true : template.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [templates, searchTerm, filterStatus]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredTemplates.length / itemsPerPage) || 1;
  const paginatedTemplates = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTemplates.slice(start, start + itemsPerPage);
  }, [filteredTemplates, currentPage]);

  const startIndex = filteredTemplates.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIndex = Math.min(currentPage * itemsPerPage, filteredTemplates.length);

  if (isCreating) {
    return (
      <DashboardLayout>
        <CreateTemplate
          onBack={() => {
            setIsCreating(false);
            refreshData();
          }}
          onSuccess={() => {
            setIsCreating(false);
            refreshData();
          }}
        />
      </DashboardLayout>
    );
  }

  if (isEditing && templateToEdit) {
    return (
      <DashboardLayout>
        <EditTemplate
          template={templateToEdit}
          onBack={() => {
            setIsEditing(false);
            setTemplateToEdit(null);
            refreshData();
          }}
          onSuccess={() => {
            setIsEditing(false);
            setTemplateToEdit(null);
            refreshData();
          }}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Header
        title="Template Checklist"
        subtitle="Kelola template dan daftar butir checklist operasional audit toko"
      />

      {/* 3 Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 mb-5 sm:mb-6">
        {/* Card 1: TOTAL TEMPLATE */}
        <div className="bg-[#fefdfa] rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h3 className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
              TOTAL TEMPLATE
            </h3>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {stats.total}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Semua template terdaftar
            </p>
          </div>
        </div>

        {/* Card 2: TEMPLATE AKTIF */}
        <div className="bg-[#fefdfa] rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h3 className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
              TEMPLATE AKTIF
            </h3>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {stats.active}
            </div>
            <div className="mt-0.5 inline-flex items-center gap-1 text-emerald-600 text-[11px] font-semibold">
              <TrendingUp className="w-3 h-3" />
              <span>{stats.activePercentage}% dari total</span>
            </div>
          </div>
        </div>

        {/* Card 3: NONAKTIF */}
        <div className="bg-[#fefdfa] rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h3 className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
              NONAKTIF
            </h3>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center shrink-0">
              <Ban className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {stats.inactive}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Diarsipkan / draft
            </p>
          </div>
        </div>
      </div>

      {/* Main Table Container Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Toolbar: Search, Filter & Add Template */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari nama template atau pembuat..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53] transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Filter Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center gap-1.5 px-3 py-2 bg-white border ${
                  filterStatus !== "Semua"
                    ? "border-sky-500 text-sky-600"
                    : "border-slate-200 text-slate-700"
                } rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>{filterStatus === "Semua" ? "Filter" : filterStatus}</span>
              </button>

              {isFilterOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsFilterOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-20 overflow-hidden">
                    {(["Semua", "Aktif", "Dinonaktifkan"] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => {
                          setFilterStatus(status);
                          setIsFilterOpen(false);
                          setCurrentPage(1);
                        }}
                        className={`w-full text-left px-3.5 py-1.5 text-xs font-medium transition-colors ${
                          filterStatus === status
                            ? "bg-sky-50 text-sky-600 font-semibold"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Tambah Template Button (Opens Create View) */}
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#193f53] hover:bg-[#123040] text-white rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Template</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 sm:px-6">NAMA TEMPLATE</th>
                <th className="py-3 px-4 sm:px-6">DIBUAT OLEH</th>
                <th className="py-3 px-4 text-center">STATUS</th>
                <th className="py-3 px-4 sm:px-6 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {paginatedTemplates.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <FileCheck2 className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                    <p className="font-semibold text-slate-600 text-sm">Tidak ada template ditemukan</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Coba sesuaikan kata kunci pencarian atau filter status.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedTemplates.map((template) => {
                  const isDeactivated = template.status === "Dinonaktifkan";

                  return (
                    <tr
                      key={template.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* NAMA TEMPLATE */}
                      <td className={`py-3.5 px-4 sm:px-6 ${isDeactivated ? "opacity-60" : ""}`}>
                        <div className="font-semibold text-slate-900 group-hover:text-[#193f53] transition-colors">
                          {template.title}
                        </div>
                        <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                          {template.archivedDate
                            ? `Diarsipkan: ${template.archivedDate}`
                            : `Revisi: ${template.lastRevision}`}
                        </div>
                      </td>

                      {/* DIBUAT OLEH */}
                      <td className={`py-3.5 px-4 sm:px-6 ${isDeactivated ? "opacity-60" : ""}`}>
                        <div className="font-semibold text-slate-800">
                          {template.createdBy}
                        </div>
                        <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                          {template.creatorRole}
                        </div>
                      </td>

                      {/* STATUS */}
                      <td
                        className="py-3.5 px-4 text-center whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {template.status === "Aktif" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                            Dinonaktifkan
                          </span>
                        )}
                      </td>

                      {/* ACTION */}
                      <td
                        className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ActionButtons
                          onEdit={() => {
                            setTemplateToEdit(template);
                            setIsEditing(true);
                          }}
                          onDelete={
                            isDeactivated
                              ? undefined
                              : () => {
                                  setTemplateToDeactivate(template);
                                  setIsDeactivateModalOpen(true);
                                }
                          }
                          onRestore={
                            isDeactivated
                              ? () => {
                                  setTemplateToRestore(template);
                                  setIsRestoreModalOpen(true);
                                }
                              : undefined
                          }
                          editTitle="Edit Template"
                          deleteTitle="Nonaktifkan Template"
                          restoreTitle="Aktifkan Kembali Template"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer & Pagination */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Menampilkan <span className="font-semibold text-slate-700">{startIndex}-{endIndex}</span> dari{" "}
            <span className="font-semibold text-slate-700">{filteredTemplates.length}</span> template
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5 self-center sm:self-auto">
              {/* Previous Button */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {/* Number Buttons */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    currentPage === pageNum
                      ? "bg-[#193f53] text-white shadow-2xs"
                      : "text-slate-600 hover:bg-slate-100 border border-transparent"
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              {/* Next Button */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer text-xs font-medium"
              >
                <span>Selanjutnya</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Soft Delete Modal */}
      <SoftDeleteModal
        isOpen={isDeactivateModalOpen}
        template={templateToDeactivate}
        onClose={() => {
          setIsDeactivateModalOpen(false);
          setTemplateToDeactivate(null);
        }}
        onConfirm={handleConfirmDeactivate}
      />

      {/* Restore Template Modal */}
      <RestoreTemplateModal
        isOpen={isRestoreModalOpen}
        template={templateToRestore}
        onClose={() => {
          setIsRestoreModalOpen(false);
          setTemplateToRestore(null);
        }}
        onConfirm={handleConfirmRestore}
      />
    </DashboardLayout>
  );
}
