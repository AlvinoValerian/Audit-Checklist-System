import React, { useState, useEffect } from "react";
import { ArrowLeft, CalendarOff, Settings2, AlertTriangle, ShieldAlert, Calendar, Clock, Store, Check, Info, XCircle } from "lucide-react";
import { HolidayService } from "@/services/holiday.service";
import { Holiday } from "@/types/holiday";

interface CreateHolidayViewProps {
  initialData?: Holiday | null;
  onBack: () => void;
  onSave: (data: any) => void;
}

export default function CreateHolidayView({ initialData, onBack, onSave }: CreateHolidayViewProps) {
  const [liburType, setLiburType] = useState<"full" | "partial" | null>(initialData ? (initialData.liburType || "full") : null);
  const [selectedSchedules, setSelectedSchedules] = useState<string[]>(initialData?.schedules || []);
  const [selectedStore, setSelectedStore] = useState(initialData?.storeName || "");
  const [startDate, setStartDate] = useState(initialData?.startDate || "");
  const [endDate, setEndDate] = useState(initialData?.endDate || "");
  const [reason, setReason] = useState(initialData?.reason || "");
  const [existingHolidays, setExistingHolidays] = useState<any[]>([]);

  useEffect(() => {
    setExistingHolidays(HolidayService.getAll());
  }, []);

  const storeNameValue = selectedStore === "sudirman" ? "Cabang Sudirman" : selectedStore === "thamrin" ? "Cabang Thamrin" : selectedStore;

  const conflictingHolidays = existingHolidays.filter(h => {
    if (h.status === "Dibatalkan" || !selectedStore || !startDate) return false;
    if (initialData && h.id === initialData.id) return false; // Ignore itself when editing
    if (h.storeName !== storeNameValue) return false;
    const hStart = new Date(h.startDate);
    const hEnd = new Date(h.endDate);
    const sStart = new Date(startDate);
    const sEnd = new Date(endDate || startDate);
    return sStart <= hEnd && sEnd >= hStart;
  });

  const isFullConflict = conflictingHolidays.some(h => h.liburType === "full" || !h.liburType);
  const takenSchedules = conflictingHolidays.filter(h => h.liburType === "partial").flatMap(h => h.schedules || []);

  const handleSaveClick = () => {
    if (!selectedStore || !startDate || !endDate || !reason) {
      alert("Mohon lengkapi semua field yang wajib diisi!");
      return;
    }
    if (isFullConflict) {
      alert("Toko sudah diliburkan penuh pada tanggal ini. Tidak dapat menyimpan jadwal.");
      return;
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    const durationDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    
    onSave({
      storeName: storeNameValue,
      storeLocation: initialData?.storeLocation || "Jakarta Pusat",
      startDate,
      endDate,
      durationDays,
      reason,
      createdBy: initialData?.createdBy || "Admin",
      creatorRole: initialData?.creatorRole || "Admin",
      status: initialData?.status || "Terjadwal",
      liburType,
      schedules: liburType === "partial" ? selectedSchedules : []
    });
  };

  const toggleSchedule = (id: string) => {
    if (takenSchedules.includes(id)) return;
    if (selectedSchedules.includes(id)) {
      setSelectedSchedules(selectedSchedules.filter(s => s !== id));
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

  const unavailableScheduleIds = schedules.filter(schedule => {
    if (takenSchedules.includes(schedule.id)) return true;
    if (startDate) {
      const now = new Date();
      const [startH, startM] = schedule.time.split(" - ")[0].split(":").map(Number);
      
      const checkDate = new Date(startDate);
      const sYear = checkDate.getFullYear();
      const sMonth = checkDate.getMonth();
      const sDate = checkDate.getDate();
      
      const nYear = now.getFullYear();
      const nMonth = now.getMonth();
      const nDate = now.getDate();
      
      if (sYear < nYear || (sYear === nYear && sMonth < nMonth) || (sYear === nYear && sMonth === nMonth && sDate < nDate)) {
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
  }).map(s => s.id);

  // For "full", all are selected automatically in the UI logic.
  const activeSelectedRaw = liburType === "full" ? ["1", "2", "3", "4"] : selectedSchedules;
  const activeSelected = activeSelectedRaw.filter(id => !unavailableScheduleIds.includes(id));
  const diliburkanCount = (liburType === null || selectedStore === "" || startDate === "") ? 0 : activeSelected.length;
  const berjalanCount = (liburType === null || selectedStore === "" || startDate === "") ? 0 : 4 - diliburkanCount - unavailableScheduleIds.length;

  const isSaveDisabled = isFullConflict || 
    !selectedStore || 
    !startDate || 
    !endDate || 
    !reason || 
    liburType === null || 
    (liburType === "partial" && selectedSchedules.length === 0);

  return (
    <div className="pb-24">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
          <button onClick={onBack} className="hover:text-blue-600 transition-colors cursor-pointer">Libur Toko & Pengecualian</button>
          <span>/</span>
          <span className="text-slate-900">{initialData ? "Edit Libur Toko" : "Tambah Libur Toko"}</span>
        </div>
        <button 
          onClick={onBack}
          className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali ke Daftar
        </button>
      </div>

      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
          {initialData ? "Edit Libur Toko & Pengecualian Jadwal" : "Tambah Libur Toko & Pengecualian Jadwal"}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Konfigurasikan hari libur operasional penuh toko atau tentukan pengecualian libur pada jadwal audit tertentu.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Main Form Area (Left) */}
        <div className="flex-1 w-full flex flex-col gap-6">
          
          {/* STEP 1: PILIH TIPE LIBUR TOKO */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">1</div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 mb-1">PILIH TIPE LIBUR TOKO</h2>
                  <p className="text-xs text-slate-500">Tentukan cakupan libur: libur penuh seluruh jadwal atau pengecualian jadwal tertentu.</p>
                </div>
              </div>
              <div className="px-2.5 py-1 bg-red-50 text-red-600 rounded text-[10px] font-bold uppercase tracking-wider shrink-0">Wajib Dipilih</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full Holiday Option */}
              <div 
                onClick={() => setLiburType("full")}
                className={`relative p-5 rounded-xl border-2 transition-all cursor-pointer ${
                  liburType === "full" ? 'border-blue-600 bg-blue-50/30' : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {liburType === "full" && (
                  <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  </div>
                )}
                {liburType !== "full" && (
                  <div className="absolute top-4 right-4 w-5 h-5 rounded-full border-2 border-slate-300"></div>
                )}

                <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center mb-4">
                  <CalendarOff className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-2">Libur Toko Penuh (Full)</h3>
                <div className="inline-block px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] font-bold mb-3">Semua Jadwal Libur</div>
                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  Toko tutup operasional secara total. <strong>Seluruh jadwal audit</strong> (pagi, siang, malam) pada toko ini akan otomatis dinonaktifkan/diliburkan pada tanggal tersebut.
                </p>
                <div className="flex items-start gap-2 text-[11px] text-slate-500 bg-white/60 p-2.5 rounded-lg border border-slate-100">
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                  <span>Cocok untuk: Renovasi, Libur Nasional, Banjir / Force Majeure.</span>
                </div>
              </div>

              {/* Partial Holiday Option */}
              <div 
                onClick={() => setLiburType("partial")}
                className={`relative p-5 rounded-xl border-2 transition-all cursor-pointer ${
                  liburType === "partial" ? 'border-blue-600 bg-blue-50/30' : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {liburType === "partial" && (
                  <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  </div>
                )}
                {liburType !== "partial" && (
                  <div className="absolute top-4 right-4 w-5 h-5 rounded-full border-2 border-slate-300"></div>
                )}

                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
                  <Settings2 className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-2">Libur Pengecualian Jadwal</h3>
                <div className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold mb-3">Pilih Jadwal Spesifik</div>
                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  Toko tetap beroperasi, namun Anda dapat <strong>meliburkan salah satu atau beberapa jadwal audit</strong> saja, sementara jadwal audit lainnya tetap berjalan normal.
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
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">2</div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 mb-1">PILIH TOKO & PERIODE LIBUR</h2>
                <p className="text-xs text-slate-500">Tentukan toko cabang target dan rentang tanggal berlakunya libur.</p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-2 uppercase tracking-wider">
                  TOKO / CABANG TARGET <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select 
                    value={selectedStore}
                    onChange={(e) => setSelectedStore(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#193f53]/20 focus:border-[#193f53] appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Pilih cabang toko...</option>
                    <option value="sudirman">Cabang Sudirman — Jakarta Pusat (4 Jadwal Audit Aktif)</option>
                    <option value="thamrin">Cabang Thamrin — Jakarta Pusat (3 Jadwal Audit Aktif)</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5">Pilih cabang toko yang akan diberlakukan penetapan libur atau pengecualian.</p>
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
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#193f53]/20 focus:border-[#193f53]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-2 uppercase tracking-wider">
                    TANGGAL SELESAI LIBUR <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="date" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#193f53]/20 focus:border-[#193f53]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-2 uppercase tracking-wider">
                  ALASAN LIBUR / KETERANGAN PENGECUALIAN <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Masukkan alasan libur atau keterangan pengecualian..."
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#193f53]/20 focus:border-[#193f53]"
                />
                <p className="text-[10px] text-slate-500 mt-1.5">Alasan ini akan tercatat di log riwayat dan kalender penugasan auditor lapangan.</p>
              </div>
            </div>
          </div>

          {/* STEP 3: SCHEDULE CONFIGURATION (DYNAMIC BASED ON MODE) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs">
            {liburType === null ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
                  <Calendar className="w-5 h-5 text-slate-400" />
                </div>
                <h3 className="text-sm font-bold text-slate-700 mb-1">Pilih Tipe Libur</h3>
                <p className="text-xs text-slate-500">Silakan pilih tipe libur toko pada Langkah 1 terlebih dahulu.</p>
              </div>
            ) : (selectedStore === "" || startDate === "") ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
                  <Store className="w-5 h-5 text-slate-400" />
                </div>
                <h3 className="text-sm font-bold text-slate-700 mb-1">Lengkapi Data Cabang & Tanggal</h3>
                <p className="text-xs text-slate-500">Silakan pilih target cabang toko dan tanggal mulai libur pada Langkah 2 terlebih dahulu.</p>
              </div>
            ) : (
              <>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
              <div className="flex gap-4">
                <div className={`w-8 h-8 rounded-full ${liburType === 'full' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'} flex items-center justify-center font-bold text-sm shrink-0`}>3</div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 mb-1">
                    {liburType === "full" ? "STATUS SELURUH JADWAL AUDIT CABANG" : "PILIH JADWAL SPESIFIK YANG DILIBURKAN"}
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
                  <button onClick={() => setSelectedSchedules(["1", "2", "3", "4"])} className="text-blue-600 hover:text-blue-700 cursor-pointer">Pilih Semua</button>
                  <button onClick={() => setSelectedSchedules([])} className="text-slate-500 hover:text-slate-700 cursor-pointer">Hapus Semua</button>
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
                    Toko ini sudah memiliki jadwal libur penuh (Full) pada rentang tanggal yang Anda pilih. Anda tidak dapat menambahkan jadwal libur atau pengecualian baru pada tanggal tersebut.
                  </p>
                </div>
              </div>
            ) : (
              <div className={`flex items-start gap-3 p-4 rounded-xl border mb-5 ${
                liburType === 'full' 
                  ? 'bg-orange-50/50 border-orange-200 text-orange-800' 
                  : 'bg-blue-50/50 border-blue-200 text-blue-800'
              }`}>
                <div className="mt-0.5">
                  {liburType === "full" ? <CalendarOff className="w-5 h-5 text-orange-500" /> : <Info className="w-5 h-5 text-blue-500" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold mb-1">
                    {liburType === "full" ? "Mode Libur Toko Penuh (Full) Aktif" : "Mode Pengecualian Aktif: Anda hanya meliburkan jadwal terpilih di bawah ini."}
                  </h4>
                  <p className="text-[11px] opacity-90 leading-relaxed">
                    {liburType === "full" 
                      ? "Semua 4 jadwal audit di Cabang ini akan otomatis dinonaktifkan/diliburkan penuh pada tanggal yang dipilih." 
                      : "Auditor untuk jadwal lain pada hari tersebut akan tetap menerima tugas seperti biasa."}
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
                      liburType === "partial" && !isUnavailable ? 'cursor-pointer' : ''
                    } ${
                      isUnavailable ? 'border-slate-200 bg-slate-50 opacity-60 grayscale' :
                      isLibur 
                        ? 'border-red-200 bg-red-50/30' 
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Checkbox (only for partial) */}
                      {liburType === "partial" && (
                        <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          isLibur ? 'bg-red-500 border-red-500 text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {isLibur && <Check className="w-3.5 h-3.5" />}
                        </div>
                      )}
                      {/* Icon for full */}
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
                            <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded ${
                              isLibur ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {isLibur ? 'AKAN DILIBURKAN' : 'TETAP BERJALAN'}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {schedule.time}</span>
                          <span className="flex items-center gap-1"><Check className="w-3 h-3" /> {schedule.desc}</span>
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
              <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                liburType === null ? 'bg-slate-100 text-slate-500' :
                liburType === 'full' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {liburType === null ? 'BELUM DIPILIH' : liburType === 'full' ? 'LIBUR PENUH' : 'PENGECUALIAN'}
              </div>
            </div>
            
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">Toko Terpilih</span>
                  <span className={`font-bold ${!selectedStore ? 'text-slate-400' : 'text-slate-900'}`}>{!selectedStore ? 'Belum dipilih' : selectedStore === 'sudirman' ? 'Cabang Sudirman' : 'Cabang Thamrin'}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">Lokasi</span>
                  <span className={`font-medium ${!selectedStore ? 'text-slate-400' : 'text-slate-700'}`}>{!selectedStore ? '-' : 'Jakarta Pusat'}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">Periode Libur</span>
                  <span className={`font-bold ${!startDate ? 'text-slate-400' : 'text-slate-900'}`}>{!startDate ? '-' : startDate + (endDate && endDate !== startDate ? ` s/d ${endDate}` : '')}</span>
                </div>
              </div>
            </div>

            <div className="p-5">
              <h4 className="text-[10px] font-bold text-slate-500 mb-4 uppercase tracking-wider text-center">STATUS JADWAL AUDIT DI CABANG INI</h4>
              
              <div className="flex justify-between items-end mb-4">
                <div className="text-center flex-1">
                  <div className="text-3xl font-extrabold text-red-500 leading-none mb-1">{diliburkanCount}</div>
                  <div className="text-[10px] font-semibold text-red-600">Jadwal Diliburkan</div>
                </div>
                <div className="w-px h-10 bg-slate-200 mx-2"></div>
                <div className="text-center flex-1">
                  <div className="text-3xl font-extrabold text-emerald-500 leading-none mb-1">{berjalanCount}</div>
                  <div className="text-[10px] font-semibold text-emerald-600">Tetap Berjalan</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 rounded-full flex overflow-hidden mb-2">
                <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${(diliburkanCount / 4) * 100}%` }}></div>
                <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(berjalanCount / 4) * 100}%` }}></div>
              </div>
              <div className="flex justify-between text-[9px] font-bold text-slate-400">
                <span className={diliburkanCount > 0 ? 'text-red-500' : ''}>{Math.round((diliburkanCount / 4) * 100)}% Diliburkan</span>
                <span className={berjalanCount > 0 ? 'text-emerald-500' : ''}>{Math.round((berjalanCount / 4) * 100)}% Berjalan</span>
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
          <span className="hidden sm:inline">Pastikan semua data dan jadwal yang diliburkan telah sesuai dengan jadwal toko sebenarnya.</span>
          <span className="sm:hidden">Pastikan data sesuai sebelum menyimpan.</span>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={onBack}
            className="flex-1 sm:flex-none text-center px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button 
            onClick={handleSaveClick}
            disabled={isSaveDisabled}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-xs font-semibold transition-colors shadow-md ${
              isSaveDisabled ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-[#193f53] hover:bg-[#143343] text-white cursor-pointer'
            }`}
          >
            <Check className="w-4 h-4" />
            {initialData ? "Simpan Perubahan" : "Simpan Libur Toko"}
          </button>
        </div>
      </div>
    </div>
  );
}
