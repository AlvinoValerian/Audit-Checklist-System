"use client";

import React, { Suspense } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Header from "@/components/layout/Header";
import UserPackagePaymentDashboard from "@/app/pengaturan/components/UserPackagePaymentDashboard";

function RekapPembayaranContent() {
  return (
    <DashboardLayout>
      <Header
        title="Rekap Pembayaran Paket User"
        subtitle="Pusat monitoring transaksi pembayaran paket langganan seluruh user, aktivasi lisensi toko retail, dan integrasi SparkPay."
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <UserPackagePaymentDashboard />
      </div>
    </DashboardLayout>
  );
}

export default function RekapPembayaranPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="p-8 text-center text-slate-400">
            Memuat Rekap Pembayaran Paket User...
          </div>
        </DashboardLayout>
      }
    >
      <RekapPembayaranContent />
    </Suspense>
  );
}
