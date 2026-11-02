import React, { useState, useEffect } from "react";
import {
  CalendarOff,
  Settings2,
  AlertTriangle,
  ShieldAlert,
  Calendar,
  Clock,
  Store,
  Check,
  Info,
  XCircle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Search,
  ChevronDown,
  X,
  Loader2,
} from "lucide-react";
import { HolidayService } from "@/services/holiday.service";
import { TokoService } from "@/services/toko.service";
import { AuthService } from "@/lib/auth";
import { Holiday } from "@/types/holiday";

interface CreateHolidayViewProps {
  initialData?: Holiday | null;
  onBack: () => void;
  onSave: (data: any) => Promise<void> | void;
  workspaceId?: string;
  workspaceName?: string;
}

const MAX_REASON_LENGTH = 150;

export default function CreateHolidayView({
  initialData,
  onBack,
  onSave,
  workspaceId,
  workspaceName,
}: CreateHolidayViewProps) {
  const cleanDate = (d?: string) => (d ? d.substring(0, 10) : "");

  const [liburType, setLiburType] = useState<"full" | "partial" | null>(
    initialData ? initialData.liburType || "full" : null
  );
  const [selectedSchedules, setSelectedSchedules] = useState<string[]>(
    initialData?.schedules || []
  );

  // Toko selection states (Multi-store support matching Jadwal Audit)
  const [selectedStores, setSelectedStores] = useState<string[]>(() => {
    if (initialData?.storeName) return [initialData.storeName];
    return [];
  });
  const [storeOptions, setStoreOptions] = useState<{ name: string; location: string }[]>([]);
  const [storeSearch, setStoreSearch] = useState("");
  const [isStoreDropdownOpen, setIsStoreDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [startDate, setStartDate] = useState(cleanDate(initialData?.startDate));
  const [endDate, setEndDate] = useState(cleanDate(initialData?.endDate || initialData?.startDate));
  const [reason, setReason] = useState(initialData?.reason || "");
  const [existingHolidays, setExistingHolidays] = useState<Holiday[]>([]);

  // Sinkronisasi form saat initialData berubah (Mode Edit)
  useEffect(() => {
    if (initialData) {
      setLiburType(initialData.liburType || "full");
      setSelectedSchedules(initialData.schedules || []);
      if (initialData.storeName) setSelectedStores([initialData.storeName]);
      setStartDate(cleanDate(initialData.startDate));
      setEndDate(cleanDate(initialData.endDate || initialData.startDate));
      setReason(initialData.reason || "");
    }
  }, [initialData]);

  // Load real stores and existing holidays from Database / Backend
  useEffect(() => {
    const loadDynamicData = async () => {
      const activeWs = AuthService.getActiveWorkspace();
      const targetWs = workspaceId || activeWs?.id;

      try {
        const liveHolidays = await HolidayService.fetchAll(targetWs);
        setExistingHolidays(liveHolidays);
      } catch {
        setExistingHolidays(HolidayService.getAll());
      }

      try {
        const liveStores = await TokoService.fetchAll(targetWs);
        if (Array.isArray(liveStores)) {
          const seen = new Set<string>();
          const unique: { id?: string; name: string; location: string }[] = [];
          for (const s of liveStores) {
            const name = (s.name || s.storeName || "").trim();
            if (name && !seen.has(name.toLowerCase())) {
              seen.add(name.toLowerCase());
              unique.push({
                id: s.id,
                name,
                location: s.city || s.address || "Lokasi Toko",
              });
            }
          }
          if (initialData?.storeName && !unique.some((u) => u.name === initialData.storeName)) {
            unique.unshift({
              name: initialData.storeName,
              location: initialData.storeLocation || "Lokasi Toko",
            });
          }
          setStoreOptions(unique);
        }
      } catch (err) {
        console.warn("Gagal memuat toko dinamis:", err);
      }
    };

    loadDynamicData();
  }, [initialData, workspaceId]);

  // Dropdown helper functions
  const toggleStore = (storeName: string) => {
    if (initialData) {
      setSelectedStores([storeName]);
      setIsStoreDropdownOpen(false);
      return;
    }
    if (selectedStores.includes(storeName)) {
      setSelectedStores(selectedStores.filter((s) => s !== storeName));
    } else {
      setSelectedStores([...selectedStores, storeName]);
    }
  };

  const removeStore = (storeName: string) => {
    setSelectedStores(selectedStores.filter((s) => s !== storeName));
  };

  const allSelected = storeOptions.length > 0 && selectedStores.length === storeOptions.length;

  const toggleAllStores = () => {
    if (allSelected) {
      setSelectedStores([]);
    } else {
      setSelectedStores(storeOptions.map((s) => s.name));
    }
  };

  const filteredStores = storeOptions.filter(
    (s) =>
      s.name.toLowerCase().includes(storeSearch.toLowerCase()) ||
      s.location.toLowerCase().includes(storeSearch.toLowerCase())
  );

  // Check holiday conflicts against all selected stores
  const conflictingHolidays = existingHolidays.filter((h) => {
    if (h.status === "Dibatalkan" || selectedStores.length === 0 || !startDate) return false;
    if (initialData) {
      const isSelf =
        String(h.id) === String(initialData.id) ||
        String(h.holidayId || "") === String(initialData.id) ||
        (initialData.holidayId && String(h.id) === String(initialData.holidayId));
      if (isSelf) return false; // Abaikan diri sendiri saat mode edit
    }
    if (!selectedStores.includes(h.storeName)) return false;
    const hStart = new Date(h.startDate);
    const hEnd = new Date(h.endDate || h.startDate);
    const sStart = new Date(startDate);
    const sEnd = new Date(endDate || startDate);
    return sStart <= hEnd && sEnd >= hStart;
  });

  const isFullConflict = conflictingHolidays.some((h) => h.liburType === "full" || !h.liburType);
  const takenSchedules = conflictingHolidays
    .filter((h) => h.liburType === "partial")
    .flatMap((h) => h.schedules || []);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    if (initialData?.startDate) {
      const d = new Date(initialData.startDate);
      if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    return new Date();
  });

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  const cYear = calendarMonth.getFullYear();
  const cMonth = calendarMonth.getMonth();

  const firstDay = new Date(cYear, cMonth, 1).getDay();
  const daysInMonth = new Date(cYear, cMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(cYear, cMonth, 0).getDate();

  const prevMonthDays = Array.from({ length: firstDay }).map((_, i) => daysInPrevMonth - firstDay + 1 + i);
  const currentMonthDays = Array.from({ length: daysInMonth }).map((_, i) => i + 1);
  const totalGridCells = firstDay + daysInMonth;
  const nextMonthDaysCount = totalGridCells % 7 === 0 ? 0 : 7 - (totalGridCells % 7);
  const nextMonthDays = Array.from({ length: nextMonthDaysCount }).map((_, i) => i + 1);

  const handleCalendarDateClick = (dateStr: string) => {
    if (selectedStores.length === 0) return;
    if (dateStr < todayStr) return;

    if (!startDate || (startDate && endDate && startDate !== endDate)) {
      setStartDate(dateStr);
      setEndDate(dateStr);
    } else if (startDate && (!endDate || startDate === endDate)) {
      if (dateStr < startDate) {
        setStartDate(dateStr);
        setEndDate(startDate);
      } else {
        setEndDate(dateStr);
      }
    }
  };

  const handleSaveClick = async () => {
    if (selectedStores.length === 0 || !startDate || !endDate || !reason.trim()) {
      alert("Mohon lengkapi semua field yang wajib diisi dan pilih minimal satu cabang toko!");
      return;
    }
    if (reason.length > MAX_REASON_LENGTH) {
      alert(`Alasan tidak boleh melebihi ${MAX_REASON_LENGTH} karakter!`);
      return;
    }
    const initialStartDateClean = cleanDate(initialData?.startDate);
    if (!initialData && startDate < todayStr) {
      alert("Tanggal mulai libur tidak boleh menggunakan tanggal yang sudah terlewat!");
      return;
    }
    if (initialData && startDate < todayStr && startDate !== initialStartDateClean) {
      alert("Tanggal mulai libur tidak boleh diubah ke tanggal yang sudah terlewat!");
      return;
    }
    if (endDate < startDate) {
      alert("Tanggal selesai libur tidak boleh lebih awal dari tanggal mulai!");
      return;
    }
    if (isFullConflict) {
      alert("Toko sudah diliburkan penuh pada tanggal ini. Tidak dapat menyimpan jadwal.");
      return;
    }
    if (!initialData && liburType === "full" && startDate === todayStr && unavailableScheduleIds.length === 4) {
      alert("Seluruh jadwal audit toko hari ini sudah terlewat jam operasionalnya!");
      return;
    }
    if (!initialData && liburType === "partial") {
      const validSchedules = selectedSchedules.filter((id) => !unavailableScheduleIds.includes(id));
      if (validSchedules.length === 0) {
        alert("Jadwal audit yang dipilih sudah terlewat jam operasionalnya untuk hari ini!");
        return;
      }
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const durationDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    // Ambil data user yang sedang login saat ini
    const currentUser = AuthService.getCurrentUser();
    const activeWs = AuthService.getActiveWorkspace();
    const targetWs = workspaceId || activeWs?.id;
    const loggedInName = currentUser?.fullName || currentUser?.email || "Admin";
    const loggedInRole = currentUser?.role || "Admin";

    // Bentuk payload satu-satu untuk setiap toko yang dipilih
    const items = selectedStores.map((storeName) => {
      const storeObj = storeOptions.find((s) => s.name === storeName);
      return {
        storeId: (storeObj as any)?.id,
        workspaceId: targetWs,
        storeName,
        storeLocation: storeObj?.location || initialData?.storeLocation || "Lokasi Toko",
        startDate,
        endDate,
        durationDays,
        reason: reason.trim(),
        createdBy: initialData?.createdBy || loggedInName,
        creatorRole: initialData?.creatorRole || loggedInRole,
        status: initialData?.status || "Terjadwal",
        liburType: liburType || "full",
        schedules: activeSelected,
      };
    });

    setIsSubmitting(true);
    try {
      if (initialData) {
        await onSave(items[0]);
      } else {
        await onSave(items);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSchedule = (id: string) => {
    if (takenSchedules.includes(id)) return;
    if (selectedSchedules.includes(id)) {
      setSelectedSchedules(selectedSchedules.filter((s) => s !== id));
    } else {
      setSelectedSchedules([...selectedSchedules, id]);
    }
  };

  const schedules = [
    { id: "1", name: "Audit Operasional Pagi & Kasir", time: "09:00 - 12:00 WIB", desc: "Checklist Operasional Harian" },
    { id: "2", name: "Audit Display Promosi & Merchandising", time: "13:00 - 15:30 WIB", desc: "Audit Display & Promosi" },
    { id: "3", name: "Audit Sanitasi & Penutupan Toko", time: "19:00 - 21:00 WIB", desc: "Audit Kebersihan & K3" },
    { id: "4", name: "Audit Stok & Cold Storage Mingguan", time: "16:00 - 18:00 WIB", desc: "Audit Stok & Inventori" },
  ];

  const unavailableScheduleIds = schedules
    .filter((schedule) => {
      if (takenSchedules.includes(schedule.id)) return true;
      // Pengecekan jam operasional yang telah lewat hanya diterapkan saat membuat libur baru, bukan saat edit
      if (!initialData && startDate) {
        const now = new Date();
        const [startH, startM] = schedule.time.split(" - ")[0].split(":").map(Number);

        const checkDate = new Date(startDate);
        const sYear = checkDate.getFullYear();
        const sMonth = checkDate.getMonth();
        const sDate = checkDate.getDate();

        const nYear = now.getFullYear();
        const nMonth = now.getMonth();
        const nDate = now.getDate();

        if (
          sYear < nYear ||
          (sYear === nYear && sMonth < nMonth) ||
          (sYear === nYear && sMonth === nMonth && sDate < nDate)
        ) {
          return true;
        } else if (sYear === nYear && sMonth === nMonth && sDate === nDate) {
          const currentH = now.getHours();
          const currentM = now.getMinutes();
          if (currentH > startH || (currentH === startH && currentM >= startM)) {
            return true;
          }
        }
      }
      return false;
    })
    .map((s) => s.id);

  // For "full", all are selected automatically in the UI logic.
  const activeSelectedRaw = liburType === "full" ? ["1", "2", "3", "4"] : selectedSchedules;
  const activeSelected = activeSelectedRaw.filter((id) => !unavailableScheduleIds.includes(id));
  const diliburkanCount =
    liburType === null || selectedStores.length === 0 || startDate === "" ? 0 : activeSelected.length;
  const berjalanCount =
    liburType === null || selectedStores.length === 0 || startDate === ""
      ? 0
      : 4 - diliburkanCount - unavailableScheduleIds.length;

  const initialStartDateClean = cleanDate(initialData?.startDate);
  const isDateInPast = Boolean(
    startDate &&
    startDate < todayStr &&
    (!initialData || startDate !== initialStartDateClean)
  );
  const isEndBeforeStart = Boolean(startDate && endDate && endDate < startDate);
  const isTodayAllShiftsPassed = Boolean(
    !initialData &&
    liburType === "full" &&
    startDate === todayStr &&
    unavailableScheduleIds.length === 4
  );
  const hasNoAvailableSchedules = Boolean(
    liburType === "partial" &&
    (initialData ? selectedSchedules.length === 0 : activeSelected.length === 0)
  );

  const isSaveDisabled =
    isSubmitting ||
    isFullConflict ||
    selectedStores.length === 0 ||
    !startDate ||
    !endDate ||
    !reason.trim() ||
    reason.length > MAX_REASON_LENGTH ||
    liburType === null ||
    isDateInPast ||
    isEndBeforeStart ||
    isTodayAllShiftsPassed ||
    hasNoAvailableSchedules;

  return (
    <div className="pb-24">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
          <button onClick={onBack} className="hover:text-blue-600 transition-colors cursor-pointer">
            Libur Toko & Pengecualian
          </button>
          <span>/</span>
          <span className="text-slate-900">{initialData ? "Edit Libur Toko" : "Tambah Libur Toko"}</span>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          <span>Kembali ke Daftar</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content Form (Left) */}
        <div className="flex-1 space-y-6">
          {/* STEP 1: PILIH TIPE LIBUR */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs">
            <div className="flex gap-4 mb-6">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                1
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 mb-1">PILIH TIPE LIBUR OPERASIONAL</h2>
                <p className="text-xs text-slate-500">
                  Tentukan apakah cabang toko libur penuh seharian atau hanya pengecualian jadwal tertentu.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option Full */}
              <div
                onClick={() => setLiburType("full")}
                className={`p-5 rounded-xl border-2 transition-all cursor-pointer relative group ${
                  liburType === "full"
                    ? "border-orange-500 bg-orange-50/25 shadow-xs"
                    : "border-slate-200 hover:border-orange-300 hover:shadow-xs bg-white"
                }`}
              >
                {/* Radio Circle Indicator */}
                <div className="absolute top-4 right-4 flex items-center justify-center">
                  {liburType === "full" ? (
                    <div className="w-5 h-5 rounded-full bg-orange-500 border-2 border-orange-500 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-slate-300 bg-white group-hover:border-orange-400 group-hover:scale-105 transition-all" />
                  )}
                </div>

                <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center mb-3">
                  <CalendarOff className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-2">Libur Toko Penuh (Tutup)</h3>
                <div className="inline-block px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] font-bold mb-3">
                  Semua Jadwal Libur
                </div>
                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  Toko tutup penuh. <strong>Seluruh jadwal audit otomatis dinonaktifkan</strong> untuk seluruh shift
                  pada rentang tanggal yang Anda tentukan.
                </p>
                <div className="flex items-start gap-2 text-[11px] text-slate-500 bg-white/60 p-2.5 rounded-lg border border-slate-100">
                  <Info className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                  <span>Tidak ada penugasan checklist audit yang akan dibuat selama periode libur ini.</span>
                </div>
              </div>

              {/* Option Partial */}
              <div
                onClick={() => setLiburType("partial")}
                className={`p-5 rounded-xl border-2 transition-all cursor-pointer relative group ${
                  liburType === "partial"
                    ? "border-blue-500 bg-blue-50/25 shadow-xs"
                    : "border-slate-200 hover:border-blue-300 hover:shadow-xs bg-white"
                }`}
              >
                {/* Radio Circle Indicator */}
                <div className="absolute top-4 right-4 flex items-center justify-center">
                  {liburType === "partial" ? (
                    <div className="w-5 h-5 rounded-full bg-blue-600 border-2 border-blue-600 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-slate-300 bg-white group-hover:border-blue-400 group-hover:scale-105 transition-all" />
                  )}
                </div>

                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                  <Settings2 className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-2">Libur Pengecualian Jadwal</h3>
                <div className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold mb-3">
                  Pilih Jadwal Spesifik
                </div>
                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  Toko tetap beroperasi, namun Anda dapat <strong>meliburkan salah satu atau beberapa jadwal audit</strong>{" "}
                  saja, sementara jadwal audit lainnya tetap berjalan normal.
                </p>
                <div className="flex items-start gap-2 text-[11px] text-slate-500 bg-white/60 p-2.5 rounded-lg border border-slate-100">
                  <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                  <span>Jadwal audit lain di toko yang sama tetap berlangsung sesuai rencana.</span>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 2: PILIH TOKO & PERIODE LIBUR */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs">
            <div className="flex gap-4 mb-6">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                2
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 mb-1">PILIH TOKO & PERIODE LIBUR</h2>
                <p className="text-xs text-slate-500">Tentukan cabang target dan rentang tanggal berlakunya libur.</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Dropdown Pemilihan Toko Multi-Select (Sama dengan Halaman Jadwal) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    TOKO / CABANG TARGET <span className="text-red-500">*</span>
                  </label>
                  {!initialData && (
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
                  <div className="w-full flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus-within:ring-2 focus-within:ring-[#193f53]/20 focus-within:border-[#193f53] transition-all">
                    <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={storeSearch}
                      onFocus={() => setIsStoreDropdownOpen(true)}
                      onChange={(e) => {
                        setStoreSearch(e.target.value);
                        setIsStoreDropdownOpen(true);
                      }}
                      placeholder="Cari atau filter nama toko / cabang..."
                      className="flex-1 bg-transparent outline-none text-slate-800 placeholder:text-slate-400 text-xs"
                    />
                    {storeSearch && (
                      <button
                        type="button"
                        onClick={() => setStoreSearch("")}
                        className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                        title="Hapus pencarian"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsStoreDropdownOpen((v) => !v)}
                      className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title="Buka daftar toko"
                    >
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          isStoreDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </div>

                  {isStoreDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsStoreDropdownOpen(false)} />
                      <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden max-h-56 overflow-y-auto">
                        {/* Header info */}
                        <div className="px-3.5 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                          <span>Daftar Toko ({filteredStores.length} tersedia)</span>
                          {selectedStores.length > 0 && (
                            <span className="text-sky-600 font-bold">{selectedStores.length} toko dipilih</span>
                          )}
                        </div>

                        {/* Pilih semua row */}
                        {!initialData && (
                          <label className="flex items-center gap-3 px-3.5 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              onChange={toggleAllStores}
                              className="w-3.5 h-3.5 rounded accent-[#193f53] cursor-pointer"
                            />
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-slate-700">
                                Pilih Semua Toko ({storeOptions.length} Toko)
                              </p>
                            </div>
                            {allSelected && <Check className="w-3.5 h-3.5 text-sky-600 shrink-0" />}
                          </label>
                        )}

                        {filteredStores.length === 0 ? (
                          <div className="py-6 text-center text-xs text-slate-400">
                            Tidak ada toko yang cocok dengan pencarian &quot;{storeSearch}&quot;
                          </div>
                        ) : (
                          filteredStores.map((store) => {
                            const checked = selectedStores.includes(store.name);
                            return (
                              <label
                                key={store.name}
                                onClick={(e) => {
                                  e.preventDefault();
                                  toggleStore(store.name);
                                }}
                                className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors"
                              >
                                <input
                                  type={initialData ? "radio" : "checkbox"}
                                  name="holidayStoreSelection"
                                  checked={checked}
                                  onChange={() => {}}
                                  className="w-3.5 h-3.5 rounded accent-[#193f53] cursor-pointer"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-slate-800 truncate">{store.name}</p>
                                  <p className="text-[10px] text-slate-400">{store.location}</p>
                                </div>
                                {checked && <Check className="w-3.5 h-3.5 text-sky-600 shrink-0" />}
                              </label>
                            );
                          })
                        )}
                      </div>
                    </>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5">
                  Pilih satu atau beberapa cabang toko yang akan diberlakukan jadwal libur.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-2 uppercase tracking-wider">
                    TANGGAL MULAI LIBUR <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="date"
                      disabled={selectedStores.length === 0}
                      min={todayStr}
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        if (e.target.value) {
                          const d = new Date(e.target.value);
                          if (!isNaN(d.getTime())) {
                            setCalendarMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                          }
                        }
                        if (endDate && e.target.value > endDate) {
                          setEndDate(e.target.value);
                        }
                      }}
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#193f53]/20 focus:border-[#193f53] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                    />
                  </div>
                  {isDateInPast && (
                    <p className="text-[10px] text-red-500 mt-1.5 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" /> Tanggal tidak boleh di masa lampau (sudah terlewat).
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-2 uppercase tracking-wider">
                    TANGGAL SELESAI LIBUR <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="date"
                      disabled={selectedStores.length === 0}
                      min={startDate || todayStr}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#193f53]/20 focus:border-[#193f53] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                    />
                  </div>
                  {isEndBeforeStart && (
                    <p className="text-[10px] text-red-500 mt-1.5 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" /> Tanggal selesai tidak boleh lebih awal dari tanggal mulai.
                    </p>
                  )}
                </div>
              </div>

              {/* KALENDER INTERAKTIF KOMPAK */}
              <div className="p-3 sm:p-3.5 bg-slate-50/90 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-[11px] font-bold text-slate-900">Peta Libur & Pilih Tanggal</h3>
                        {selectedStores.length > 0 && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {selectedStores.length === 1 ? selectedStores[0] : `${selectedStores.length} Toko Dipilih`}
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] text-slate-500">
                        {selectedStores.length > 0
                          ? "Klik tanggal pada kotak untuk memilih periode libur."
                          : "Pilih cabang toko di atas untuk mengaktifkan kalender."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <div className="flex items-center bg-white border border-slate-200 rounded-md p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setCalendarMonth(new Date(cYear, cMonth - 1, 1))}
                        className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors cursor-pointer"
                        title="Bulan Sebelumnya"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                      <span className="px-2 text-[11px] font-bold text-slate-800 whitespace-nowrap min-w-[95px] text-center">
                        {monthNames[cMonth]} {cYear}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCalendarMonth(new Date(cYear, cMonth + 1, 1))}
                        className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors cursor-pointer"
                        title="Bulan Berikutnya"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setCalendarMonth(new Date())}
                      className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-md text-[9px] font-semibold transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Kembali ke bulan saat ini"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Bulan Ini</span>
                    </button>
                  </div>
                </div>

                {/* Day Labels */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {dayNames.map((d, idx) => (
                    <div
                      key={d}
                      className={`text-[9px] font-bold py-0.5 ${idx === 0 ? "text-red-500" : "text-slate-500"}`}
                    >
                      {d}
                    </div>
                  ))}

                  {/* Previous month days */}
                  {prevMonthDays.map((d, i) => (
                    <div
                      key={`prev-${i}`}
                      className="h-9 sm:h-9.5 rounded-lg border border-transparent bg-slate-100/40 text-slate-300 flex items-center justify-center text-[10px] font-medium cursor-not-allowed"
                    >
                      <span>{d}</span>
                    </div>
                  ))}

                  {/* Current month days */}
                  {currentMonthDays.map((d) => {
                    const dateStr = `${cYear}-${String(cMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                    const holidaysOnDate = existingHolidays.filter((h) => {
                      if (selectedStores.length === 0) return false;
                      if (h.status === "Dibatalkan") return false;
                      if (initialData && h.id === initialData.id) return false;
                      if (!selectedStores.includes(h.storeName)) return false;
                      const hStart = h.startDate;
                      const hEnd = h.endDate || h.startDate;
                      return dateStr >= hStart && dateStr <= hEnd;
                    });

                    const isFullHoliday = holidaysOnDate.some((h) => h.liburType === "full" || !h.liburType);
                    const isPartialHoliday = !isFullHoliday && holidaysOnDate.some((h) => h.liburType === "partial");

                    const isPast = dateStr < todayStr;
                    const isToday = dateStr === todayStr;
                    const isSelectedStart = startDate === dateStr;
                    const isSelectedEnd = endDate === dateStr;
                    const isInRange = Boolean(startDate && endDate && dateStr >= startDate && dateStr <= endDate);

                    let cellCls =
                      "bg-white text-slate-700 hover:bg-blue-50/70 hover:border-blue-300 hover:text-blue-700 border-slate-200 cursor-pointer shadow-2xs";

                    if (selectedStores.length === 0) {
                      cellCls = "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-60";
                    } else if (isPast) {
                      cellCls = "bg-slate-100/60 text-slate-300 border-slate-100 cursor-not-allowed";
                    } else if (isFullHoliday) {
                      cellCls = "bg-red-500 text-white font-bold border-red-600 shadow-xs hover:bg-red-600 cursor-pointer";
                      if (isInRange) cellCls += " ring-2 ring-blue-600 ring-offset-1";
                    } else if (isPartialHoliday) {
                      cellCls =
                        "bg-amber-300 text-amber-950 font-bold border-amber-400 shadow-xs hover:bg-amber-400 cursor-pointer";
                      if (isInRange) cellCls += " ring-2 ring-blue-600 ring-offset-1";
                    } else if (isInRange) {
                      if (isSelectedStart || isSelectedEnd) {
                        cellCls = "bg-[#193f53] text-white font-bold border-[#193f53] shadow-xs cursor-pointer";
                      } else {
                        cellCls = "bg-blue-100/80 text-blue-900 font-semibold border-blue-200 cursor-pointer";
                      }
                    } else if (isToday) {
                      cellCls = "bg-white text-blue-700 font-bold border-blue-400 ring-1 ring-blue-400 cursor-pointer";
                    }

                    return (
                      <button
                        type="button"
                        key={d}
                        disabled={selectedStores.length === 0 || isPast}
                        onClick={() => handleCalendarDateClick(dateStr)}
                        className={`h-9 sm:h-9.5 rounded-lg border flex flex-col items-center justify-center relative transition-all text-[11px] ${cellCls}`}
                      >
                        <span>{d}</span>
                        {isToday && !isInRange && !isFullHoliday && !isPartialHoliday && (
                          <div className="w-1 h-1 rounded-full bg-blue-600 absolute bottom-1" />
                        )}
                      </button>
                    );
                  })}

                  {/* Next month days */}
                  {nextMonthDays.map((d, i) => (
                    <div
                      key={`next-${i}`}
                      className="h-9 sm:h-9.5 rounded-lg border border-transparent bg-slate-100/40 text-slate-300 flex items-center justify-center text-[10px] font-medium cursor-not-allowed"
                    >
                      <span>{d}</span>
                    </div>
                  ))}
                </div>

                {/* Legend Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 text-[10px] text-slate-500">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded bg-[#193f53]" />
                      <span>Rentang Pilihan</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded bg-red-500" />
                      <span>Libur Penuh (Tutup)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded bg-amber-400" />
                      <span>Libur Sebagian</span>
                    </div>
                  </div>
                  {startDate && endDate && (
                    <span className="font-semibold text-slate-700">
                      Terpilih: {startDate === endDate ? startDate : `${startDate} s/d ${endDate}`}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    ALASAN LIBUR / KETERANGAN PENGECUALIAN <span className="text-red-500">*</span>
                  </label>
                  <span
                    className={`text-[10px] font-semibold ${
                      reason.length >= MAX_REASON_LENGTH
                        ? "text-rose-500"
                        : reason.length >= MAX_REASON_LENGTH * 0.8
                        ? "text-amber-600"
                        : "text-slate-400"
                    }`}
                  >
                    {reason.length} / {MAX_REASON_LENGTH} karakter
                  </span>
                </div>
                <textarea
                  rows={3}
                  maxLength={MAX_REASON_LENGTH}
                  value={reason}
                  onChange={(e) => setReason(e.target.value.slice(0, MAX_REASON_LENGTH))}
                  placeholder={`Masukkan alasan libur atau keterangan pengecualian (maksimal ${MAX_REASON_LENGTH} karakter)...`}
                  className={`w-full px-4 py-2.5 bg-white border rounded-lg text-xs font-medium focus:outline-none focus:ring-2 transition-all resize-none ${
                    reason.length >= MAX_REASON_LENGTH
                      ? "border-amber-300 focus:ring-amber-500/20 focus:border-amber-500"
                      : "border-slate-200 focus:ring-[#193f53]/20 focus:border-[#193f53]"
                  }`}
                />
                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5">
                  <p>Alasan ini akan tercatat di log riwayat dan kalender penugasan auditor lapangan.</p>
                  {reason.length >= MAX_REASON_LENGTH && (
                    <span className="text-rose-500 font-semibold shrink-0">Batas maksimal tercapai</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* STEP 3: SCHEDULE CONFIGURATION */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs">
            {liburType === null ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
                  <Calendar className="w-5 h-5 text-slate-400" />
                </div>
                <h3 className="text-sm font-bold text-slate-700 mb-1">Pilih Tipe Libur</h3>
                <p className="text-xs text-slate-500">Silakan pilih tipe libur toko pada Langkah 1 terlebih dahulu.</p>
              </div>
            ) : selectedStores.length === 0 || startDate === "" ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
                  <Store className="w-5 h-5 text-slate-400" />
                </div>
                <h3 className="text-sm font-bold text-slate-700 mb-1">Lengkapi Data Cabang & Tanggal</h3>
                <p className="text-xs text-slate-500">
                  Silakan pilih target cabang toko dan tanggal mulai libur pada Langkah 2 terlebih dahulu.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                  <div className="flex gap-4">
                    <div
                      className={`w-8 h-8 rounded-full ${
                        liburType === "full" ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
                      } flex items-center justify-center font-bold text-sm shrink-0`}
                    >
                      3
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 mb-1">
                        {liburType === "full"
                          ? "STATUS SELURUH JADWAL AUDIT CABANG"
                          : "PILIH JADWAL SPESIFIK YANG DILIBURKAN"}
                      </h2>
                      <p className="text-xs text-slate-500">
                        {liburType === "full"
                          ? "Toko libur penuh: Seluruh jadwal otomatis dinonaktifkan tanpa perlu konfigurasi individual."
                          : "Centang jadwal audit yang ingin diliburkan. Jadwal yang tidak dicentang tetap berstatus aktif."}
                      </p>
                    </div>
                  </div>

                  {liburType === "full" ? (
                    <div className="px-2.5 py-1 bg-red-50 text-red-600 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 flex items-center gap-1.5 border border-red-100">
                      <CalendarOff className="w-3 h-3" /> Semua Jadwal Nonaktif
                    </div>
                  ) : (
                    <div className="flex gap-3 text-[11px] font-semibold shrink-0">
                      <button
                        onClick={() => setSelectedSchedules(["1", "2", "3", "4"])}
                        className="text-blue-600 hover:text-blue-700 cursor-pointer"
                      >
                        Pilih Semua
                      </button>
                      <button
                        onClick={() => setSelectedSchedules([])}
                        className="text-red-600 hover:text-red-700 cursor-pointer transition-colors"
                      >
                        Hapus Semua
                      </button>
                    </div>
                  )}
                </div>

                {/* Alert Info Box */}
                {isFullConflict ? (
                  <div className="flex items-start gap-3 p-4 rounded-xl border mb-5 bg-red-50/50 border-red-200 text-red-800">
                    <div className="mt-0.5">
                      <XCircle className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold mb-1">Toko Sudah Diliburkan Penuh</h4>
                      <p className="text-[11px] opacity-90 leading-relaxed">
                        Salah satu cabang toko yang Anda pilih sudah memiliki jadwal libur penuh (Full) pada rentang
                        tanggal ini.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`flex items-start gap-3 p-4 rounded-xl border mb-5 ${
                      liburType === "full"
                        ? "bg-orange-50/50 border-orange-200 text-orange-800"
                        : "bg-blue-50/50 border-blue-200 text-blue-800"
                    }`}
                  >
                    <div className="mt-0.5">
                      {liburType === "full" ? (
                        <CalendarOff className="w-5 h-5 text-orange-500" />
                      ) : (
                        <Info className="w-5 h-5 text-blue-500" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold mb-1">
                        {liburType === "full"
                          ? "Mode Libur Toko Penuh (Full) Aktif"
                          : "Mode Pengecualian Aktif: Anda hanya meliburkan jadwal terpilih di bawah ini."}
                      </h4>
                      <p className="text-[11px] opacity-90 leading-relaxed">
                        {liburType === "full"
                          ? "Semua jadwal audit di cabang toko terpilih akan otomatis dinonaktifkan/diliburkan penuh pada tanggal yang ditentukan."
                          : "Auditor untuk jadwal lain pada hari tersebut akan tetap menerima tugas seperti biasa."}
                      </p>
                    </div>
                  </div>
                )}

                {isTodayAllShiftsPassed && (
                  <div className="flex items-start gap-3 p-4 rounded-xl border mb-5 bg-amber-50/70 border-amber-200 text-amber-900">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold mb-1">Seluruh Jam Audit Hari Ini Telah Terlewat</h4>
                      <p className="text-[11px] opacity-90 leading-relaxed">
                        Semua shift jam audit untuk hari ini telah selesai atau terlewat. Silakan pilih tanggal besok atau
                        setelahnya.
                      </p>
                    </div>
                  </div>
                )}

                {!isTodayAllShiftsPassed && hasNoAvailableSchedules && liburType === "partial" && startDate === todayStr && (
                  <div className="flex items-start gap-3 p-4 rounded-xl border mb-5 bg-amber-50/70 border-amber-200 text-amber-900">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold mb-1">Shift Jam Audit Telah Terlewat</h4>
                      <p className="text-[11px] opacity-90 leading-relaxed">
                        Shift audit yang Anda pilih untuk hari ini sudah terlewat jam mulainya. Tidak dapat menambahkan
                        pengecualian libur untuk jam yang sudah berlalu.
                      </p>
                    </div>
                  </div>
                )}

                {/* Schedules List */}
                {!isFullConflict && (
                  <div className="space-y-3">
                    {schedules.map((schedule) => {
                      const isTaken = takenSchedules.includes(schedule.id);
                      const isUnavailable = unavailableScheduleIds.includes(schedule.id);
                      const isExpired = isUnavailable && !isTaken;
                      const isLibur = isUnavailable || liburType === "full" || activeSelected.includes(schedule.id);

                      return (
                        <div
                          key={schedule.id}
                          onClick={() => liburType === "partial" && !isUnavailable && toggleSchedule(schedule.id)}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border transition-colors ${
                            liburType === "partial" && !isUnavailable ? "cursor-pointer" : ""
                          } ${
                            isUnavailable
                              ? "border-slate-200 bg-slate-50 opacity-60 grayscale"
                              : isLibur
                              ? "border-red-200 bg-red-50/30"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            {liburType === "partial" && (
                              <div
                                className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                  isLibur ? "bg-red-500 border-red-500 text-white" : "border-slate-300 bg-white"
                                }`}
                              >
                                {isLibur && <Check className="w-3.5 h-3.5" />}
                              </div>
                            )}
                            {liburType === "full" && (
                              <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                                <CalendarOff className="w-4 h-4" />
                              </div>
                            )}

                            <div>
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h4 className="text-xs font-bold text-slate-900">{schedule.name}</h4>
                                {isUnavailable ? (
                                  <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-slate-200 text-slate-600">
                                    {isExpired ? "SUDAH TERLEWAT" : "SUDAH DILIBURKAN"}
                                  </span>
                                ) : (
                                  <span
                                    className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded ${
                                      isLibur ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-700"
                                    }`}
                                  >
                                    {isLibur ? "AKAN DILIBURKAN" : "TETAP BERJALAN"}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {schedule.time}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Check className="w-3 h-3" /> {schedule.desc}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isUnavailable ? null : isLibur ? (
                              <span className="flex items-center gap-1.5 text-xs font-bold text-red-500">
                                <XCircle className="w-4 h-4" /> Libur
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                                <Check className="w-4 h-4" /> Berjalan
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Sidebar Summary (Right) */}
        <div className="w-full lg:w-[320px] xl:w-[360px] shrink-0">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-[#193f53]" />
                <h3 className="text-xs font-bold text-slate-900">RINGKASAN DAMPAK</h3>
              </div>
              <div
                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                  liburType === null
                    ? "bg-slate-100 text-slate-500"
                    : liburType === "full"
                    ? "bg-orange-100 text-orange-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {liburType === null ? "BELUM DIPILIH" : liburType === "full" ? "LIBUR PENUH" : "PENGECUALIAN"}
              </div>
            </div>

            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">Toko Terpilih</span>
                  <span
                    className={`font-bold ${
                      selectedStores.length === 0 ? "text-slate-400" : "text-slate-900"
                    }`}
                  >
                    {selectedStores.length === 0
                      ? "Belum dipilih"
                      : selectedStores.length === 1
                      ? selectedStores[0]
                      : `${selectedStores.length} Toko Dipilih`}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">Lokasi</span>
                  <span
                    className={`font-medium ${
                      selectedStores.length === 0 ? "text-slate-400" : "text-slate-700"
                    }`}
                  >
                    {selectedStores.length === 0
                      ? "-"
                      : selectedStores.length === 1
                      ? storeOptions.find((s) => s.name === selectedStores[0])?.location || "Lokasi Toko"
                      : `${selectedStores.length} Cabang Terpilih`}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">Periode Libur</span>
                  <span className={`font-bold ${!startDate ? "text-slate-400" : "text-slate-900"}`}>
                    {!startDate ? "-" : startDate + (endDate && endDate !== startDate ? ` s/d ${endDate}` : "")}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-5">
              <h4 className="text-[10px] font-bold text-slate-500 mb-4 uppercase tracking-wider text-center">
                STATUS JADWAL AUDIT DI CABANG INI
              </h4>

              <div className="flex justify-between items-end mb-4">
                <div className="text-center flex-1">
                  <div className="text-3xl font-extrabold text-red-500 leading-none mb-1">{diliburkanCount}</div>
                  <div className="text-[10px] font-semibold text-red-600">Jadwal Diliburkan</div>
                </div>
                <div className="w-px h-10 bg-slate-200 mx-2" />
                <div className="text-center flex-1">
                  <div className="text-3xl font-extrabold text-emerald-500 leading-none mb-1">{berjalanCount}</div>
                  <div className="text-[10px] font-semibold text-emerald-600">Tetap Berjalan</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 rounded-full flex overflow-hidden mb-2">
                <div
                  className="h-full bg-red-500 transition-all duration-500"
                  style={{ width: `${(diliburkanCount / 4) * 100}%` }}
                />
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${(berjalanCount / 4) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-bold text-slate-400">
                <span className={diliburkanCount > 0 ? "text-red-500" : ""}>
                  {Math.round((diliburkanCount / 4) * 100)}% Diliburkan
                </span>
                <span className={berjalanCount > 0 ? "text-emerald-500" : ""}>
                  {Math.round((berjalanCount / 4) * 100)}% Berjalan
                </span>
              </div>

              <div className="mt-5 p-3 rounded-lg bg-yellow-50 border border-yellow-100 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-yellow-800 leading-relaxed">
                  Semua auditor penanggung jawab akan tercatat di log data untuk penyesuaian jadwal berikutnya.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Footer Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-4 px-6 flex flex-col sm:flex-row items-center justify-between gap-4 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] lg:pl-[280px]">
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <Info className="w-4 h-4 text-blue-500 shrink-0" />
          <span className="hidden sm:inline">
            Pastikan semua data dan cabang toko yang diliburkan telah sesuai dengan rencana operasional.
          </span>
          <span className="sm:hidden">Pastikan data sesuai sebelum menyimpan.</span>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            className="flex-1 sm:flex-none text-center px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSaveClick}
            disabled={isSaveDisabled}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-xs font-semibold transition-all shadow-md ${
              isSaveDisabled
                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                : "bg-[#193f53] hover:bg-[#143343] active:scale-[0.98] text-white cursor-pointer"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>
                  {initialData
                    ? "Menyimpan Perubahan..."
                    : selectedStores.length > 1
                    ? `Menyimpan (${selectedStores.length} Toko)...`
                    : "Menyimpan Libur..."}
                </span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>
                  {initialData
                    ? "Simpan Perubahan"
                    : selectedStores.length > 1
                    ? `Simpan Libur (${selectedStores.length} Toko)`
                    : "Simpan Libur Toko"}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
