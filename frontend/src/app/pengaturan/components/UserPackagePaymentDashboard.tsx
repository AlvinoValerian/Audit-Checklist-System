"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Search,
  Filter,
  Download,
  Sparkles,
  RefreshCw,
  FileText,
  ChevronRight,
  X,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import SparkPayCheckoutModal, { SparkPayCheckoutData } from "./SparkPayCheckoutModal";

// Interface untuk Data Pembayaran / Invoice Paket
export interface UserSubscriptionItem {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  packageName: "Starter" | "Pro" | "Enterprise";
  nominal: number;
  billingCycle: "Bulanan" | "Tahunan";
  status: "Lunas" | "Menunggu Bayar" | "Kadaluarsa";
  paymentMethod?: string;
  expiryDate: string;
  invoiceNumber: string;
  lastPaymentDate?: string;
  proportion: number;
}

// Data Fallback Realistis untuk Anton Kurniawan (Super Admin)
const INITIAL_USER_SUBSCRIPTIONS: UserSubscriptionItem[] = [
  {
    id: "SUB-1",
    name: "Anton Kurniawan",
    email: "admin@auditcorp.com",
    role: "Super Admin",
    packageName: "Enterprise",
    nominal: 799000,
    billingCycle: "Bulanan",
    status: "Lunas",
    paymentMethod: "BCA Virtual Account",
    expiryDate: "15 Jan 2027",
    invoiceNumber: "INV-2026-11-0001",
    lastPaymentDate: "15 Nov 2026, 09:30 WIB",
    proportion: 53.4,
  },
  {
    id: "SUB-2",
    name: "Anton Kurniawan",
    email: "admin@auditcorp.com",
    role: "Super Admin",
    packageName: "Pro",
    nominal: 299000,
    billingCycle: "Bulanan",
    status: "Menunggu Bayar",
    expiryDate: "18 Nov 2026",
    invoiceNumber: "INV-2026-11-0002",
    proportion: 20.0,
  },
  {
    id: "SUB-3",
    name: "Anton Kurniawan",
    email: "admin@auditcorp.com",
    role: "Super Admin",
    packageName: "Pro",
    nominal: 299000,
    billingCycle: "Bulanan",
    status: "Lunas",
    paymentMethod: "QRIS SparkPay",
    expiryDate: "28 Des 2026",
    invoiceNumber: "INV-2026-11-0003",
    lastPaymentDate: "28 Okt 2026, 14:10 WIB",
    proportion: 20.0,
  },
  {
    id: "SUB-4",
    name: "Anton Kurniawan",
    email: "admin@auditcorp.com",
    role: "Super Admin",
    packageName: "Starter",
    nominal: 99000,
    billingCycle: "Bulanan",
    status: "Menunggu Bayar",
    expiryDate: "20 Nov 2026",
    invoiceNumber: "INV-2026-11-0004",
    proportion: 6.6,
  },
];

