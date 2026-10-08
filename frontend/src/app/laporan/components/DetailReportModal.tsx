"use client";

import React from "react";
import {
  X,
  Store,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  Download,
  Percent,
} from "lucide-react";
import { AuditReportItem } from "@/types/report";
import { toast } from "sonner";

interface DetailReportModalProps {
  isOpen: boolean;
  report: AuditReportItem | null;
  onClose: () => void;
}

export default function DetailReportModal({
  isOpen,
  report,
  onClose,
}: DetailReportModalProps) {
  if (!isOpen || !report) return null;

  const handleExportSingle = () => {
    toast.success(`Mengunduh laporan ${report.storeName} (${report.scheduleName})...`);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="bg-white rounded-2xl w-full max-w-[720px] max-h-[90vh] h-[580px] relative z-10 flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${
                report.status === "Masalah"
                  ? "bg-rose-50 border-rose-100 text-rose-500"
                  : "bg-emerald-50 border-emerald-100 text-emerald-600"
              }`}
            >
              {report.status === "Masalah" ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                Detail Laporan Audit
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {report.storeName} • {report.scheduleName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Tutup (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
          {/* Summary Score Card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Toko */}
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                Toko & Lokasi
              </span>
              <p className="text-xs font-bold text-slate-900 mt-0.5">
                {report.storeName}
              </p>
              <p className="text-[10px] text-slate-500">
                {report.storeLocation}
              </p>
            </div>

            {/* Skor Kepatuhan */}
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                Skor Kepatuhan
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`text-base font-extrabold ${
                    report.complianceScore >= 90
                      ? "text-emerald-600"
                      : report.complianceScore >= 75
                      ? "text-amber-600"
                      : "text-rose-600"
                  }`}
                >
                  {report.complianceScore}%
                </span>
                <span className="text-[10px] text-slate-500">
                  ({report.status === "Masalah" ? `${report.issueCount} Temuan` : "Sempurna"})
                </span>
              </div>
            </div>

            {/* Status Validasi */}
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                Status Evaluasi
              </span>
              <div className="mt-1">
                {report.status === "Masalah" ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 border border-rose-200 text-rose-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    Masalah ({report.issueCount})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Sesuai SOP
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Ringkasan Evaluasi */}
          {report.summaryNote && (
            <div className="border border-slate-200 rounded-xl p-3.5 bg-white">
              <h4 className="text-xs font-bold text-slate-900 mb-1">
                Ringkasan Temuan & Catatan Auditor:
              </h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {report.summaryNote}
              </p>
            </div>
          )}

          {/* Meta Info Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs border-t border-slate-100 pt-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block">Auditor Pelaksana</span>
                <span className="font-bold text-slate-800 text-[11px]">{report.auditorName}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block">Waktu Submit</span>
                <span className="font-bold text-slate-800 text-[11px]">{report.submitDate}, {report.submitTime}</span>
              </div>
            </div>
          </div>

          {/* Rincian Item Checklist (if available) */}
          {report.findings && report.findings.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-900">
                Rincian Item Checklist ({report.findings.length} Item Diperiksa):
              </h4>
              <div className="space-y-1.5">
                {report.findings.map((item) => (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-lg border text-xs flex items-start justify-between gap-3 ${
                      item.hasIssue
                        ? "bg-rose-50/40 border-rose-200 text-rose-900"
                        : "bg-slate-50/50 border-slate-200 text-slate-700"
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        {item.hasIssue ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        )}
                        <span className="font-bold text-[11px]">{item.itemTitle}</span>
                        <span className="text-[9px] px-1.5 py-0.2 bg-white rounded border border-slate-200 text-slate-500">
                          {item.category}
                        </span>
                      </div>
                      {item.issueNote && (
                        <p className="text-[10px] text-rose-700 pl-5">
                          {item.issueNote}
                        </p>
                      )}
                    </div>

                    {item.severity && (
                      <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 shrink-0">
                        {item.severity}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-white shrink-0">
          <button
            onClick={handleExportSingle}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Unduh Laporan PDF
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#193f53] hover:bg-[#143343] text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
