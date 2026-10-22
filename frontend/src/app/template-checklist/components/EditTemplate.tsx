"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ClipboardList,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Camera,
  ChevronsUpDown,
  BookmarkCheck,
} from "lucide-react";
import { TemplateService } from "@/services/template.service";
import { TemplateItem, TemplateCategoryGroup, ChecklistTask } from "@/types/template";
import { toast } from "sonner";

interface EditTemplateProps {
  template: TemplateItem;
  onBack?: () => void;
  onSuccess?: () => void;
}

export default function EditTemplate({
  template,
  onBack,
  onSuccess,
}: EditTemplateProps) {
  const router = useRouter();

  // Scroll to absolute top on mount
  useEffect(() => {
    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      const mainEl = document.querySelector("main");
      if (mainEl) {
        mainEl.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }
    };

    scrollToTop();
    const timer = setTimeout(scrollToTop, 20);
    return () => clearTimeout(timer);
  }, []);

  // Template Title
  const [templateName, setTemplateName] = useState(template.title || "");

  // Initialize Categories & Tasks from template
  const initialCategories: TemplateCategoryGroup[] = useMemo(() => {
    if (template.categories && template.categories.length > 0) {
      return template.categories.map((c) => ({
        ...c,
        isExpanded: true,
      }));
    }

    if (template.items && template.items.length > 0) {
      const groups: { [key: string]: ChecklistTask[] } = {};
      template.items.forEach((item, idx) => {
        const catName = item.category || "Sanitasi & Operasional";
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

    // Default seeded categories matching mockup if template has no items
    return [
      {
        id: "cat-1",
        name: "Sanitasi & Area Kasir / POS",
        isExpanded: true,
        tasks: [
          {
            id: "task-1-1",
            text: "Pastikan meja kasir, mesin EDC, dan scanner barcode bersih dan steril",
            requirePhoto: true,
          },
          {
            id: "task-1-2",
            text: "Nyalakan terminal POS, periksa koneksi internet printer struk, dan siapkan kas modal Rp 500.000",
            requirePhoto: true,
          },
          {
            id: "task-1-3",
            text: "Periksa kelengkapan paper cup (Hot/Cold) ukuran 12oz, 16oz, dan sedotan ramah lingkungan",
            requirePhoto: false,
          },
          {
            id: "task-1-4",
            text: "Pastikan tempat sampah area kasir terpasang plastik trash bag baru",
            requirePhoto: false,
          },
        ],
      },
      {
        id: "cat-2",
        name: "Kalibrasi Mesin Espresso & Grinder",
        isExpanded: true,
        tasks: [
          {
            id: "task-2-1",
            text: "Purge steam wand dan periksa tekanan boiler mesin espresso (rentang 1.1 - 1.2 bar)",
            requirePhoto: true,
          },
          {
            id: "task-2-2",
            text: "Lakukan kalibrasi dosis grinder (18.0g ± 0.2g) dan catat yield espresso (36g dalam 26-30 detik)",
            requirePhoto: true,
          },
          {
            id: "task-2-3",
            text: "Cek suhu air hot water dispenser stabil pada 92°C - 94°C",
            requirePhoto: false,
          },
        ],
      },
      {
        id: "cat-3",
        name: "Ketersediaan Bahan Baku, Chiller & Es Batu",
        isExpanded: true,
        tasks: [
          {
            id: "task-3-1",
            text: "Cek stok biji kopi espresso (house blend) minimal 3 pack tersisa di station barista",
            requirePhoto: true,
          },
          {
            id: "task-3-2",
            text: "Periksa temperatur chiller susu berada pada rentang 2°C - 4°C",
            requirePhoto: true,
          },
          {
            id: "task-3-3",
            text: "Pastikan bin es batu terisi penuh dan higienis, sendok es tidak terendam di dalam es",
            requirePhoto: false,
          },
        ],
      },
    ];
  }, [template]);

  const [categories, setCategories] = useState<TemplateCategoryGroup[]>(initialCategories);

  // Total Counters
  const totalCategories = categories.length;
  const totalTasks = categories.reduce((acc, cat) => acc + cat.tasks.length, 0);

  // Toggle All Expand/Collapse
  const areAllExpanded = categories.every((cat) => cat.isExpanded);
  const handleToggleExpandAll = () => {
    const nextState = !areAllExpanded;
    setCategories((prev) =>
      prev.map((cat) => ({ ...cat, isExpanded: nextState }))
    );
  };

  // Toggle Single Category Expand
  const handleToggleCategory = (catId: string) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === catId ? { ...cat, isExpanded: !cat.isExpanded } : cat
      )
    );
  };

  // Category Actions
  const handleUpdateCategoryName = (catId: string, newName: string) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === catId ? { ...c, name: newName } : c))
    );
  };

  const handleDeleteCategory = (catId: string) => {
    if (categories.length <= 1) {
      toast.error("Template minimal harus memiliki 1 kategori");
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== catId));
    toast.info("Kategori dihapus");
  };

  const handleAddCategory = () => {
    const newCatId = `cat-${Date.now()}`;
    const newCategory: TemplateCategoryGroup = {
      id: newCatId,
      name: "",
      isExpanded: true,
      tasks: [
        {
          id: `task-${newCatId}-1`,
          text: "",
          requirePhoto: false,
        },
      ],
    };
    setCategories((prev) => [...prev, newCategory]);
    toast.success("Kategori baru ditambahkan. Silakan isi nama kategori dan butir tugas.");
  };

  // Task Actions
  const handleAddTask = (catId: string) => {
    const newTask: ChecklistTask = {
      id: `task-${Date.now()}`,
      text: "",
      requirePhoto: false,
    };
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id === catId) {
          return {
            ...cat,
            isExpanded: true,
            tasks: [...cat.tasks, newTask],
          };
        }
        return cat;
      })
    );
  };

  const handleUpdateTaskText = (
    catId: string,
    taskId: string,
    newText: string
  ) => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id === catId) {
          return {
            ...cat,
            tasks: cat.tasks.map((t) =>
              t.id === taskId ? { ...t, text: newText } : t
            ),
          };
        }
        return cat;
      })
    );
  };

  const handleToggleTaskPhoto = (catId: string, taskId: string) => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id === catId) {
          return {
            ...cat,
            tasks: cat.tasks.map((t) =>
              t.id === taskId ? { ...t, requirePhoto: !t.requirePhoto } : t
            ),
          };
        }
        return cat;
      })
    );
  };

  const handleDeleteTask = (catId: string, taskId: string) => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id === catId) {
          if (cat.tasks.length <= 1) {
            toast.error("Setiap kategori minimal memiliki 1 butir tugas");
            return cat;
          }
          return {
            ...cat,
            tasks: cat.tasks.filter((t) => t.id !== taskId),
          };
        }
        return cat;
      })
    );
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.push("/template-checklist");
    }
  };

  // Save Changes Handler with Strict Validation
  const handleSaveTemplate = () => {
    // 1. Validate template name
    if (!templateName.trim()) {
      toast.error("Nama template wajib diisi dan tidak boleh kosong");
      return;
    }

    // 2. Validate categories count
    if (categories.length === 0) {
      toast.error("Tambahkan minimal 1 kategori checklist");
      return;
    }

    // 3. Validate all category names are not empty
    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i];
      if (!cat.name.trim()) {
        toast.error(`Nama Kategori ke-${i + 1} masih kosong. Harap isi nama kategori terlebih dahulu.`);
        return;
      }
    }

    // 4. Validate every category has tasks and each task is not empty
    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i];
      if (cat.tasks.length === 0) {
        toast.error(`Kategori "${cat.name}" harus memiliki minimal 1 butir tugas`);
        return;
      }

      for (let j = 0; j < cat.tasks.length; j++) {
        const task = cat.tasks[j];
        if (!task.text.trim()) {
          toast.error(`Butir tugas ${i + 1}.${j + 1} pada kategori "${cat.name}" masih kosong. Harap isi instruksi tugas.`);
          // Ensure category is expanded so user sees the empty task
          setCategories((prev) =>
            prev.map((c) => (c.id === cat.id ? { ...c, isExpanded: true } : c))
          );
          return;
        }
      }
    }

    const flatItems = categories.flatMap((cat) =>
      cat.tasks.map((t) => ({
        id: t.id,
        question: t.text.trim(),
        category: cat.name.trim(),
        required: true,
        requirePhoto: t.requirePhoto,
      }))
    );

    const todayStr = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    TemplateService.update(template.id, {
      title: templateName.trim(),
      category: categories[0]?.name.trim() || template.category || "Operasional Harian",
      description: `Template audit dengan ${categories.length} kategori dan ${flatItems.length} tugas periksa.`,
      categories,
      items: flatItems,
      itemsCount: flatItems.length,
      lastRevision: todayStr,
    });

    toast.success(`Perubahan pada template "${templateName}" berhasil disimpan!`);
    if (onSuccess) {
      onSuccess();
    } else {
      router.push("/template-checklist");
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-24">
      {/* Top Header Bar: Breadcrumb & Back Button */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 tracking-wider uppercase">
          <button
            type="button"
            onClick={handleBack}
            className="hover:text-[#193f53] transition-colors cursor-pointer"
          >
            TEMPLATE CHECKLIST
          </button>
          <span>›</span>
          <span className="text-slate-600">EDIT TEMPLATE CHECKLIST</span>
        </div>

        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali</span>
        </button>
      </div>

      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Edit Template Checklist
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Perbarui informasi SOP dan sesuaikan butir-butir tugas periksa audit operasional toko.
        </p>
      </div>

      {/* Card: Informasi Umum SOP */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs mb-6">
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <ClipboardList className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 leading-tight">
              Informasi Umum SOP
            </h2>
            <p className="text-[11px] text-slate-400">
              Identitas dan nama panduan operasional standar.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Nama Template <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Contoh: Opening Store & Persiapan Barista"
            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53] transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Section: Daftar Kategori & Butir Tugas Periksa */}
      <div className="mb-6">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Daftar Kategori & Butir Tugas Periksa
              </h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100">
                {totalCategories} Kategori • {totalTasks} Tugas
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Tarik dan susun urutan kategori serta tugas checklist sesuai urutan eksekusi opening gerai.
            </p>
          </div>

          {/* Tutup Semua / Buka Semua Button */}
          <button
            type="button"
            onClick={handleToggleExpandAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer self-start sm:self-auto shrink-0"
          >
            <ChevronsUpDown className="w-3.5 h-3.5 text-slate-500" />
            <span>{areAllExpanded ? "Tutup Semua" : "Buka Semua"}</span>
          </button>
        </div>

        {/* Categories Accordion List */}
        <div className="space-y-4">
          {categories.map((category, catIdx) => {
            return (
              <div
                key={category.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all"
              >
                {/* Category Header Bar */}
                <div className="p-3.5 sm:p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {/* Drag Grip Handle */}
                    <div className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing p-0.5 shrink-0">
                      <GripVertical className="w-4 h-4" />
                    </div>

                    {/* Expand / Collapse Chevron */}
                    <button
                      type="button"
                      onClick={() => handleToggleCategory(category.id)}
                      className="text-slate-500 hover:text-slate-700 p-0.5 rounded transition-colors cursor-pointer shrink-0"
                      title={category.isExpanded ? "Tutup Kategori" : "Buka Kategori"}
                    >
                      {category.isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    {/* Category Number & Direct Editable Title Input */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <span className="text-xs sm:text-sm font-bold text-slate-800 shrink-0">
                        {catIdx + 1}.
                      </span>
                      <input
                        type="text"
                        value={category.name}
                        onChange={(e) => handleUpdateCategoryName(category.id, e.target.value)}
                        placeholder="Ketik nama kategori..."
                        className="w-full max-w-md px-2.5 py-1 text-xs sm:text-sm font-bold text-slate-900 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400 placeholder:font-normal"
                      />
                    </div>
                  </div>

                  {/* Category Right Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Total Tugas Badge */}
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-semibold shrink-0">
                      {category.tasks.length} Tugas
                    </span>

                    {/* + Tambah Task Button */}
                    <button
                      type="button"
                      onClick={() => handleAddTask(category.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-600 border border-sky-100 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Tambah Task</span>
                    </button>

                    {/* Delete Category Button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(category.id)}
                      className="p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                      title="Hapus Kategori"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Tasks Content List (When Expanded) */}
                {category.isExpanded && (
                  <div className="p-3.5 sm:p-5 space-y-2.5">
                    {category.tasks.map((task, taskIdx) => (
                      <div
                        key={task.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 sm:px-3 sm:py-2.5 bg-slate-50/70 border border-slate-200/70 rounded-xl hover:border-slate-300 transition-all group"
                      >
                        {/* Left: Grip, Task Badge & Editable Text */}
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          {/* Drag Grip */}
                          <div className="text-slate-300 group-hover:text-slate-400 cursor-grab active:cursor-grabbing shrink-0">
                            <GripVertical className="w-3.5 h-3.5" />
                          </div>

                          {/* Task Index Badge: e.g. 1.1, 1.2 */}
                          <div className="w-8 h-6 rounded bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold text-[11px] flex items-center justify-center shrink-0">
                            {catIdx + 1}.{taskIdx + 1}
                          </div>

                          {/* Task Description Input */}
                          <input
                            type="text"
                            value={task.text}
                            onChange={(e) =>
                              handleUpdateTaskText(
                                category.id,
                                task.id,
                                e.target.value
                              )
                            }
                            placeholder="Ketik butir tugas checklist di sini..."
                            className="w-full bg-transparent text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:px-2 focus:py-1 focus:rounded-lg focus:ring-1 focus:ring-indigo-300 transition-all"
                          />
                        </div>

                        {/* Right: Toggle Switch, Badge & Delete Icon */}
                        <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                          {/* Toggle Switch */}
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleTaskPhoto(category.id, task.id)
                            }
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              task.requirePhoto ? "bg-indigo-600" : "bg-slate-200"
                            }`}
                            title={
                              task.requirePhoto
                                ? "Wajib Lampirkan Foto"
                                : "Foto Opsional"
                            }
                          >
                            <span
                              aria-hidden="true"
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                task.requirePhoto
                                  ? "translate-x-4"
                                  : "translate-x-0"
                              }`}
                            />
                          </button>

                          {/* Status Badge & Priority Label */}
                          {task.requirePhoto ? (
                            <div className="flex items-center gap-1">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Camera className="w-2.5 h-2.5 text-emerald-600" />
                                <span>Wajib Foto</span>
                              </span>
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[8.5px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                                Priority High
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                Opsional
                              </span>
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[8.5px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                                Priority Low
                              </span>
                            </div>
                          )}

                          {/* Delete Task Button */}
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteTask(category.id, task.id)
                            }
                            className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="Hapus Task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Bottom Button inside Category */}
                    <button
                      type="button"
                      onClick={() => handleAddTask(category.id)}
                      className="w-full py-2.5 border border-dashed border-indigo-200 hover:border-indigo-300 bg-indigo-50/10 hover:bg-indigo-50/30 text-indigo-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Butir Task Baru pada Kategori Ini</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Big Add Category Button */}
        <div className="mt-4">
          <button
            type="button"
            onClick={handleAddCategory}
            className="w-full py-3.5 border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/20 hover:bg-indigo-50/40 text-indigo-600 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Tambah Kategori Baru</span>
          </button>
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white/95 backdrop-blur-md border-t border-slate-200 py-3.5 px-4 sm:px-8 z-30 shadow-lg flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
        >
          Batal
        </button> 
        <button
          type="button"
          onClick={handleSaveTemplate}
          className="inline-flex items-center gap-2 px-5 py-2 bg-[#193f53] hover:bg-[#123040] text-white rounded-xl text-xs font-semibold transition-all shadow-md cursor-pointer"
        >
          <BookmarkCheck className="w-4 h-4" />
          <span>Simpan Perubahan</span>
        </button>
      </div>
    </div>
  );
}
