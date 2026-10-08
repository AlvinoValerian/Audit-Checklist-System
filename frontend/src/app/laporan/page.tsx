"use client";

import React, { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Store,
  FileCheck,
  Eye,
  Download,
  X,
} from "lucide-react";
import { ReportService } from "@/services/report.service";
import { AuditReportItem } from "@/types/report";
import DetailLaporanView from "./components/DetailLaporanView";
import { toast } from "sonner";

export default function LaporanPage() {
  const [reports] = useState<AuditReportItem[]>(ReportService.getAll());

  // Filters State - default initial matching the requirement
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStore, setSelectedStore] = useState<string>("Semua Toko");
  const [selectedSchedule, setSelectedSchedule] = useState<string>("Semua Jadwal");
  const [selectedMonth, setSelectedMonth] = useState<string>("Bulan Ini");
  const [selectedStatus, setSelectedStatus] = useState<string>("Masalah");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Selected Report for Full Detail View
  const [selectedReportToView, setSelectedReportToView] = useState<AuditReportItem | null>(null);

  // Dropdown options
  const storeOptions = useMemo(() => ["Semua Toko", ...ReportService.getStores()], []);
  const scheduleOptions = useMemo(() => ["Semua Jadwal", ...ReportService.getSchedules()], []);
  const monthOptions = useMemo(() => ["Bulan Ini", "Semua Bulan", ...ReportService.getMonths()], []);
  const statusOptions = ["Semua Status", "Masalah", "Sesuai"];

  // Filtered Reports
  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      // 1. Search Query
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const match =
          item.storeName.toLowerCase().includes(q) ||
          item.storeLocation.toLowerCase().includes(q) ||
          item.auditorName.toLowerCase().includes(q) ||
          item.scheduleName.toLowerCase().includes(q);
        if (!match) return false;
      }

      // 2. Store Filter
      if (selectedStore !== "Semua Toko" && item.storeName !== selectedStore) {
        return false;
      }

      // 3. Schedule Filter
      if (selectedSchedule !== "Semua Jadwal" && item.scheduleName !== selectedSchedule) {
        return false;
      }

      // 4. Month Filter
      if (selectedMonth === "Bulan Ini") {
        if (item.month !== "Agustus 2024") return false;
      } else if (selectedMonth !== "Semua Bulan" && item.month !== selectedMonth) {
        return false;
      }

      // 5. Status Filter
      if (selectedStatus === "Masalah" && item.status !== "Masalah") {
        return false;
      }
      if (selectedStatus === "Sesuai" && item.status !== "Sesuai") {
        return false;
      }

      return true;
    });
  }, [reports, searchTerm, selectedStore, selectedSchedule, selectedMonth, selectedStatus]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage) || 1;
  const paginatedReports = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredReports.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredReports, currentPage, itemsPerPage]);

  const totalFilteredCount = filteredReports.length;
  const startItem = totalFilteredCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalFilteredCount);

  // Reset Filters
  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedStore("Semua Toko");
    setSelectedSchedule("Semua Jadwal");
    setSelectedMonth("Semua Bulan");
    setSelectedStatus("Semua Status");
    setCurrentPage(1);
    toast.info("Semua filter telah direset.");
  };

  // Export handler
  const handleExportAll = () => {
    toast.success(`Mengekspor ${filteredReports.length} data laporan audit (Excel / PDF)...`);
  };

  const handleExportSingle = (item: AuditReportItem) => {
    toast.success(`Mengunduh laporan audit ${item.storeName} (${item.submitDate})...`);
  };

  // Active filter pills determination
  const hasActiveFilters =
    selectedStatus !== "Semua Status" ||
    selectedMonth !== "Semua Bulan" ||
    selectedStore !== "Semua Toko" ||
    selectedSchedule !== "Semua Jadwal" ||
    searchTerm !== "";

  return (
    <DashboardLayout>
      {selectedReportToView ? (
        /* Detailed Report View matching the screenshot */
        <DetailLaporanView
          report={selectedReportToView}
          onBack={() => setSelectedReportToView(null)}
        />
      ) : (
        /* Report Table List View */
        <>
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Laporan Audit
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Rekapitulasi dan evaluasi kepatuhan operasional checklist audit toko
              </p>
            </div>
          </div>

          {/* Main Container */}
          <div className="space-y-4">
            {/* Filter Toolbar Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
              {/* Top Controls Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                {/* 1. Pencarian */}
                <div className="lg:col-span-1 sm:col-span-2 lg:col-span-1">
                  <label className="text-[11px] font-bold text-slate-600 block mb-1.5">
                    Pencarian
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Cari toko, auditor, atau checklist..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#193f53]/20 focus:border-[#193f53] transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* 2. Pilih Toko */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1.5">
                    Pilih Toko
                  </label>
                  <div className="relative">
                    <select
                      value={selectedStore}
                      onChange={(e) => {
                        setSelectedStore(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#193f53]/20 focus:border-[#193f53] appearance-none cursor-pointer"
                    >
                      {storeOptions.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* 3. Nama Jadwal */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1.5">
                    Nama Jadwal
                  </label>
                  <div className="relative">
                    <select
                      value={selectedSchedule}
                      onChange={(e) => {
                        setSelectedSchedule(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#193f53]/20 focus:border-[#193f53] appearance-none cursor-pointer"
                    >
                      {scheduleOptions.map((sc) => (
                        <option key={sc} value={sc}>
                          {sc}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* 4. Rentang Bulan */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1.5">
                    Rentang Bulan
                  </label>
                  <div className="relative">
                    <select
                      value={selectedMonth}
                      onChange={(e) => {
                        setSelectedMonth(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#193f53]/20 focus:border-[#193f53] appearance-none cursor-pointer"
                    >
                      {monthOptions.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* 5. Status Audit */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1.5">
                    Status Audit
                  </label>
                  <div className="relative">
                    <select
                      value={selectedStatus}
                      onChange={(e) => {
                        setSelectedStatus(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#193f53]/20 focus:border-[#193f53] appearance-none cursor-pointer"
                    >
                      {statusOptions.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Bottom Filter Aktif & Action Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                {/* Active Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Filter Aktif:</span>
                  {selectedStatus !== "Semua Status" && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 border border-rose-200 text-rose-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      Status: {selectedStatus === "Masalah" ? "Ada Masalah" : "Sesuai"}
                      <button
                        onClick={() => setSelectedStatus("Semua Status")}
                        className="hover:text-rose-800 ml-0.5 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {selectedMonth !== "Semua Bulan" && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 border border-slate-200 text-slate-700">
                      Rentang: {selectedMonth}
                      <button
                        onClick={() => setSelectedMonth("Semua Bulan")}
                        className="hover:text-slate-900 ml-0.5 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {selectedStore !== "Semua Toko" && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 border border-slate-200 text-slate-700">
                      Toko: {selectedStore}
                      <button
                        onClick={() => setSelectedStore("Semua Toko")}
                        className="hover:text-slate-900 ml-0.5 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {selectedSchedule !== "Semua Jadwal" && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 border border-slate-200 text-slate-700">
                      Jadwal: {selectedSchedule}
                      <button
                        onClick={() => setSelectedSchedule("Semua Jadwal")}
                        className="hover:text-slate-900 ml-0.5 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {!hasActiveFilters && (
                    <span className="text-[11px] text-slate-400 italic">Tidak ada filter aktif</span>
                  )}
                </div>

                {/* Right Buttons */}
                <div className="flex items-center gap-3 shrink-0">
                  {hasActiveFilters && (
                    <>
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors cursor-pointer"
                      >
                        Reset Filter
                      </button>

                      <button
                        type="button"
                        onClick={handleExportAll}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#193f53] hover:bg-[#143343] text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Ekspor Laporan
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Table Container */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        TOKO
                      </th>
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        NAMA JADWAL
                      </th>
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        STAFF PELAKSANA
                      </th>
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        WAKTU SUBMIT
                      </th>
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        STATUS
                      </th>
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">
                        ACTION
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedReports.length > 0 ? (
                      paginatedReports.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                          {/* Toko */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3 max-w-[220px]">
                              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                <Store className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 leading-tight">
                                  {row.storeName}
                                </p>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {row.storeLocation}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Nama Jadwal */}
                          <td className="px-5 py-3.5">
                            <div className="inline-flex items-start gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 shadow-2xs max-w-[200px] leading-snug">
                              <FileCheck className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                              <span className="break-words font-normal text-slate-700">{row.scheduleName}</span>
                            </div>
                          </td>

                          {/* Staff Pelaksana */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <p className="text-xs font-bold text-slate-900 leading-tight">
                              {row.auditorName}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {row.auditorRole}
                            </p>
                          </td>

                          {/* Waktu Submit */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <p className="text-xs font-bold text-slate-900 leading-tight">
                              {row.submitDate}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {row.submitTime}
                            </p>
                          </td>

                          {/* Status */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            {row.status === "Masalah" ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 border border-rose-200 text-rose-600 whitespace-nowrap">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                <span>Masalah ({row.issueCount})</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 whitespace-nowrap">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <span>Sesuai</span>
                              </span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="px-5 py-3.5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setSelectedReportToView(row)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                title="Lihat Detail Laporan"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExportSingle(row)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Unduh Laporan"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center">
                          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
                            <Search className="w-5 h-5" />
                          </div>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                            Tidak Ada Laporan Ditemukan
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                            Tidak ada laporan audit yang cocok dengan filter yang dipilih. Coba atur ulang kata kunci atau filter status.
                          </p>
                          <button
                            onClick={handleResetFilters}
                            className="mt-3.5 px-3.5 py-1.5 bg-[#193f53] text-white rounded-lg text-xs font-semibold hover:bg-[#143343] transition-colors cursor-pointer"
                          >
                            Reset Filter
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Section */}
              <div className="p-4 border-t border-slate-100 flex flex-wrap gap-4 items-center justify-between">
                <p className="text-[11px] text-slate-500">
                  Menampilkan{" "}
                  <span className="font-bold text-slate-900">
                    {startItem}-{endItem}
                  </span>{" "}
                  dari{" "}
                  <span className="font-bold text-slate-900">
                    {totalFilteredCount} laporan audit
                  </span>
                </p>

                <div className="flex gap-1 text-[11px]">
                  {/* Prev Button */}
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={`w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 transition-colors ${
                      currentPage === 1
                        ? "text-slate-300 border-slate-100 cursor-not-allowed"
                        : "text-slate-600 hover:bg-slate-50 cursor-pointer"
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Page Numbers */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs transition-colors cursor-pointer ${
                        currentPage === page
                          ? "bg-[#193f53] text-white shadow-2xs"
                          : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  {/* Next Button */}
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className={`px-3 h-7 flex items-center justify-center rounded-md border border-slate-200 font-bold ml-1 transition-colors ${
                      currentPage === totalPages
                        ? "text-slate-300 border-slate-100 cursor-not-allowed"
                        : "text-slate-600 hover:bg-slate-50 cursor-pointer"
                    }`}
                  >
                    Selanjutnya <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
