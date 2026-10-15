"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  CalendarPlus,
  Search,
  Check,
  Clock,
  ChevronDown,
} from "lucide-react";
import { AuditSchedule, RecurrenceType, ScheduleStatus } from "@/types/schedule";

interface CreateSchedulePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<AuditSchedule, "id">) => void;
}

const STORE_OPTIONS = [
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

const INPUT_CLS =
  "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53] transition-all";

export default function CreateSchedulePanel({
  isOpen,
  onClose,
  onSubmit,
}: CreateSchedulePanelProps) {
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

  /* ─── Reset state when closed ────────────────────────── */
  useEffect(() => {
    if (!isOpen) {
      setScheduleName("");
      setSelectedStores([]);
      setStoreSearch("");
      setTemplate(TEMPLATE_OPTIONS[0]);
      setStartTime("09:00");
      setEndTime("12:00");
      setRecurrence("Setiap Hari");
      setSelectedDays(["Sen", "Sel", "Rab", "Kam", "Jum"]);
      setNotes("");
      setIsActive(true);
      setIsStoreDropdownOpen(false);
    }
  }, [isOpen]);

  const filteredStores = useMemo(
    () =>
      STORE_OPTIONS.filter((s) =>
        s.name.toLowerCase().includes(storeSearch.toLowerCase())
      ),
    [storeSearch]
  );

  const allSelected = selectedStores.length === STORE_OPTIONS.length;

  const toggleStore = (name: string) => {
    setSelectedStores((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  };

  const toggleAllStores = () => {
    setSelectedStores(allSelected ? [] : STORE_OPTIONS.map((s) => s.name));
  };

  const removeStore = (name: string) => {
    setSelectedStores((prev) => prev.filter((s) => s !== name));
  };

  /* ─── Day toggle ─────────────────────────────────────── */
  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  /* ─── Submit ─────────────────────────────────────────── */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStores.length === 0) return;

    const chosenStore =
      STORE_OPTIONS.find((s) => s.name === selectedStores[0]) || {
        name: selectedStores[0],
        location: "Jakarta",
      };

    const finalName = scheduleName.trim() || template;
    const finalStatus: ScheduleStatus = isActive ? "Terjadwal" : "Dibatalkan";

    onSubmit({
      storeName: chosenStore.name,
      storeLocation: chosenStore.location,
      scheduleName: finalName,
      date: new Date().toISOString().split("T")[0],
      startTime,
      endTime,
      timeRange: `${startTime} - ${endTime}`,
      recurrence,
      selectedDays: recurrence === "Hari Tertentu" ? selectedDays : undefined,
      status: finalStatus,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString().split("T")[0],
      auditorName: "Admin Utama",
    });

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
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-sky-50 text-sky-600">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5 text-sky-600">
                Form Baru
              </p>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                Tambah Jadwal Audit
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Atur penugasan audit baru untuk cabang toko.
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Nama Jadwal */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nama Jadwal <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
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
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={toggleAllStores}
                  className="text-[10px] font-semibold text-sky-600 hover:text-sky-700 cursor-pointer"
                >
                  {allSelected ? "Hapus Semua" : "Pilih Semua"}
                </button>
              </div>
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
                    {/* Pilih semua row */}
                    <label className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-100">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAllStores}
                        className="w-3.5 h-3.5 rounded accent-[#193f53] cursor-pointer"
                      />
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-slate-700">
                          Pilih Semua Toko ({STORE_OPTIONS.length} Toko)
                        </p>
                      </div>
                      {allSelected && (
                        <Check className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      )}
                    </label>

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
                            type="checkbox"
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
              className={INPUT_CLS}
            >
              {TEMPLATE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Waktu Pelaksanaan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Waktu Pelaksanaan <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={`${INPUT_CLS} pl-9`}
                />
              </div>
              <div className="relative">
                <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={`${INPUT_CLS} pl-9`}
                />
              </div>
            </div>
          </div>

          {/* Pengulangan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Pengulangan <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["Setiap Hari", "Hari Tertentu", "Hanya Sekali"] as RecurrenceType[]).map(
                (item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setRecurrence(item)}
                    className={`py-2 px-2.5 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                      recurrence === item
                        ? "bg-[#193f53] text-white border-[#193f53] shadow-2xs font-semibold"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {item}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Hari Tertentu Selector */}
          {recurrence === "Hari Tertentu" && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-in fade-in duration-150">
              <label className="block text-[11px] font-semibold text-slate-600">
                Pilih Hari Aktif
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_DAYS.map((day) => {
                  const isDaySelected = selectedDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        isDaySelected
                          ? "bg-[#193f53] text-white shadow-2xs"
                          : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Instruksi Khusus */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Instruksi Khusus (Opsional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tambahkan catatan khusus untuk tim auditor terkait toko ini..."
              className={`${INPUT_CLS} resize-none`}
            />
          </div>

          {/* Status Jadwal Awal Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
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
            disabled={selectedStores.length === 0 || !scheduleName.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#193f53] hover:bg-[#123040] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            <span>Simpan Jadwal</span>
          </button>
        </div>
      </div>
    </div>
  );
}
