"use client";

import React from "react";

/**
 * Skeleton untuk daftar kartu jadwal harian di /jadwal-staff
 */
export function StaffScheduleListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Memuat jadwal tugas">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] animate-pulse space-y-3"
        >
          {/* Top row: Waktu + Badge Status */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-slate-200/90" />
              <div className="h-3.5 w-24 rounded-md bg-slate-200/90" />
            </div>
            <div className="h-5 w-20 rounded-full bg-slate-200/80" />
          </div>

          {/* Judul & Info Checklist */}
          <div className="space-y-2 pt-0.5">
            <div className="h-4 w-3/4 rounded-md bg-slate-200/90" />
            <div className="h-3 w-1/2 rounded-md bg-slate-100" />
          </div>

          {/* Tombol Aksi / Footer Bar */}
          <div className="pt-1">
            <div className="h-10 w-full rounded-xl bg-slate-200/75" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton untuk daftar timeline riwayat audit di /jadwal-staff/riwayat
 */
export function StaffHistoryListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Memuat riwayat audit">
      {/* Header Tanggal */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-slate-300" />
          <div className="h-3 w-28 rounded-md bg-slate-200/90" />
        </div>
        <div className="h-3 w-16 rounded-md bg-slate-200/70" />
      </div>

      {/* Daftar Kartu Riwayat */}
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="h-5 w-20 rounded-full bg-slate-200/90" />
                <div className="h-3.5 w-16 rounded-md bg-slate-100" />
              </div>
              <div className="w-4 h-4 rounded bg-slate-200/70" />
            </div>

            <div className="space-y-1.5">
              <div className="h-4 w-4/5 rounded-md bg-slate-200/90" />
              <div className="h-3 w-2/3 rounded-md bg-slate-100" />
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div className="h-3 w-24 rounded-md bg-slate-100" />
              <div className="h-5 w-14 rounded-full bg-slate-200/80" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton untuk lembar pengerjaan checklist di /jadwal-staff/pengerjaan
 */
export function StaffPengerjaanSkeleton() {
  return (
    <div
      className="flex-1 overflow-y-auto px-4 py-4 space-y-4 animate-pulse"
      aria-busy="true"
      aria-label="Memuat lembar pengerjaan"
    >
      {/* Subheader Step & Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="h-3.5 w-28 rounded-md bg-slate-200/90" />
          <div className="h-5 w-24 rounded-full bg-slate-200/80" />
        </div>
        <div className="h-2 w-full rounded-full bg-slate-200/70" />
      </div>

      {/* Kartu Pertanyaan */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-3">
        <div className="h-4 w-5/6 rounded-md bg-slate-200/90" />
        <div className="h-3 w-full rounded-md bg-slate-100" />
        <div className="h-3 w-2/3 rounded-md bg-slate-100" />

        {/* Tombol Pilihan Kondisi */}
        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <div className="h-12 rounded-xl bg-slate-200/80" />
          <div className="h-12 rounded-xl bg-slate-100" />
        </div>
      </div>

      {/* Kartu Bukti Foto */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-2.5">
        <div className="h-3.5 w-32 rounded-md bg-slate-200/90" />
        <div className="h-36 w-full rounded-xl bg-slate-100 border border-dashed border-slate-200" />
      </div>

      {/* Kartu Catatan */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-2">
        <div className="h-3.5 w-28 rounded-md bg-slate-200/90" />
        <div className="h-20 w-full rounded-xl bg-slate-100" />
      </div>
    </div>
  );
}

/**
 * Skeleton untuk daftar tinjauan checklist di /jadwal-staff/review
 */
export function StaffReviewListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2.5 animate-pulse" aria-busy="true" aria-label="Memuat tinjauan checklist">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-start gap-3"
        >
          <div className="w-7 h-7 rounded-xl bg-slate-200/90 shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-3.5 w-4/5 rounded-md bg-slate-200/90" />
            <div className="flex items-center gap-2">
              <div className="h-4 w-16 rounded-full bg-slate-200/80" />
              <div className="h-4 w-20 rounded-full bg-slate-100" />
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton untuk layar profil di /jadwal-staff/profile
 */
export function StaffProfileSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Memuat profil pengguna">
      {/* Identity Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-slate-200/90 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-36 rounded-md bg-slate-200/90" />
          <div className="h-3 w-24 rounded-md bg-slate-100" />
          <div className="h-2.5 w-32 rounded-md bg-slate-100" />
        </div>
      </div>

      {/* Store Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-200/90" />
          <div className="space-y-1.5 flex-1">
            <div className="h-2.5 w-24 rounded bg-slate-100" />
            <div className="h-3.5 w-40 rounded bg-slate-200/90" />
          </div>
        </div>
        <div className="h-14 w-full rounded-2xl bg-slate-100" />
      </div>

      {/* Contact Info Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 space-y-3.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="h-3 w-24 rounded bg-slate-100" />
            <div className="h-3.5 w-32 rounded bg-slate-200/80" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton Layar Penuh Mobile (Fallback Suspense untuk halaman-halaman /jadwal-staff/*)
 */
export function StaffMobileScreenSkeleton() {
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#f4f6fc] sm:relative sm:inset-auto sm:min-h-screen sm:bg-[#f3f4fa] sm:flex sm:items-center sm:justify-center sm:py-6 sm:px-4 font-sans antialiased">
      <div className="w-full h-full flex flex-col bg-[#f4f6fc] sm:h-[844px] sm:max-h-[92vh] sm:max-w-[420px] sm:rounded-[42px] sm:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.2)] sm:border-[9px] sm:border-slate-800 overflow-hidden p-4 sm:p-5 space-y-4 animate-pulse">
        {/* Top bar skeleton */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-200/90" />
            <div className="space-y-1.5">
              <div className="h-4 w-32 rounded-md bg-slate-200/90" />
              <div className="h-3 w-24 rounded-md bg-slate-200/60" />
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-200/90" />
        </div>

        {/* Hero / Summary card skeleton */}
        <div className="bg-white rounded-3xl p-4 border border-slate-100 space-y-3">
          <div className="h-4 w-40 rounded-md bg-slate-200/90" />
          <div className="h-3 w-52 rounded-md bg-slate-100" />
          <div className="h-2 w-full rounded-full bg-slate-200/75 mt-2" />
        </div>

        {/* Content cards skeleton */}
        <StaffScheduleListSkeleton count={3} />
      </div>
    </div>
  );
}
