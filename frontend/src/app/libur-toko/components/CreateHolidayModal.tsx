"use client";

import React, { useState } from "react";
import Modal from "@/components/ui/Modal";
import { Plus, Store, Calendar, AlignLeft, User } from "lucide-react";
import { HolidayStatus } from "@/types/holiday";

interface CreateHolidayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export default function CreateHolidayModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateHolidayModalProps) {
  const [storeName, setStoreName] = useState("");
  const [storeLocation, setStoreLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<HolidayStatus>("Terjadwal");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calculate simple duration
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    onSubmit({
      storeName,
      storeLocation,
      startDate,
      endDate,
      durationDays,
      reason,
      status,
      createdBy: "Admin Utama", // mockup
      creatorRole: "Admin", // mockup
    });
    
    // Reset form
    setStoreName("");
    setStoreLocation("");
    setStartDate("");
    setEndDate("");
    setReason("");
    setStatus("Terjadwal");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tambah Jadwal Libur"
      subtitle="Buat jadwal operasional khusus atau libur toko baru"
      icon={<Plus className="w-5 h-5" />}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Nama Toko</label>
            <div className="relative">
              <Store className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Contoh: Cabang Sudirman"
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#193f53]/20 focus:border-[#193f53] transition-colors"
              />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Lokasi / Kota</label>
            <div className="relative">
              <input
                type="text"
                required
                value={storeLocation}
                onChange={(e) => setStoreLocation(e.target.value)}
                placeholder="Contoh: Jakarta Pusat"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#193f53]/20 focus:border-[#193f53] transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Tanggal Mulai</label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#193f53]/20 focus:border-[#193f53] transition-colors cursor-pointer"
              />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Tanggal Berakhir</label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#193f53]/20 focus:border-[#193f53] transition-colors cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as HolidayStatus)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#193f53]/20 focus:border-[#193f53] transition-colors cursor-pointer"
          >
            <option value="Terjadwal">Terjadwal</option>
            <option value="Selesai">Selesai</option>
            <option value="Dibatalkan">Dibatalkan</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">Alasan Libur</label>
          <div className="relative">
            <AlignLeft className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Renovasi Tahunan Toko"
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#193f53]/20 focus:border-[#193f53] transition-colors resize-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold text-white bg-[#193f53] rounded-lg hover:bg-[#143343] transition-colors shadow-2xs cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Simpan Jadwal
          </button>
        </div>
      </form>
    </Modal>
  );
}
