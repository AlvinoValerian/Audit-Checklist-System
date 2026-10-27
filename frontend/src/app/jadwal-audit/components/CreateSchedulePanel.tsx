"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  CalendarPlus,
  Pencil,
  Search,
  Check,
  Clock,
  ChevronDown,
  Save,
} from "lucide-react";
import { AuditSchedule, RecurrenceType, ScheduleStatus } from "@/types/schedule";
import { toast } from "sonner";

interface CreateSchedulePanelProps {
  isOpen: boolean;
  initialData?: AuditSchedule | null;
  schedule?: AuditSchedule | null;
  onClose: () => void;
  onSubmit: (data: Omit<AuditSchedule, "id"> | Array<Omit<AuditSchedule, "id">>) => void;
}

export const STORE_OPTIONS = [
  { name: "Cabang Sudirman", location: "Jakarta Pusat" },
  { name: "Cabang Thamrin", location: "Jakarta Pusat" },
  { name: "Cabang Kemang", location: "Jakarta Selatan" },
  { name: "Cabang Senayan", location: "Jakarta Pusat" },
  { name: "Cabang PIK", location: "Jakarta Utara" },
  { name: "Cabang Kelapa Gading", location: "Jakarta Utara" },
  { name: "Cabang Bintaro", location: "Tangerang Selatan" },
  { name: "Cabang Puri Indah", location: "Jakarta Barat" },
  { name: "Cabang Fatmawati", location: "Jakarta Selatan" },
  { name: "Cabang Pondok Indah", location: "Jakarta Selatan" },
];

const TEMPLATE_OPTIONS = [
  "Checklist Operasional Harian",
  "Audit Display & Promosi",
  "Audit Kebersihan & K3",
  "Audit Stok & Inventori",
  "Audit Fasilitas & Keamanan",
  "Audit Kepatuhan Kasir & POS",
  "Inspeksi Cold Storage & Chiller",
];

const ALL_DAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

const DAY_MAP_TO_SHORT: Record<string, string> = {
  Senin: "Sen",
  Selasa: "Sel",
  Rabu: "Rab",
  Kamis: "Kam",
  Jumat: "Jum",
  Sabtu: "Sab",
  Minggu: "Min",
  Sen: "Sen",
  Sel: "Sel",
  Rab: "Rab",
  Kam: "Kam",
  Jum: "Jum",
  Sab: "Sab",
  Min: "Min",
};

export const normalizeDayToShort = (day: string): string => {
  return DAY_MAP_TO_SHORT[day] || day;
};

const INPUT_CLS =
  "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53] transition-all";