export default function UserPackagePaymentDashboard() {
  // State Data
  const [usersList, setUsersList] = useState<UserSubscriptionItem[]>(INITIAL_USER_SUBSCRIPTIONS);
  const [payerInfo, setPayerInfo] = useState<{
    id: string;
    name: string;
    email: string;
    role: string;
    company: string;
    phone: string;
  }>({
    id: "1",
    name: "Anton Kurniawan",
    email: "admin@auditcorp.com",
    role: "Super Admin",
    company: "PT Pesta Pora Abadi",
    phone: "081234567890",
  });

  const [isLoadingDb, setIsLoadingDb] = useState(false);

  // Fetch riil data dari PostgreSQL backend
  const fetchDbUsers = async () => {
    setIsLoadingDb(true);
    try {
      const res = await fetch("http://localhost:5000/api/sparkpay/user-subscriptions");
      if (res.ok) {
        const json = await res.json();
        if (json.status === "success" && json.data) {
          if (json.data.payer) {
            setPayerInfo(json.data.payer);
          }
          if (Array.isArray(json.data.users) && json.data.users.length > 0) {
            const mappedUsers: UserSubscriptionItem[] = json.data.users.map((u: any) => ({
              id: u.id,
              name: u.name || "Anton Kurniawan",
              email: u.email || "admin@auditcorp.com",
              role: u.role || "Super Admin",
              packageName: u.packageName,
              nominal: u.nominal,
              billingCycle: u.billingCycle || "Bulanan",
              status: u.status,
              paymentMethod: u.paymentMethod,
              expiryDate: u.expiryDate,
              invoiceNumber: u.invoiceNumber,
              lastPaymentDate: u.lastPaymentDate,
              proportion: u.proportion || 0,
            }));
            setUsersList(mappedUsers);
          }
        }
      }
    } catch (err) {
      console.warn("Menggunakan data fallback lokal:", err);
    } finally {
      setIsLoadingDb(false);
    }
  };

  useEffect(() => {
    fetchDbUsers();
  }, []);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"Semua" | "Lunas" | "Menunggu Bayar" | "Kadaluarsa">("Semua");
  const [filterPackage, setFilterPackage] = useState<"Semua" | "Starter" | "Pro" | "Enterprise">("Semua");

  // Modal State untuk Checkout SparkPay
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutData, setCheckoutData] = useState<SparkPayCheckoutData | null>(null);
  const [payingUser, setPayingUser] = useState<UserSubscriptionItem | null>(null);

  // Modal State untuk Detail Invoice
  const [selectedInvoice, setSelectedInvoice] = useState<UserSubscriptionItem | null>(null);

  // Format Angka ke Rupiah
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Ringkasan Statistik Berbasis Data Tagihan
  const summaryStats = useMemo(() => {
    const totalCount = usersList.length;
    const lunasList = usersList.filter((u) => u.status === "Lunas");
    const pendingList = usersList.filter((u) => u.status === "Menunggu Bayar");

    const totalNominal = usersList.reduce((acc, curr) => acc + curr.nominal, 0);
    const lunasNominal = lunasList.reduce((acc, curr) => acc + curr.nominal, 0);
    const pendingNominal = pendingList.reduce((acc, curr) => acc + curr.nominal, 0);
    const uniquePayers = new Set(usersList.map((u) => u.email)).size;

    return {
      totalCount,
      lunasCount: lunasList.length,
      pendingCount: pendingList.length,
      totalNominal,
      lunasNominal,
      pendingNominal,
      uniquePayers,
    };
  }, [usersList]);

  // Filter Data Tagihan
  const filteredUsers = useMemo(() => {
    return usersList.filter((item) => {
      const matchSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.packageName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = filterStatus === "Semua" || item.status === filterStatus;
      const matchPackage = filterPackage === "Semua" || item.packageName === filterPackage;

      return matchSearch && matchStatus && matchPackage;
    });
  }, [usersList, searchQuery, filterStatus, filterPackage]);

  // Handle Klik Bayar via SparkPay
  const handleInitiatePayment = (user: UserSubscriptionItem) => {
    setPayingUser(user);
    setCheckoutData({
      slug: `paket-${user.packageName.toLowerCase()}`,
      external_reference: user.invoiceNumber,
      title: `Pembayaran Paket Langganan ${user.packageName} (${user.billingCycle})`,
      amount: user.nominal,
      currency: "IDR",
      customer: {
        name: user.name || payerInfo.name || "Anton Kurniawan",
        email: user.email || payerInfo.email || "admin@auditcorp.com",
        phone: payerInfo.phone || "081234567890",
      },
      items: [
        {
          name: `Paket Langganan ${user.packageName} (${user.billingCycle})`,
          quantity: 1,
          price: user.nominal,
        },
      ],
    });
    setIsCheckoutOpen(true);
  };

  // Handle Sukses Pembayaran SparkPay
  const handlePaymentSuccess = (result: any) => {
    if (payingUser) {
      setUsersList((prev) =>
        prev.map((item) => {
          if (item.id === payingUser.id) {
            return {
              ...item,
              status: "Lunas",
              paymentMethod: result.paymentMethod || "QRIS SparkPay",
              lastPaymentDate:
                new Date().toLocaleString("id-ID", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }) + " WIB",
            };
          }
          return item;
        })
      );
      toast.success(
        `Pembayaran ${payingUser.invoiceNumber} sebesar ${formatRupiah(payingUser.nominal)} berhasil dilunasi oleh Anton Kurniawan!`
      );
    }
    setIsCheckoutOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* ============================================================== */}
      {/* 1. RINGKASAN METRIK TAGIHAN (BERSIH & RELEVAN UNTUK SISTEM)   */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Akumulasi Tagihan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Total Tagihan Paket
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {formatRupiah(summaryStats.totalNominal)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Akumulasi dari {summaryStats.totalCount} paket langganan
            </p>
          </div>
        </div>

        {/* Card 2: Tagihan Lunas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Tagihan Lunas
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl sm:text-2xl font-black text-emerald-950 tracking-tight">
              {summaryStats.lunasCount} Paket
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              {formatRupiah(summaryStats.lunasNominal)} berhasil terbayar
            </p>
          </div>
        </div>

        {/* Card 3: Menunggu Pembayaran */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Menunggu Pembayaran
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl sm:text-2xl font-black text-amber-950 tracking-tight">
              {summaryStats.pendingCount} Paket
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              {formatRupiah(summaryStats.pendingNominal)} perlu diselesaikan
            </p>
          </div>
        </div>

        {/* Card 4: Penanggung Jawab Pembayar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Total Pembayar
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {summaryStats.uniquePayers} Super Admin
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 truncate">
              {payerInfo.name} & {Math.max(0, summaryStats.uniquePayers - 1)} akun lainnya
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. TABEL REKAP PEMBAYARAN UTAMA (BERSIH, RAPI, NYAMAN DILIHAT) */}
      {/* ============================================================== */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-5">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Daftar Tagihan & Status Pembayaran Paket
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Monitoring invoice lisensi dan eksekusi pembayaran via SparkPay Gateway.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchDbUsers}
              disabled={isLoadingDb}
              title="Segarkan data dari database"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDb ? "animate-spin text-indigo-600" : ""}`} />
              <span>Segarkan</span>
            </button>
          </div>
        </div>

        {/* Toolbar Pencarian & Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nomor invoice, paket, atau status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Filter Status */}
            <select
              aria-label="Filter Berdasarkan Status Pembayaran"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
            >
              <option value="Semua">Semua Status</option>
              <option value="Lunas">Lunas</option>
              <option value="Menunggu Bayar">Menunggu Bayar</option>
              <option value="Kadaluarsa">Kadaluarsa</option>
            </select>

            {/* Filter Paket */}
            <select
              aria-label="Filter Berdasarkan Paket Langganan"
              value={filterPackage}
              onChange={(e) => setFilterPackage(e.target.value as any)}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
            >
              <option value="Semua">Semua Paket</option>
              <option value="Starter">Starter</option>
              <option value="Pro">Pro</option>
              <option value="Enterprise">Enterprise</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-semibold">
              Menampilkan {filteredUsers.length} dari {usersList.length} tagihan
            </span>
          </div>
        </div>

        {/* Tabel Tagihan Paket */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-12 text-center">NO</th>
                <th className="py-3 px-4">Pembayar</th>
                <th className="py-3 px-4">Nomor Invoice</th>
                <th className="py-3 px-4">Paket Langganan</th>
                <th className="py-3 px-4">Nominal Tagihan</th>
                <th className="py-3 px-4 min-w-[160px]">Proporsi</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Masa Berlaku</th>
                <th className="py-3 px-4 text-center">Aksi SparkPay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-400">
                    Tidak ada data tagihan yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, idx) => (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    {/* Kolom 0: NO */}
                    <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-400">
                      {idx + 1}
                    </td>

                    {/* Kolom 1: Pembayar */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-black flex items-center justify-center shrink-0 text-xs border border-indigo-200">
                          {user.name
                            ? user.name
                                .split(" ")
                                .filter(Boolean)
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join("")
                                .toUpperCase()
                            : "SA"}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 leading-tight">
                            {user.name || payerInfo.name}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {user.email || payerInfo.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Kolom 2: Nomor Invoice */}
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80">
                        {user.invoiceNumber}
                      </span>
                    </td>

                    {/* Kolom 3: Paket */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-extrabold text-[10px] uppercase tracking-wider ${
                          user.packageName === "Enterprise"
                            ? "bg-purple-100 text-purple-700 border border-purple-200"
                            : user.packageName === "Pro"
                            ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
                            : "bg-sky-100 text-sky-700 border border-sky-200"
                        }`}
                      >
                        <Sparkles className="w-3 h-3" />
                        {user.packageName} ({user.billingCycle})
                      </span>
                    </td>

                    {/* Kolom 4: Nominal Tagihan */}
                    <td className="py-3 px-4">
                      <span className="font-black text-slate-900 text-sm">
                        {formatRupiah(user.nominal)}
                      </span>
                    </td>

                    {/* Kolom 5: Proporsi */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden relative">
                          <div
                            className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(user.proportion || 20, 100)}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono font-bold text-slate-500 w-12 text-right">
                          {(user.proportion || 0).toFixed(1)}%
                        </span>
                      </div>
                    </td>

                    {/* Kolom 6: Status Pembayaran */}
                    <td className="py-3 px-4">
                      {user.status === "Lunas" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Lunas
                        </span>
                      )}
                      {user.status === "Menunggu Bayar" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Menunggu Bayar
                        </span>
                      )}
                      {user.status === "Kadaluarsa" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          Kadaluarsa
                        </span>
                      )}
                    </td>

                    {/* Kolom 7: Masa Berlaku */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{user.expiryDate}</div>
                      {user.lastPaymentDate && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Bayar: {user.lastPaymentDate}
                        </div>
                      )}
                    </td>

                    {/* Kolom 8: Aksi SparkPay */}
                    <td className="py-3 px-4 text-center">
                      {user.status === "Menunggu Bayar" || user.status === "Kadaluarsa" ? (
                        <button
                          type="button"
                          onClick={() => handleInitiatePayment(user)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white font-bold text-xs shadow-xs hover:shadow transition-all cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Bayar via SparkPay</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedInvoice(user)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Detail Invoice</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. MODAL CHECKOUT SPARKPAY SNAP                                */}
      {/* ============================================================== */}
      {isCheckoutOpen && checkoutData && (
        <SparkPayCheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          data={checkoutData}
          environment="sandbox"
          onSuccess={handlePaymentSuccess}
          onPending={() => {
            toast.info("Transaksi sedang menunggu pembayaran di gateway SparkPay.");
            setIsCheckoutOpen(false);
          }}
          onError={(err) => {
            toast.error(`Terjadi kendala checkout: ${err.message}`);
          }}
        />
      )}

      {/* ============================================================== */}
      {/* 4. MODAL DETAIL INVOICE RESMI                                  */}
      {/* ============================================================== */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Kwitansi Pembayaran Paket
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {selectedInvoice.invoiceNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">Nama Pembayar</span>
                  <span className="font-bold text-slate-800">{selectedInvoice.name || payerInfo.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">Email Terdaftar</span>
                  <span className="font-mono text-slate-600">{selectedInvoice.email || payerInfo.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">Peran / Otoritas</span>
                  <span className="font-semibold text-slate-800">{payerInfo.role}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">Perusahaan</span>
                  <span className="font-semibold text-slate-800">{payerInfo.company}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-indigo-900 font-bold">
                    Paket {selectedInvoice.packageName} ({selectedInvoice.billingCycle})
                  </span>
                  <span className="font-extrabold text-indigo-950 text-sm">
                    {formatRupiah(selectedInvoice.nominal)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Metode Pembayaran</span>
                  <span className="font-semibold text-emerald-700">
                    {selectedInvoice.paymentMethod || "SparkPay Gateway"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Masa Berlaku Lisensi</span>
                  <span className="font-semibold text-slate-800">
                    s.d. {selectedInvoice.expiryDate}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  toast.success("Invoice PDF berhasil diunduh ke perangkat Anda.");
                  setSelectedInvoice(null);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Bukti PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
