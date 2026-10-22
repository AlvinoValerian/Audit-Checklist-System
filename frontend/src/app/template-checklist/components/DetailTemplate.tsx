"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Sparkles,
  FileCheck2,
  CheckCircle2,
  Camera,
  Layers,
  User,
  ChevronDown,
  ChevronUp,
  Pencil,
  Clock,
  ShieldCheck,
  Tag,
  AlertCircle,
} from "lucide-react";
import { TemplateItem, TemplateCategoryGroup, ChecklistTask } from "@/types/template";

interface DetailTemplateProps {
  template: TemplateItem;
  onBack: () => void;
  onEdit?: () => void;
}

export default function DetailTemplate({
  template,
  onBack,
  onEdit,
}: DetailTemplateProps) {
  // Normalize categories and tasks
  const normalizedCategories: TemplateCategoryGroup[] = useMemo(() => {
    if (template.categories && template.categories.length > 0) {
      return template.categories.map((c, i) => ({
        ...c,
        isExpanded: true,
      }));
    }

    if (template.items && template.items.length > 0) {
      const groups: { [key: string]: ChecklistTask[] } = {};
      template.items.forEach((item, idx) => {
        const catName = item.category || template.category || "Butir Pemeriksaan";
        if (!groups[catName]) groups[catName] = [];
        groups[catName].push({
          id: item.id || `task-${idx}`,
          text: item.question,
          requirePhoto: item.requirePhoto ?? (idx % 2 === 0),
        });
      });

      return Object.entries(groups).map(([catName, tasks], i) => ({
        id: `cat-${i + 1}`,
        name: catName,
        isExpanded: true,
        tasks,
      }));
    }

    // Default fallback categories
    return [
      {
        id: "cat-1",
        name: template.category || "Sanitasi & Operasional Utama",
        isExpanded: true,
        tasks: [
          {
            id: "task-1-1",
            text: "Pastikan area kasir, display, dan ruang publik dalam kondisi bersih dan rapi.",
            requirePhoto: true,
          },
          {
            id: "task-1-2",
            text: "Pemeriksaan fungsi perangkat operasional, POS kasir, dan koneksi sistem.",
            requirePhoto: true,
          },
          {
            id: "task-1-3",
            text: "Verifikasi kesesuaian stok produk dan label harga promo yang berlaku.",
            requirePhoto: false,
          },
        ],
      },
    ];
  }, [template]);

  // Track expanded state for categories
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    normalizedCategories.forEach((cat) => {
      initial[cat.id] = true;
    });
    return initial;
  });

  const toggleCategory = (catId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const toggleAll = (expand: boolean) => {
    const updated: Record<string, boolean> = {};
    normalizedCategories.forEach((cat) => {
      updated[cat.id] = expand;
    });
    setExpandedCategories(updated);
  };

  // Calculations
  const totalTasks = useMemo(() => {
    return normalizedCategories.reduce((acc, cat) => acc + cat.tasks.length, 0);
  }, [normalizedCategories]);

  const totalPhotoRequired = useMemo(() => {
    return normalizedCategories.reduce(
      (acc, cat) => acc + cat.tasks.filter((t) => t.requirePhoto).length,
      0
    );
  }, [normalizedCategories]);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onBack();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-detail-title"
        className="w-full max-w-[580px] bg-white h-full flex flex-col shadow-2xl border-l border-slate-100 z-50 animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <header className="px-6 pt-6 pb-4 border-b border-slate-100 bg-white">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 text-sky-600 font-bold text-[11px] tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5 fill-sky-600" />
              <span>DETAIL TEMPLATE CHECKLIST</span>
            </div>
            <button
              type="button"
              onClick={onBack}
              className="w-8 h-8 rounded-full border border-slate-200/80 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Tutup"
              aria-label="Tutup detail template"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-2.5 flex items-start justify-between gap-3">
            <h2
              id="template-detail-title"
              className="text-lg font-bold text-slate-900 tracking-tight leading-snug"
            >
              {template.title}
            </h2>
            <div className="shrink-0 mt-0.5">
              {template.status === "Aktif" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                  Aktif
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-600 border border-rose-200">
                  <AlertCircle className="w-3 h-3" />
                  Nonaktif
                </span>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            {template.description ||
              "Template checklist standar operasional audit toko untuk verifikasi kepatuhan dan mutu."}
          </p>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 bg-slate-50/40">
          {/* 3 Metric Summary Cards */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl border border-slate-200/80 bg-white shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Total Butir
                </span>
                <FileCheck2 className="w-3.5 h-3.5 text-sky-600" />
              </div>
              <p className="text-xl font-extrabold text-slate-900 tracking-tight">
                {totalTasks}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Checklist terdaftar</p>
            </div>

            <div className="p-3 rounded-xl border border-slate-200/80 bg-white shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Wajib Foto
                </span>
                <Camera className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <p className="text-xl font-extrabold text-slate-900 tracking-tight">
                {totalPhotoRequired}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Bukti visual wajib</p>
            </div>

            <div className="p-3 rounded-xl border border-slate-200/80 bg-white shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Kategori
                </span>
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <p className="text-xl font-extrabold text-slate-900 tracking-tight">
                {normalizedCategories.length}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Bagian checklist</p>
            </div>
          </div>

          {/* Metadata Card */}
          <div className="p-4 rounded-xl border border-slate-200/80 bg-white shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                Informasi Pembuat & Sistem
              </span>
              {template.category && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-100">
                  <Tag className="w-3 h-3 text-sky-500" />
                  {template.category}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5">Dibuat Oleh</span>
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-800">
                    {template.createdBy}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 ml-5 block">
                  {template.creatorRole}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5">Terakhir Direvisi</span>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-800">
                    {template.lastRevision}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 ml-5 block">
                  Dibuat: {template.createdAt || "Januari 2024"}
                </span>
              </div>

              {template.archivedDate && (
                <div className="col-span-2 pt-1 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Tanggal Dinonaktifkan</span>
                  <span className="text-xs font-semibold text-rose-600">
                    {template.archivedDate}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Checklist Sections / Categories */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-slate-400" />
                Rincian Butir Checklist ({totalTasks} Butir)
              </span>

              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => toggleAll(true)}
                  className="text-sky-600 hover:text-sky-700 font-semibold cursor-pointer"
                >
                  Buka Semua
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={() => toggleAll(false)}
                  className="text-slate-500 hover:text-slate-700 font-medium cursor-pointer"
                >
                  Tutup Semua
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {normalizedCategories.map((category, catIndex) => {
                const isExpanded = !!expandedCategories[category.id];

                return (
                  <div
                    key={category.id}
                    className="border border-slate-200/90 rounded-xl bg-white shadow-2xs overflow-hidden transition-all"
                  >
                    {/* Category Header */}
                    <button
                      type="button"
                      onClick={() => toggleCategory(category.id)}
                      className="w-full px-4 py-3 bg-slate-50/70 hover:bg-slate-100/70 flex items-center justify-between transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-[#193f53] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                          {catIndex + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {category.name}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium shrink-0">
                          ({category.tasks.length} butir)
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-slate-400">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </button>

                    {/* Category Tasks List */}
                    {isExpanded && (
                      <div className="p-3.5 space-y-2.5 divide-y divide-slate-100">
                        {category.tasks.length === 0 ? (
                          <p className="text-xs text-slate-400 italic py-2 text-center">
                            Tidak ada butir checklist dalam kategori ini.
                          </p>
                        ) : (
                          category.tasks.map((task, taskIndex) => (
                            <div
                              key={task.id || taskIndex}
                              className={`flex items-start justify-between gap-3 ${
                                taskIndex > 0 ? "pt-2.5" : ""
                              }`}
                            >
                              <div className="flex items-start gap-2.5 min-w-0">
                                <span className="text-[11px] font-semibold text-slate-400 mt-0.5 shrink-0 w-4 text-right">
                                  {taskIndex + 1}.
                                </span>
                                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                                  {task.text}
                                </p>
                              </div>

                              <div className="shrink-0 flex items-center gap-1 mt-0.5">
                                {task.requirePhoto ? (
                                  <>
                                    <span
                                      title="Wajib melampirkan foto hasil audit"
                                      className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9.5px] font-semibold bg-amber-50 text-amber-700 border border-amber-200"
                                    >
                                      <Camera className="w-2.5 h-2.5 text-amber-600" />
                                      <span>Wajib Foto</span>
                                    </span>
                                    <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[8.5px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                                      Priority High
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span
                                      title="Tidak memerlukan lampiran foto"
                                      className="inline-flex items-center px-1.5 py-0.2 rounded text-[9.5px] font-medium bg-slate-100 text-slate-500"
                                    >
                                      Opsional Foto
                                    </span>
                                    <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[8.5px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                                      Priority Low
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 bg-white">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Tutup
          </button>

          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="px-4 py-2.5 rounded-xl bg-[#193f53] hover:bg-[#123040] text-xs font-semibold text-white flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Template</span>
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
}
