"use client";

import React, { useState, useEffect } from "react";
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
  Loader2,
} from "lucide-react";
import { TemplateService } from "@/services/template.service";
import { TemplateCategoryGroup, ChecklistTask } from "@/types/template";
import { AuthService } from "@/lib/auth";
import { toast } from "sonner";

interface CreateTemplateProps {
  onBack?: () => void;
  onSuccess?: () => void;
  workspaceId?: string;
  workspaceName?: string;
}

export default function CreateTemplate({
  onBack,
  onSuccess,
  workspaceId,
  workspaceName,
}: CreateTemplateProps) {
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

  // Template Info
  const [templateName, setTemplateName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Categories & Tasks State (Clean Empty Initial State - Zero Static Dummy)
  const [categories, setCategories] = useState<TemplateCategoryGroup[]>([
    {
      id: "cat-1",
      name: "",
      isExpanded: true,
      tasks: [
        {
          id: "task-1-1",
          text: "",
          requirePhoto: false,
        },
      ],
    },
  ]);

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
            tasks: cat.tasks.map((t) => {
              if (t.id === taskId) {
                const nextPhoto = !t.requirePhoto;
                return {
                  ...t,
                  requirePhoto: nextPhoto,
                  priority: nextPhoto ? "High" : "Low",
                };
              }
              return t;
            }),
          };
        }
        return cat;
      })
    );
  };

  const handleToggleTaskPriority = (catId: string, taskId: string) => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id === catId) {
          return {
            ...cat,
            tasks: cat.tasks.map((t) => {
              if (t.id === taskId) {
                const currentPri = t.priority || (t.requirePhoto ? "High" : "Low");
                const nextPri = currentPri === "High" ? "Low" : "High";
                return { ...t, priority: nextPri };
              }
              return t;
            }),
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

  // Submit Handler with Strict Validation & Dynamic Login-Based Creator Info
  const handleSaveTemplate = async () => {
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
        priority: t.priority || (t.requirePhoto ? "High" : "Low"),
      }))
    );

    // Resolusi nama user login yang menyimpan template hari ini
    const currentUser = AuthService.getCurrentUser();
    const storedAdminName =
      typeof window !== "undefined" ? localStorage.getItem("audit_pro_admin_name") : null;
    const cleanStoredName =
      storedAdminName && storedAdminName !== "Admin Utama" ? storedAdminName : null;

    const creatorName =
      currentUser?.fullName ||
      cleanStoredName ||
      "Admin";
    const creatorRole = currentUser?.role || "Super Admin";

    const todayStr = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    setIsSubmitting(true);
    try {
      await TemplateService.createAsync({
        title: templateName.trim(),
        category: categories[0]?.name.trim() || "Operasional Harian",
        description: `Template audit dengan ${categories.length} kategori dan ${flatItems.length} tugas periksa.`,
        categories,
        items: flatItems,
        itemsCount: flatItems.length,
        lastRevision: todayStr,
        createdBy: creatorName,
        creatorRole: creatorRole,
        status: "Aktif",
        createdAt: todayStr,
        workspaceId,
      });

      toast.success(`Template "${templateName}" berhasil disimpan!`);
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/template-checklist");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan template";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
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
          <span className="text-slate-600">TAMBAH TEMPLATE BARU</span>
        </div>

        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Daftar</span>
        </button>
      </div>

      {/* Main Section Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 mb-5 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-[#eef6ff] text-[#1d4ed8] flex items-center justify-center shrink-0 shadow-2xs">
            <ClipboardList className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              Buat Standar Template Checklist
            </h1>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Tentukan judul checklist audit, kelompokkan berdasarkan area atau departemen (kategori), dan tambahkan butir tugas pemeriksaan spesifik.
            </p>
          </div>
        </div>

        {/* Template Title Input */}
        <div className="mt-5 pt-5 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Nama Template Checklist <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Contoh: Checklist Opening & Kesiapan Operasional Pagi..."
            className="w-full px-4 py-2.5 bg-slate-50/60 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53] transition-all font-medium"
            required
          />
        </div>
      </div>

      {/* Categories & Tasks Manager */}
      <div className="space-y-4">
        {/* Section Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div>
            <h2 className="text-sm font-bold text-slate-900 leading-tight">
              Struktur Kategori & Butir Pemeriksaan
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Total {totalCategories} Kategori • {totalTasks} Butir Tugas Pemeriksaan
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleExpandAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
            >
              <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span>{areAllExpanded ? "Tutup Semua" : "Buka Semua"}</span>
            </button>

            <button
              type="button"
              onClick={handleAddCategory}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#193f53] bg-white hover:bg-slate-50 border border-slate-200 hover:border-[#193f53]/40 rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Kategori</span>
            </button>
          </div>
        </div>

        {/* Category Cards List */}
        <div className="space-y-3.5">
          {categories.map((category, catIndex) => {
            const isExpanded = category.isExpanded ?? true;

            return (
              <div
                key={category.id}
                className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs transition-shadow hover:shadow-sm"
              >
                {/* Category Header Bar */}
                <div className="p-3.5 sm:p-4 bg-[#fbfcfd] border-b border-slate-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="text-slate-300 hover:text-slate-400 cursor-grab active:cursor-grabbing p-1 shrink-0">
                      <GripVertical className="w-4 h-4" />
                    </div>

                    <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0">
                      {catIndex + 1}
                    </div>

                    <input
                      type="text"
                      value={category.name}
                      onChange={(e) =>
                        handleUpdateCategoryName(category.id, e.target.value)
                      }
                      placeholder={`Nama Kategori ${catIndex + 1} (misal: Sanitasi & Kesiapan Kasir)...`}
                      className="flex-1 min-w-0 bg-transparent font-bold text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white px-2 py-1 rounded-lg border border-transparent focus:border-slate-200 focus:ring-1 focus:ring-[#193f53]/20 transition-all"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-medium text-slate-400 bg-white px-2.5 py-1 rounded-lg border border-slate-200 hidden sm:inline-block">
                      {category.tasks.length} butir
                    </span>

                    <button
                      type="button"
                      onClick={() => handleToggleCategory(category.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title={isExpanded ? "Tutup Kategori" : "Buka Kategori"}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(category.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Hapus Kategori"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Category Tasks List (Accordion Body) */}
                {isExpanded && (
                  <div className="p-3.5 sm:p-4 space-y-2.5 bg-white">
                    {category.tasks.map((task, taskIndex) => (
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
                            {catIndex + 1}.{taskIndex + 1}
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
                            placeholder={`Tugas ${catIndex + 1}.${taskIndex + 1} (misal: Pastikan meja kasir dan mesin EDC steril)...`}
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
                          <div className="flex items-center gap-1">
                            {task.requirePhoto ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Camera className="w-2.5 h-2.5 text-emerald-600" />
                                <span>Wajib Foto</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                Opsional
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => handleToggleTaskPriority(category.id, task.id)}
                              className={`inline-flex items-center px-1.5 py-0.2 rounded text-[8.5px] font-bold uppercase tracking-wider cursor-pointer transition-all hover:opacity-80 ${
                                (task.priority || (task.requirePhoto ? "High" : "Low")) === "High"
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}
                              title="Klik untuk mengubah prioritas (High / Low)"
                            >
                              {(task.priority || (task.requirePhoto ? "High" : "Low")) === "High"
                                ? "Priority High"
                                : "Priority Low"}
                            </button>
                          </div>

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

                    {/* Add Task Button for this Category */}
                    <div className="pt-1.5 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleAddTask(category.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#193f53] hover:text-[#123040] hover:underline cursor-pointer px-1 py-1 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Butir Tugas Baru</span>
                      </button>

                      <span className="text-[11px] text-slate-400">
                        {category.tasks.filter((t) => t.requirePhoto).length} tugas wajib foto
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add Category Big Button */}
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
          disabled={isSubmitting}
          className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={handleSaveTemplate}
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-5 py-2 bg-[#193f53] hover:bg-[#123040] text-white rounded-xl text-xs font-semibold transition-all shadow-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <BookmarkCheck className="w-4 h-4" />
          )}
          <span>{isSubmitting ? "Menyimpan Template..." : "Simpan Template"}</span>
        </button>
      </div>
    </div>
  );
}