export default function CreateSchedulePanel({
  isOpen,
  initialData,
  schedule,
  onClose,
  onSubmit,
}: CreateSchedulePanelProps) {
  const targetData = schedule || initialData;
  const isEdit = Boolean(targetData);

  /* ─── Form state ─────────────────────────────────────── */
  const [scheduleName, setScheduleName] = useState("");
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [storeSearch, setStoreSearch] = useState("");
  const [isStoreDropdownOpen, setIsStoreDropdownOpen] = useState(false);

  const [template, setTemplate] = useState(TEMPLATE_OPTIONS[0]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const [recurrence, setRecurrence] = useState<RecurrenceType>("Setiap Hari");
  const [selectedDays, setSelectedDays] = useState<string[]>(["Sen", "Sel", "Rab", "Kam", "Jum"]);
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);

  /* ─── Sync with initialData / schedule prop ─────────── */
  useEffect(() => {
    if (!isOpen) return;

    if (targetData) {
      setScheduleName(targetData.scheduleName || "");
      if (targetData.selectedStores && targetData.selectedStores.length > 0) {
        setSelectedStores(targetData.selectedStores);
      } else if (targetData.storeName === "Semua Toko") {
        setSelectedStores(STORE_OPTIONS.map((s) => s.name));
      } else {
        setSelectedStores([targetData.storeName]);
      }
      setStoreSearch("");
      setTemplate(
        TEMPLATE_OPTIONS.includes(targetData.scheduleName)
          ? targetData.scheduleName
          : TEMPLATE_OPTIONS[0]
      );
      setStartTime(targetData.startTime || "09:00");
      setEndTime(targetData.endTime || "12:00");
      const rec = targetData.recurrence || "Setiap Hari";
      setRecurrence(rec);
      if (rec === "Setiap Hari") {
        setSelectedDays([...ALL_DAYS]);
      } else {
        const rawDays = targetData.selectedDays || [];
        const normalized = rawDays
          .map((d) => normalizeDayToShort(d))
          .filter((d) => ALL_DAYS.includes(d));
        setSelectedDays(normalized);
      }
      setNotes(targetData.notes || "");
      setIsActive(targetData.status !== "Dibatalkan");
    } else {
      /* Reset for Create */
      setScheduleName("");
      setSelectedStores([]);
      setStoreSearch("");
      setTemplate(TEMPLATE_OPTIONS[0]);
      setStartTime("09:00");
      setEndTime("12:00");
      setRecurrence("Setiap Hari");
      setSelectedDays([...ALL_DAYS]);
      setNotes("");
      setIsActive(true);
    }
    setIsStoreDropdownOpen(false);
  }, [isOpen, targetData]);

  /* ─── Dynamic store list (include schedule store if not in predefined list) ── */
  const availableStores = useMemo(() => {
    if (
      targetData &&
      targetData.storeName !== "Semua Toko" &&
      !targetData.storeName.includes("Toko Terpilih") &&
      !STORE_OPTIONS.some((s) => s.name === targetData.storeName)
    ) {
      return [
        { name: targetData.storeName, location: targetData.storeLocation || "Jakarta" },
        ...STORE_OPTIONS,
      ];
    }
    return STORE_OPTIONS;
  }, [targetData]);

  const filteredStores = useMemo(
    () =>
      availableStores.filter((s) =>
        s.name.toLowerCase().includes(storeSearch.toLowerCase())
      ),
    [availableStores, storeSearch]
  );

  const allSelected = selectedStores.length === availableStores.length;

  const toggleStore = (name: string) => {
    if (isEdit) {
      setSelectedStores([name]);
      setIsStoreDropdownOpen(false);
    } else {
      setSelectedStores((prev) =>
        prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
      );
    }
  };

  const toggleAllStores = () => {
    setSelectedStores(allSelected ? [] : availableStores.map((s) => s.name));
  };

  const removeStore = (name: string) => {
    setSelectedStores((prev) => prev.filter((s) => s !== name));
  };

  /* ─── Recurrence & Day toggle ───────────────────────── */
  const handleRecurrenceChange = (type: RecurrenceType) => {
    setRecurrence(type);
    if (type === "Setiap Hari") {
      setSelectedDays([...ALL_DAYS]);
    } else if (type === "Hari Tertentu") {
      // Kosongkan hari terlebih dahulu agar user memilih sendiri tanpa otomatis Senin-Jumat
      if (!isEdit) {
        setSelectedDays([]);
      } else {
        if (targetData?.selectedDays && targetData.selectedDays.length > 0 && targetData.recurrence === "Hari Tertentu") {
          setSelectedDays(targetData.selectedDays);
        } else {
          setSelectedDays([]);
        }
      }
    }
  };

  const toggleDay = (day: string) => {
    if (recurrence === "Setiap Hari") {
      // Jika user menekan salah satu hari saat di mode Setiap Hari,
      // otomatis alihkan ke mode Hari Tertentu dengan hari tersebut di-uncheck
      setRecurrence("Hari Tertentu");
      setSelectedDays(ALL_DAYS.filter((d) => d !== day));
      return;
    }

    if (selectedDays.includes(day)) {
      if (selectedDays.length <= 1) {
        toast.warning("Minimal harus memilih 1 hari audit untuk jadwal ini!");
        return;
      }
      setSelectedDays((prev) => prev.filter((d) => d !== day));
    } else {
      setSelectedDays((prev) => [...prev, day]);
    }
  };

  /* ─── Submit ─────────────────────────────────────────── */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStores.length === 0) return;

    if (recurrence === "Hari Tertentu" && selectedDays.length === 0) {
      toast.error("Wajib memilih minimal 1 hari audit untuk pengulangan Hari Tertentu!");
      return;
    }

    const finalName = scheduleName.trim() || targetData?.scheduleName || template;
    const finalStatus: ScheduleStatus = isActive ? "Terjadwal" : "Dibatalkan";

    if (isEdit) {
      // Mode Edit: edit 1 jadwal toko spesifik
      const chosenStore =
        availableStores.find((s) => s.name === selectedStores[0]) || {
          name: selectedStores[0],
          location: targetData?.storeLocation || "Jakarta",
        };

      onSubmit({
        storeName: chosenStore.name,
        storeLocation: chosenStore.location,
        scheduleName: finalName,
        date: targetData?.date || new Date().toISOString().split("T")[0],
        startTime,
        endTime,
        timeRange: `${startTime} - ${endTime}`,
        recurrence,
        selectedDays: recurrence === "Setiap Hari" ? [...ALL_DAYS] : selectedDays,
        status: finalStatus,
        notes: notes.trim() || undefined,
        createdAt: targetData?.createdAt || new Date().toISOString().split("T")[0],
        auditorName: targetData?.auditorName,
      });
    } else {
      // Mode Create: buat 1 log terpisah per toko yang dipilih (Bulk Create)
      const schedulesToCreate: Array<Omit<AuditSchedule, "id">> = selectedStores.map((storeName) => {
        const storeObj = availableStores.find((s) => s.name === storeName) || {
          name: storeName,
          location: "Jakarta",
        };
        return {
          storeName: storeObj.name,
          storeLocation: storeObj.location,
          scheduleName: finalName,
          date: new Date().toISOString().split("T")[0],
          startTime,
          endTime,
          timeRange: `${startTime} - ${endTime}`,
          recurrence,
          selectedDays: recurrence === "Setiap Hari" ? [...ALL_DAYS] : selectedDays,
          status: finalStatus,
          notes: notes.trim() || undefined,
          createdAt: new Date().toISOString().split("T")[0],
        };
      });

      onSubmit(schedulesToCreate);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Side Panel */}
      <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl border-l border-slate-200 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isEdit ? "bg-amber-50 text-amber-600" : "bg-sky-50 text-sky-600"
              }`}
            >
              {isEdit ? (
                <Pencil className="w-4 h-4" />
              ) : (
                <CalendarPlus className="w-5 h-5" />
              )}
            </div>
            <div>
              <p
                className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${
                  isEdit ? "text-amber-600" : "text-sky-600"
                }`}
              >
                {isEdit ? "Mode Edit" : "Form Baru"}
              </p>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                {isEdit ? "Edit Jadwal Audit" : "Tambah Jadwal Audit"}
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isEdit
                  ? "Perbarui informasi jadwal dan penugasan audit cabang."
                  : "Atur penugasan audit baru untuk cabang toko."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} autoComplete="off" className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Nama Jadwal */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nama Jadwal <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="auditScheduleTitle"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              required
              value={scheduleName}
              onChange={(e) => setScheduleName(e.target.value)}
              placeholder="Contoh: Jadwal Audit Mingguan Area Jakarta"
              className={INPUT_CLS}
            />
          </div>

          {/* Pilih Toko / Cabang */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Pilih Toko / Cabang <span className="text-rose-500">*</span>
              </label>
              {!isEdit && (
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={toggleAllStores}
                    className="text-[10px] font-semibold text-sky-600 hover:text-sky-700 cursor-pointer"
                  >
                    {allSelected ? "Hapus Semua" : "Pilih Semua"}
                  </button>
                </div>
              )}
            </div>

            {/* Selected Tags */}
            {selectedStores.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedStores.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 rounded-md text-[11px] font-medium"
                  >
                    {name.replace("Cabang ", "")}
                    <button
                      type="button"
                      onClick={() => removeStore(name)}
                      className="text-sky-400 hover:text-sky-600 cursor-pointer"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Dropdown trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsStoreDropdownOpen((v) => !v)}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-500 hover:border-slate-300 transition-all cursor-pointer"
              >
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={storeSearch}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsStoreDropdownOpen(true);
                  }}
                  onChange={(e) => {
                    setStoreSearch(e.target.value);
                    setIsStoreDropdownOpen(true);
                  }}
                  placeholder="Cari toko atau cabang..."
                  className="flex-1 bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
                />
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {isStoreDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsStoreDropdownOpen(false)}
                  />
                  <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden max-h-56 overflow-y-auto">
                    {/* Pilih semua row (hanya di form baru) */}
                    {!isEdit && (
                      <label className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-100">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleAllStores}
                          className="w-3.5 h-3.5 rounded accent-[#193f53] cursor-pointer"
                        />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-slate-700">
                            Pilih Semua Toko ({availableStores.length} Toko)
                          </p>
                        </div>
                        {allSelected && (
                          <Check className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        )}
                      </label>
                    )}

                    {filteredStores.map((store) => {
                      const checked = selectedStores.includes(store.name);
                      return (
                        <label
                          key={store.name}
                          onClick={(e) => {
                            e.preventDefault();
                            toggleStore(store.name);
                          }}
                          className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-slate-50 cursor-pointer"
                        >
                          <input
                            type={isEdit ? "radio" : "checkbox"}
                            name="storeSelection"
                            checked={checked}
                            onChange={() => {}}
                            className="w-3.5 h-3.5 rounded accent-[#193f53] cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">
                              {store.name}
                            </p>
                            <p className="text-[10px] text-slate-400">{store.location}</p>
                          </div>
                          {checked && (
                            <Check className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                          )}
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Template Checklist */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Template Checklist <span className="text-rose-500">*</span>
            </label>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className={INPUT_CLS + " cursor-pointer"}
            >
              {TEMPLATE_OPTIONS.map((tpl) => (
                <option key={tpl} value={tpl}>
                  {tpl}
                </option>
              ))}
            </select>
          </div>

          {/* Waktu Audit */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Waktu Audit <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-slate-400 mb-1">Jam Mulai</p>
                <div className="relative">
                  <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53]"
                  />
                </div>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 mb-1">Jam Selesai</p>
                <div className="relative">
                  <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Pengulangan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Pengulangan Jadwal (Recurrence) <span className="text-rose-500">*</span>
            </label>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold p-0.5 bg-slate-50 gap-1">
              <button
                type="button"
                onClick={() => handleRecurrenceChange("Setiap Hari")}
                className={`flex-1 py-2 rounded-md transition-all cursor-pointer text-center ${
                  recurrence === "Setiap Hari"
                    ? "bg-[#193f53] text-white shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white"
                }`}
              >
                Setiap Hari
              </button>
              <button
                type="button"
                onClick={() => handleRecurrenceChange("Hari Tertentu")}
                className={`flex-1 py-2 rounded-md transition-all cursor-pointer text-center ${
                  recurrence === "Hari Tertentu"
                    ? "bg-[#193f53] text-white shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white"
                }`}
              >
                Hari Tertentu
              </button>
            </div>

            {/* Day Chips */}
            <div className="mt-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] text-slate-400">
                  {recurrence === "Setiap Hari"
                    ? "Semua hari otomatis aktif (Senin - Minggu):"
                    : "Pilih hari audit mingguan (minimal 1 hari):"}
                </p>
                {recurrence === "Hari Tertentu" && (
                  <span
                    className={`text-[10px] font-semibold ${
                      selectedDays.length === 0 ? "text-rose-500" : "text-sky-600"
                    }`}
                  >
                    {selectedDays.length === 0
                      ? "Wajib pilih minimal 1 hari"
                      : `${selectedDays.length} hari dipilih`}
                  </span>
                )}
              </div>
              <div className="flex gap-1.5">
                {ALL_DAYS.map((day) => {
                  const active = selectedDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        active
                          ? "bg-[#193f53] text-white border-[#193f53] shadow-xs"
                          : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                      }`}
                      title={
                        recurrence === "Setiap Hari"
                          ? `Klik untuk beralih ke hari tertentu tanpa ${day}`
                          : undefined
                      }
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              {recurrence === "Hari Tertentu" && selectedDays.length === 0 && (
                <p className="text-[10px] text-rose-500 font-medium mt-1">
                  * Minimal 1 hari harus dipilih agar jadwal dapat disimpan.
                </p>
              )}
            </div>
          </div>

          {/* Catatan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Catatan / Instruksi Khusus{" "}
              <span className="text-slate-400 font-normal">(Opsional)</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tambahkan instruksi khusus untuk auditor lapangan..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53] transition-all resize-none"
            />
          </div>

          {/* Status Jadwal Awal */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
            <div>
              <p className="text-xs font-bold text-slate-800">Status Jadwal Awal</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Aktifkan langsung setelah jadwal disimpan
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                isActive
                  ? "bg-emerald-50/80 text-emerald-600 border-emerald-200"
                  : "bg-slate-100 text-slate-400 border-slate-200"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isActive ? "bg-emerald-500" : "bg-slate-400"
                }`}
              />
              <span>{isActive ? "Aktif" : "Nonaktif"}</span>
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            onClick={(e) => {
              e.preventDefault();
              const form = e.currentTarget.closest(".fixed")?.querySelector("form");
              if (form) form.requestSubmit();
            }}
            disabled={
              selectedStores.length === 0 ||
              !scheduleName.trim() ||
              (recurrence === "Hari Tertentu" && selectedDays.length === 0)
            }
            className="flex items-center gap-2 px-5 py-2.5 bg-[#193f53] hover:bg-[#123040] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer"
          >
            {isEdit ? (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Perubahan</span>
              </>
            ) : (
              <>
                <CalendarPlus className="w-3.5 h-3.5" />
                <span>Simpan Jadwal</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
