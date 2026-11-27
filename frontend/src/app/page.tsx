"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import NumberFlow from "@number-flow/react";
import {
  Monitor,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  FileSpreadsheet,
  AlertCircle,
  Clock,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  ArrowUp,
  Layers,
  Store,
  BarChart3,
  Sparkles,
  Check,
  Lock,
  Camera,
  Calendar,
} from "lucide-react";
import { AuthService, AuthUser } from "@/lib/auth";
import { getHomeRouteForRole } from "@/lib/routes-acl";
import { CryptoService } from "@/lib/crypto";

function getInitials(name?: string): string {
  if (!name || name === "Admin Utama" || name === "Admin") return "SA";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function LandingPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isYearly, setIsYearly] = useState(false);
  const [isOverDark, setIsOverDark] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const [titleNumber, setTitleNumber] = useState(0);
  const titles = useMemo(
    () => [
      "Toko Ritel",
      "Restoran & Kafe",
      "Minimarket",
      "Bisnis Franchise",
      "Jaringan Cabang",
    ],
    []
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (titleNumber === titles.length - 1) {
        setTitleNumber(0);
      } else {
        setTitleNumber(titleNumber + 1);
      }
    }, 2200);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles]);

  useEffect(() => {
    queueMicrotask(() => {
      setIsMounted(true);
      const user = AuthService.getCurrentUser();
      setCurrentUser(user);

      if (user) {
        const rawAvatar =
          (typeof window !== "undefined" && localStorage.getItem("audit_pro_avatar")) ||
          user.profilePicture;
        if (rawAvatar) {
          if (CryptoService.isEncrypted(rawAvatar)) {
            CryptoService.decryptImage(rawAvatar)
              .then((dec) => setUserAvatar(dec))
              .catch(() => setUserAvatar(null));
          } else {
            setUserAvatar(rawAvatar);
          }
        }
      }
    });

    // Auto-scroll smooth jika halaman dibuka dengan anchor hash (contoh: /#pricing dari menu Langganan)
    if (typeof window !== "undefined" && window.location.hash) {
      const hash = window.location.hash;
      setTimeout(() => {
        const el = document.querySelector(hash);
        if (el) {
          const rect = el.getBoundingClientRect();
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          window.scrollTo({
            top: rect.top + scrollTop,
            behavior: "smooth",
          });
        }
      }, 150);
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;

      // Back to top threshold
      if (scrollY > 300) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }

      // Detect if navbar (fixed at top ~20px-60px) is currently hovering over dark sections
      // Dark sections: Stats Bar (#stats-bar) and Bottom CTA (#cta-banner)
      const darkSections = document.querySelectorAll<HTMLElement>("[data-theme='dark']");
      let overDark = false;
      const navbarY = 45; // Titik tengah vertikal floating capsule

      darkSections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= navbarY && rect.bottom >= navbarY) {
          overDark = true;
        }
      });

      setIsOverDark(overDark);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const scrollToSection = (
    e: React.MouseEvent<HTMLAnchorElement>,
    targetId: string
  ) => {
    e.preventDefault();
    if (targetId === "#home" || targetId === "#" || targetId === "") {
      scrollToTop();
      if (typeof window !== "undefined") {
        window.history.pushState(null, "", window.location.pathname);
      }
      return;
    }

    const element = document.querySelector(targetId);
    if (element) {
      const rect = element.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      // Scroll tepat ke batas atas section (y = 0) sehingga tidak ada konten dari section sebelumnya yang terlihat
      const targetTop = rect.top + scrollTop;

      window.scrollTo({
        top: targetTop,
        behavior: "smooth",
      });
      if (typeof window !== "undefined") {
        window.history.pushState(null, "", targetId);
      }
    }
  };

  const getPackageActionUrl = (
    planName: "Lite Plan" | "Standard Plan" | "Enterprise" | "Enterprise Plan" | "Pro Plan",
    monthlyPrice: number,
    yearlyPrice: number
  ) => {
    const canonicalName =
      planName.toLowerCase().includes("enterprise") || planName.toLowerCase().includes("pro")
        ? "Enterprise"
        : planName;
    if (isMounted && currentUser) {
      const nominal = isYearly ? yearlyPrice : monthlyPrice;
      const cycle = isYearly ? "Tahunan" : "Bulanan";
      try {
        localStorage.setItem("selected_checkout_plan", canonicalName);
        localStorage.setItem("selected_billing_cycle", isYearly ? "yearly" : "monthly");
        localStorage.setItem("subscription_duration_days", isYearly ? "365" : "30");
      } catch {}
      const saId =
        currentUser.rawId ||
        (currentUser.id ? String(currentUser.id).replace(/^sa-/, "") : "") ||
        "";
      const params = new URLSearchParams({
        package: canonicalName,
        nominal: String(nominal),
        cycle: cycle,
        superAdminId: saId,
        email: currentUser.email || "",
        name: currentUser.fullName || "",
      });
      return `/checkout?${params.toString()}`;
    }

    const planSlug = planName.toLowerCase().includes("lite")
      ? "lite"
      : planName.toLowerCase().includes("pro")
        ? "pro"
        : "standard";
    return `/register?plan=${planSlug}&billing=${isYearly ? "yearly" : "monthly"}`;
  };

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const features = [
    {
      icon: <Layers className="w-6 h-6 text-sky-600 group-hover:text-white transition-colors duration-300" />,
      badge: "Kustomisasi Bebas",
      title: "Checklist Digital Dinamis",
      description:
        "Kustomisasi kuesioner audit pembukaan toko, kebersihan, SOP kasir, hingga kepatuhan visual merchandising secara fleksibel.",
      highlight: "Template Dinamis • Multi-Kategori",
      accentGlow: "from-sky-400 via-blue-500 to-transparent",
      iconBoxBg: "bg-sky-50 group-hover:bg-[#26455E] border-sky-100/90 group-hover:border-[#26455E]",
      badgePill: "bg-sky-50 text-sky-700 border-sky-200/80",
    },
    {
      icon: <MapPin className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors duration-300" />,
      badge: "Anti-Fraud GPS",
      title: "Geotagging & Bukti Foto Anti-Fraud",
      description:
        "Validasi kehadiran auditor di lokasi toko dengan koordinat GPS real-time dan pengambilan foto langsung berkamera timestamp.",
      highlight: "Radius <10m • Anti Fake GPS",
      accentGlow: "from-blue-500 via-sky-400 to-transparent",
      iconBoxBg: "bg-blue-50 group-hover:bg-[#26455E] border-blue-100/90 group-hover:border-[#26455E]",
      badgePill: "bg-blue-50 text-blue-700 border-blue-200/80",
    },
    {
      icon: <AlertCircle className="w-6 h-6 text-amber-600 group-hover:text-white transition-colors duration-300" />,
      badge: "SLA Manager",
      title: "Tiket Temuan & Tindak Lanjut (CAPA)",
      description:
        "Otomatisasi penugasan perbaikan deviasi ke Store Manager lengkap dengan tenggat waktu penyelesaian (SLA) dan verifikasi ulang.",
      highlight: "Delegasi Cepat • SLA Monitoring",
      accentGlow: "from-amber-400 via-rose-400 to-transparent",
      iconBoxBg: "bg-amber-50 group-hover:bg-[#26455E] border-amber-100/90 group-hover:border-[#26455E]",
      badgePill: "bg-amber-50 text-amber-700 border-amber-200/80",
    },
    {
      icon: <BarChart3 className="w-6 h-6 text-indigo-600 group-hover:text-white transition-colors duration-300" />,
      badge: "Analytics Terpusat",
      title: "Executive Dashboard & Scoring",
      description:
        "Pantau pemeringkatan skor kepatuhan seluruh jaringan cabang toko secara terpusat dengan matriks analitik interaktif.",
      highlight: "Matriks Skor • Peringkat Toko",
      accentGlow: "from-indigo-500 via-blue-400 to-transparent",
      iconBoxBg: "bg-indigo-50 group-hover:bg-[#26455E] border-indigo-100/90 group-hover:border-[#26455E]",
      badgePill: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
    },
    {
      icon: <FileSpreadsheet className="w-6 h-6 text-teal-600 group-hover:text-white transition-colors duration-300" />,
      badge: "Export 1-Klik",
      title: "Ekspor Laporan Otomatis (PDF)",
      description:
        "Generate laporan audit komprehensif berformat resmi beserta lampiran foto bukti dalam hitungan detik tanpa rekap manual.",
      highlight: "Format PDF Resmi • Foto Bukti",
      accentGlow: "from-teal-400 via-emerald-400 to-transparent",
      iconBoxBg: "bg-teal-50 group-hover:bg-[#26455E] border-teal-100/90 group-hover:border-[#26455E]",
      badgePill: "bg-teal-50 text-teal-700 border-teal-200/80",
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-[#26455E] group-hover:text-white transition-colors duration-300" />,
      badge: "Aman & Terenkripsi",
      title: "Multi-Role & Kontrol Akses",
      description:
        "Struktur hak akses aman dan bertingkat untuk Super Admin, Area Manager, Auditor Lapangan, dan Store Supervisor.",
      highlight: "Hak Akses Bertingkat • Audit Log",
      accentGlow: "from-slate-500 via-[#26455E] to-transparent",
      iconBoxBg: "bg-slate-100 group-hover:bg-[#26455E] border-slate-200 group-hover:border-[#26455E]",
      badgePill: "bg-slate-100 text-slate-700 border-slate-200/90",
    },
  ];

  const workflowSteps = [
    {
      step: "01",
      title: "Penjadwalan & Penugasan",
      desc: "Super Admin atau Area Manager menentukan jadwal kunjungan audit serta menugaskan auditor ke cabang toko target secara terstruktur.",
      tag: "Penjadwalan",
      icon: <Calendar className="w-5 h-5 text-sky-600 group-hover:text-white transition-colors duration-300" />,
      accentGlow: "from-sky-400 via-blue-500 to-transparent",
      iconBoxBg: "bg-sky-50 group-hover:bg-[#26455E] border-sky-100/90 group-hover:border-[#26455E]",
      stepPill: "bg-sky-50 text-sky-700 border-sky-200/80",
    },
    {
      step: "02",
      title: "Inspeksi Lapangan",
      desc: "Auditor mengisi checklist digital langsung di lokasi toko, melampirkan foto temuan berkamera timestamp, dan tervalidasi oleh radius GPS.",
      tag: "GPS & Timestamp Kamera",
      icon: <Camera className="w-5 h-5 text-blue-600 group-hover:text-white transition-colors duration-300" />,
      accentGlow: "from-blue-500 via-sky-400 to-transparent",
      iconBoxBg: "bg-blue-50 group-hover:bg-[#26455E] border-blue-100/90 group-hover:border-[#26455E]",
      stepPill: "bg-blue-50 text-blue-700 border-blue-200/80",
    },
    {
      step: "03",
      title: "Scoring & Rekap Otomatis",
      desc: "Sistem langsung mengalkulasi persentase kepatuhan toko dan mengelompokkan temuan ke kategori Kritis, Major, atau Minor seketika.",
      tag: "Kalkulasi Skor Real-Time",
      icon: <BarChart3 className="w-5 h-5 text-indigo-600 group-hover:text-white transition-colors duration-300" />,
      accentGlow: "from-indigo-500 via-blue-400 to-transparent",
      iconBoxBg: "bg-indigo-50 group-hover:bg-[#26455E] border-indigo-100/90 group-hover:border-[#26455E]",
      stepPill: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
    },
    {
      step: "04",
      title: "Resolusi & Monitoring",
      desc: "Store Manager menyelesaikan perbaikan temuan deviasi langsung di sistem hingga diverifikasi tuntas oleh Auditor sesuai standar SLA.",
      tag: "Tiket CAPA & SLA Selesai",
      icon: <ShieldCheck className="w-5 h-5 text-emerald-600 group-hover:text-white transition-colors duration-300" />,
      accentGlow: "from-emerald-400 via-teal-400 to-transparent",
      iconBoxBg: "bg-emerald-50 group-hover:bg-[#26455E] border-emerald-100/90 group-hover:border-[#26455E]",
      stepPill: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    },
  ];

  const faqs = [
    {
      question: "Apa itu platform StoreAudit dan apa keunggulannya?",
      answer:
        "StoreAudit adalah platform sistem monitoring dan audit toko terpadu yang mengotomasi inspeksi operasional ritel, memantau kepatuhan SOP cabang secara konsisten, serta menyajikan analitik performa toko secara real-time tanpa rekap manual.",
    },
    {
      question: "Bagaimana sistem validasi GPS dan foto bukti anti-fraud bekerja?",
      answer:
        "Sistem secara otomatis memvalidasi radius koordinat GPS auditor saat berada di toko fisik. Setiap foto bukti temuan diambil langsung melalui kamera aplikasi dengan metadata tanggal, waktu presisi, dan lokasi geolokasi yang terkunci.",
    },
    {
      question: "Apakah platform mendukung ekspansi banyak cabang (multi-branch)?",
      answer:
        "Ya, StoreAudit mendukung ribuan cabang toko secara terpusat dengan sistem hierarki wilayah (regional/area) serta manajemen hak akses bertingkat bagi Super Admin, Admin, Staff.",
    },
    {
      question: "Bagaimana skema harga dan paket langganan StoreAudit?",
      answer:
        "StoreAudit menawarkan paket fleksibel (Lite, Standard, dan Pro) yang disesuaikan dengan jumlah cabang toko aktif Anda. Anda dapat memilih sistem penagihan bulanan atau tahunan dan meningkatkan paket kapan saja sesuai pertumbuhan bisnis.",
    },
    {
      question: "Bagaimana cara login dan mulai menggunakan platform?",
      answer:
        "Super Admin, Area Manager, maupun Auditor dapat langsung masuk melalui tombol 'Masuk' di navigasi atas atau menuju ke halaman login menggunakan akun resmi yang telah didaftarkan.",
    },
  ];

  return (
    <div
      id="home"
      className="min-h-screen bg-[#dce7f0] text-slate-900 font-sans selection:bg-[#26455E] selection:text-white scroll-mt-0 relative"
    >
      {/* =========================================================================
          1. FLOATING PILL LIQUID GLASS NAVBAR (Dynamic Translucent Glass Capsule)
         ========================================================================= */}
      <header className="fixed top-5 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        <div
          className={`pointer-events-auto flex items-center justify-between gap-3 sm:gap-6 px-3.5 sm:px-5 py-2 rounded-full backdrop-blur-2xl transition-all duration-300 max-w-4xl w-full ${isOverDark
            ? "bg-white/15 border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
            : "bg-slate-900/10 hover:bg-slate-900/15 border border-white/60 shadow-[0_8px_32px_rgba(38,69,94,0.12)]"
            }`}
        >
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <a
              href="#home"
              onClick={(e) => scrollToSection(e, "#home")}
              className="flex items-center gap-2.5 cursor-pointer group select-none"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform ${isOverDark ? "bg-white text-[#26455E]" : "bg-[#26455E] text-white"
                  }`}
              >
                <Monitor className="w-4 h-4 stroke-[2.2]" />
              </div>
              <span
                className={`text-sm sm:text-base font-bold tracking-tight transition-colors duration-300 ${isOverDark ? "text-white" : "text-slate-900"
                  }`}
              >
                Audit Pro
              </span>
            </a>
            {/* Divider */}
            <div
              className={`hidden md:block w-px h-4 mx-1 transition-colors duration-300 ${isOverDark ? "bg-white/30" : "bg-slate-400/40"
                }`}
            />
          </div>

          {/* Navigation Links (Pill Inside with Dynamic Contrast) */}
          <nav
            className={`hidden md:flex items-center gap-6 lg:gap-8 text-xs sm:text-[13px] font-medium transition-colors duration-300 ${isOverDark ? "text-slate-200" : "text-slate-700"
              }`}
          >
            <a
              href="#home"
              onClick={(e) => scrollToSection(e, "#home")}
              className={`relative py-1 transition-colors group ${isOverDark ? "hover:text-white" : "hover:text-[#26455E]"
                }`}
            >
              <span>Home</span>
              <span
                className={`absolute bottom-0 left-0 w-full h-0.5 scale-x-0 origin-left transition-transform duration-300 ease-out group-hover:scale-x-100 rounded-full ${isOverDark ? "bg-white" : "bg-[#26455E]"
                  }`}
              />
            </a>
            <a
              href="#fitur"
              onClick={(e) => scrollToSection(e, "#fitur")}
              className={`relative py-1 transition-colors group ${isOverDark ? "hover:text-white" : "hover:text-[#26455E]"
                }`}
            >
              <span>Fitur</span>
              <span
                className={`absolute bottom-0 left-0 w-full h-0.5 scale-x-0 origin-left transition-transform duration-300 ease-out group-hover:scale-x-100 rounded-full ${isOverDark ? "bg-white" : "bg-[#26455E]"
                  }`}
              />
            </a>
            <a
              href="#alur"
              onClick={(e) => scrollToSection(e, "#alur")}
              className={`relative py-1 transition-colors group ${isOverDark ? "hover:text-white" : "hover:text-[#26455E]"
                }`}
            >
              <span>Alur Kerja</span>
              <span
                className={`absolute bottom-0 left-0 w-full h-0.5 scale-x-0 origin-left transition-transform duration-300 ease-out group-hover:scale-x-100 rounded-full ${isOverDark ? "bg-white" : "bg-[#26455E]"
                  }`}
              />
            </a>
            <a
              href="#keunggulan"
              onClick={(e) => scrollToSection(e, "#keunggulan")}
              className={`relative py-1 transition-colors group ${isOverDark ? "hover:text-white" : "hover:text-[#26455E]"
                }`}
            >
              <span>Keunggulan</span>
              <span
                className={`absolute bottom-0 left-0 w-full h-0.5 scale-x-0 origin-left transition-transform duration-300 ease-out group-hover:scale-x-100 rounded-full ${isOverDark ? "bg-white" : "bg-[#26455E]"
                  }`}
              />
            </a>
            <a
              href="#pricing"
              onClick={(e) => scrollToSection(e, "#pricing")}
              className={`relative py-1 transition-colors group ${isOverDark ? "hover:text-white" : "hover:text-[#26455E]"
                }`}
            >
              <span>Harga</span>
              <span
                className={`absolute bottom-0 left-0 w-full h-0.5 scale-x-0 origin-left transition-transform duration-300 ease-out group-hover:scale-x-100 rounded-full ${isOverDark ? "bg-white" : "bg-[#26455E]"
                  }`}
              />
            </a>
            <a
              href="#faq"
              onClick={(e) => scrollToSection(e, "#faq")}
              className={`relative py-1 transition-colors group ${isOverDark ? "hover:text-white" : "hover:text-[#26455E]"
                }`}
            >
              <span>FAQ</span>
              <span
                className={`absolute bottom-0 left-0 w-full h-0.5 scale-x-0 origin-left transition-transform duration-300 ease-out group-hover:scale-x-100 rounded-full ${isOverDark ? "bg-white" : "bg-[#26455E]"
                  }`}
              />
            </a>
          </nav>

          {/* Right Action: Masuk + Registrasi Button / Profil Super Admin */}
          {isMounted && currentUser ? (
            <div className="flex items-center gap-2">
              <Link
                href={getHomeRouteForRole(currentUser.role)}
                className={`group flex items-center gap-2.5 pl-1.5 pr-3.5 py-1.5 rounded-full transition-all border shadow-xs ${isOverDark
                  ? "bg-white/15 hover:bg-white/25 border-white/25 text-white shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
                  : "bg-white/85 hover:bg-white border-slate-200/90 text-slate-800 shadow-xs hover:shadow-md"
                  }`}
                title="Buka Dashboard / Workspace"
              >
                {/* Avatar */}
                <div className="w-7 h-7 rounded-full bg-[#26455E] text-white text-[11px] font-bold flex items-center justify-center overflow-hidden shrink-0 shadow-xs ring-1 ring-white/30">
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt={currentUser.fullName || "User"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{getInitials(currentUser.fullName || "Super Admin")}</span>
                  )}
                </div>

                {/* Name & Role */}
                <div className="flex flex-col text-left leading-tight max-w-[110px] sm:max-w-[150px]">
                  <span className="text-xs font-bold truncate">
                    {currentUser.fullName || "Super Admin"}
                  </span>
                  <span
                    className={`text-[10px] font-medium truncate ${isOverDark ? "text-white/75" : "text-slate-500"
                      }`}
                  >
                    {currentUser.role || "Super Admin"}
                  </span>
                </div>

                {/* Arrow Icon */}
                <ChevronRight
                  className={`w-3.5 h-3.5 shrink-0 ml-0.5 transition-transform duration-200 group-hover:translate-x-0.5 ${isOverDark ? "text-white/70" : "text-slate-400"
                    }`}
                />
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className={`text-xs font-semibold px-2.5 py-1 transition-colors ${isOverDark ? "text-white/90 hover:text-white" : "text-slate-700 hover:text-[#26455E]"
                  }`}
              >
                Masuk
              </Link>
              <Link
                href="/register"
                className={`px-4 sm:px-5 py-2 text-xs font-bold rounded-full shadow-sm hover:shadow transition-all whitespace-nowrap ${isOverDark
                  ? "bg-white hover:bg-slate-100 text-[#26455E]"
                  : "bg-[#26455E] hover:bg-[#1a3143] text-white"
                  }`}
              >
                Registrasi
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* =========================================================================
          2. HERO SECTION (Modern Clean SaaS - Stripe/Linear Inspired Bento-Grid)
         ========================================================================= */}
      <section className="relative pt-32 pb-24 lg:pt-40 lg:pb-32 overflow-hidden">
        {/* Soft Ambient Background Aura */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none opacity-45">
          <div className="absolute top-[-8%] left-[18%] w-[500px] h-[500px] rounded-full bg-[#26455E]/15 blur-[120px]" />
          <div className="absolute top-[15%] right-[12%] w-[420px] h-[420px] rounded-full bg-sky-400/20 blur-[110px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            {/* Headline with Animated Hero Word-Rotating Typography */}
            <h1 className="text-4xl sm:text-6xl lg:text-[68px] font-black tracking-tight sm:tracking-tighter text-slate-900 leading-[1.12]">
              Optimalkan Kepatuhan &amp;{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#26455E] via-sky-600 to-[#142636]">
                Standar Operasional
              </span>
              <span className="relative flex w-full justify-center items-center overflow-hidden text-center h-[42px] sm:h-[60px] lg:h-[70px] mt-2 sm:mt-3">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={titleNumber}
                    initial={{ y: 25, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -25, opacity: 0 }}
                    transition={{ duration: 0.35, ease: "easeInOut" }}
                    className="absolute text-3xl sm:text-5xl lg:text-[58px] font-black text-slate-900 tracking-tight leading-none"
                  >
                    {titles[titleNumber]}
                  </motion.span>
                </AnimatePresence>
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-3 sm:mt-4 text-base sm:text-lg lg:text-xl text-slate-600 font-normal leading-relaxed max-w-2xl mx-auto">
              Tingkatkan efisiensi inspeksi cabang toko, validasi temuan dengan bukti foto
              dan GPS real-time, serta analisa kepatuhan seluruh jaringan dalam satu
              platform terpusat.
            </p>

            {/* CTA Buttons */}
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4">
              {isMounted && currentUser ? (
                <>
                  <Link
                    href={getHomeRouteForRole(currentUser.role)}
                    className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#26455E] hover:bg-[#1b3245] text-white font-bold text-sm shadow-[0_4px_20px_rgba(38,69,94,0.3)] hover:shadow-[0_6px_25px_rgba(38,69,94,0.45)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2.5 group"
                  >
                    <span>Masuk ke Workspace</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    href="/langganan"
                    className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm border border-slate-200/90 shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Status Langganan</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#26455E] hover:bg-[#1b3245] text-white font-bold text-sm shadow-[0_4px_20px_rgba(38,69,94,0.3)] hover:shadow-[0_6px_25px_rgba(38,69,94,0.45)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2.5 group"
                  >
                    <span>Daftar Akun Baru</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    href="/login"
                    className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm border border-slate-200/90 shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2"
                  >
                    <span>Masuk ke Akun</span>
                  </Link>
                </>
              )}
            </div>

            {/* Micro Trust Points (Stripe style) */}
            <div className="mt-7 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs font-medium text-slate-500 select-none">
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Bebas Biaya Setup Awal</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Geofencing GPS Presisi</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Siap Multi-Cabang Skala Besar</span>
              </div>
            </div>
          </div>

          {/* =========================================================================
              HERO VISUAL: Modern macOS Bento-Grid App Window
             ========================================================================= */}
          <div className="mt-14 sm:mt-16 max-w-5xl mx-auto">
            {/* Outer Frosted Glass Floating Frame */}
            <div className="p-2 sm:p-3 rounded-[28px] bg-white/70 backdrop-blur-2xl border border-white/80 shadow-[0_25px_60px_-15px_rgba(38,69,94,0.2)] ring-1 ring-slate-900/5">
              {/* Inner App Window */}
              <div className="rounded-[22px] bg-white border border-slate-200/90 overflow-hidden shadow-xs">
                {/* macOS Window Title Bar */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-slate-50/90 border-b border-slate-100 select-none">
                  {/* Traffic Light Dots */}
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]/50" />
                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]/50" />
                    <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]/50" />
                  </div>

                  {/* Centered Secure URL Bar */}
                  <div className="hidden sm:flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-slate-200/80 text-[11px] text-slate-500 font-mono shadow-2xs max-w-xs w-full justify-center">
                    <Lock className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span className="truncate">app.storeaudit.id/cabang/sudirman-042/live</span>
                  </div>

                  {/* Live Status Indicator */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200/60">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live Audit Aktif</span>
                  </div>
                </div>

                {/* Dashboard Body */}
                <div className="p-4 sm:p-6 lg:p-7 space-y-5">
                  {/* Store Header Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-3">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#26455E] to-sky-700 flex items-center justify-center text-white shadow-md shadow-[#26455E]/20 shrink-0">
                        <Store className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
                            Cabang Sudirman #042 — Jakarta Pusat
                          </h3>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-sky-100 text-sky-800">
                            Audit Reguler
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                          <span>Auditor: <strong className="text-slate-700">Rian Hidayat</strong> (Lead Area 1)</span>
                          <span>•</span>
                          <span className="text-emerald-700 font-medium">Terverifikasi GPS (Radius 15m)</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-100 self-start sm:self-auto shadow-2xs">
                      <Clock className="w-4 h-4 text-[#26455E]" />
                      <span>Kamis, 17 Sept 2026 • 14:30 WIB</span>
                    </div>
                  </div>

                  {/* 4 Bento Metrics Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
                    {/* Bento 1: Skor Kepatuhan */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-200/80 shadow-2xs hover:border-[#26455E]/30 transition-colors">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                        <span>Skor Kepatuhan</span>
                        <span className="p-1 rounded-md bg-[#26455E]/10 text-[#26455E]">
                          <BarChart3 className="w-3.5 h-3.5" />
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-2xl sm:text-3xl font-black text-[#26455E] tracking-tight">
                          96.8%
                        </span>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                          +3.4%
                        </span>
                      </div>
                      <div className="mt-2.5 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-[#26455E] h-full rounded-full" style={{ width: "96.8%" }} />
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1.5 block">Target minimal: 90%</span>
                    </div>

                    {/* Bento 2: Checklist Progress */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-200/80 shadow-2xs hover:border-emerald-300 transition-colors">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                        <span>Checklist Selesai</span>
                        <span className="p-1 rounded-md bg-emerald-100 text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                          48 <span className="text-lg font-bold text-slate-400">/ 50</span>
                        </span>
                      </div>
                      <div className="mt-2.5 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: "96%" }} />
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 mt-1.5 block">96% selesai diisi</span>
                    </div>

                    {/* Bento 3: Deviasi Temuan */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/50 to-white border border-amber-200/70 shadow-2xs">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                        <span>Temuan Deviasi</span>
                        <span className="p-1 rounded-md bg-amber-100 text-amber-700">
                          <AlertCircle className="w-3.5 h-3.5" />
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight">
                          2 Minor
                        </span>
                      </div>
                      <div className="mt-2.5 flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                          0 Isu Kritis
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1.5 block">Tiket CAPA terbit otomatis</span>
                    </div>

                    {/* Bento 4: Geotag Status */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-200/80 shadow-2xs hover:border-sky-300 transition-colors">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                        <span>Status Geotag</span>
                        <span className="p-1 rounded-md bg-sky-100 text-sky-700">
                          <MapPin className="w-3.5 h-3.5" />
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="flex h-2.5 w-2.5 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                          Terkunci
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 mt-2 block bg-slate-100 px-2 py-0.5 rounded">
                        -6.2088, 106.8456
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1 block">Presisi: ±4 meter</span>
                    </div>
                  </div>

                  {/* Real-time Checklist Inspection Stream */}
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                      <span>Pratinjau Checklist Terkini</span>
                      <span>Status Validasi</span>
                    </div>

                    {/* Item 1 */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition-all shadow-2xs">
                      <div className="flex items-center gap-3.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100/70 text-emerald-700 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-slate-800">
                            Kebersihan &amp; Kerapihan Display Gondola Utama
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                            <span>Area: Food &amp; Beverage</span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-slate-500">
                              <Camera className="w-3 h-3 text-sky-600" /> 2 Foto Bukti Terlampir
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                        Sesuai SOP
                      </span>
                    </div>

                    {/* Item 2 */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition-all shadow-2xs">
                      <div className="flex items-center gap-3.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100/70 text-emerald-700 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-slate-800">
                            Kesiapan APAR &amp; Jalur Evakuasi Bebas Halangan
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                            <span>Area: Keselamatan K3</span>
                            <span>•</span>
                            <span className="text-slate-500">Masa Berlaku APAR: Des 2026</span>
                          </div>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                        Sesuai SOP
                      </span>
                    </div>

                    {/* Item 3 (Deviation with CAPA ticket alert) */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-amber-300/80 bg-amber-50/50 hover:bg-amber-50/70 transition-all shadow-2xs">
                      <div className="flex items-center gap-3.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-200/70 text-amber-800 flex items-center justify-center shrink-0">
                          <AlertCircle className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-slate-800">
                            Suhu Chiller Minuman (Terukur 5.5°C — Standar SOP ≤ 4.0°C)
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-amber-800">
                            <span className="font-semibold">Tiket CAPA #310 Terbit untuk Store Manager</span>
                            <span>•</span>
                            <span className="font-bold text-amber-900 bg-amber-200/60 px-1.5 py-0.5 rounded">SLA: 2 Jam</span>
                          </div>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300/70">
                        Perlu Perbaikan
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. STATS BAR
         ========================================================================= */}
      <section data-theme="dark" className="relative z-10 bg-[#142636] text-white py-12 border-y border-[#101d28] shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#ffffff] drop-shadow-sm">
                500+
              </p>
              <p className="text-xs sm:text-sm text-[#ffffff] font-medium mt-1">
                Toko Cabang Terpantau
              </p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#ffffff] drop-shadow-sm">
                45%
              </p>
              <p className="text-xs sm:text-sm text-[#ffffff] font-medium mt-1">
                Penurunan Deviasi SOP
              </p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#ffffff] drop-shadow-sm">
                3x
              </p>
              <p className="text-xs sm:text-sm text-[#ffffff] font-medium mt-1">
                Laporan Terbit Lebih Cepat
              </p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#ffffff] drop-shadow-sm">
                99.8%
              </p>
              <p className="text-xs sm:text-sm text-[#ffffff] font-medium mt-1">
                Akurasi Validasi Geotag
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. KEY FEATURES SECTION (Eye-Catching Modern Bento Grid)
         ========================================================================= */}
      <section id="fitur" className="pt-20 sm:pt-28 pb-16 sm:pb-24 bg-transparent scroll-mt-0 relative overflow-hidden">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-7xl h-96 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(56,189,248,0.12),transparent_75%)] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Section Header with Modern Floating Pill */}
          <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 border border-sky-200/90 shadow-[0_2px_14px_rgba(56,189,248,0.15)] mb-4 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#26455E]">
                Fitur Platform Terdepan
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-black text-slate-900 tracking-tight leading-tight">
              Segala Kebutuhan Audit Toko dalam <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#26455E] via-sky-600 to-[#26455E]">Satu Platform</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-4 max-w-2xl mx-auto leading-relaxed">
              Dirancang khusus untuk mendukung operasional ritel multi-cabang yang menuntut kecepatan inspeksi, presisi anti-fraud, dan kepatuhan SOP standar tinggi.
            </p>
          </div>

          {/* Eye-Catching Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
            {features.map((item, idx) => (
              <div
                key={idx}
                className="group relative rounded-[26px] p-px transition-all duration-500 hover:-translate-y-2 flex flex-col"
              >
                {/* Outer Glow & Gradient Border on Hover */}
                <div
                  className={`absolute -inset-0.5 rounded-[28px] bg-gradient-to-b ${item.accentGlow} opacity-0 group-hover:opacity-100 blur-sm transition-all duration-500 pointer-events-none`}
                />
                <div
                  className={`absolute inset-0 rounded-[26px] bg-gradient-to-b ${item.accentGlow} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
                />

                {/* Inner Card Container */}
                <div className="relative z-10 w-full h-full rounded-[25px] bg-white p-7 sm:p-8 border border-slate-200/90 group-hover:border-transparent shadow-xs group-hover:shadow-[0_20px_45px_rgba(38,69,94,0.14)] transition-all duration-500 flex flex-col justify-between overflow-hidden">
                  {/* Subtle Card Grid Pattern */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000004_1px,transparent_1px),linear-gradient(to_bottom,#00000004_1px,transparent_1px)] bg-[size:22px_22px] pointer-events-none opacity-40" />

                  <div className="relative z-10">
                    {/* Top Row: Icon Squircle + Modern Pill Badge */}
                    <div className="flex items-center justify-between gap-3 mb-6">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-xs transition-all duration-300 group-hover:scale-110 group-hover:shadow-md ${item.iconBoxBg}`}
                      >
                        {item.icon}
                      </div>
                      <span
                        className={`text-[11px] font-extrabold uppercase px-3 py-1 rounded-full border tracking-wider transition-colors duration-300 shadow-2xs ${item.badgePill}`}
                      >
                        {item.badge}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-[#26455E] tracking-tight transition-colors duration-300">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed mt-3">
                      {item.description}
                    </p>
                  </div>

                  {/* Bottom Micro Highlight Pill */}
                  <div className="relative z-10 mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-[11px] font-bold text-slate-500 group-hover:text-[#26455E] transition-colors duration-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500 group-hover:scale-125 transition-transform duration-300" />
                    <span>{item.highlight}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. WORKFLOW STEPS SECTION (Eye-Catching Modern Visual Flow)
         ========================================================================= */}
      <section
        id="alur"
        className="pt-20 sm:pt-28 pb-20 sm:pb-28 bg-gradient-to-b from-[#f8fafc] via-white to-[#f1f5f9] scroll-mt-0 border-y border-slate-200/70 relative overflow-hidden"
      >
        {/* Subtle Ambient Radial Lighting & Grid Mesh */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(56,189,248,0.18),transparent_75%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#26455e08_1px,transparent_1px),linear-gradient(to_bottom,#26455e08_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none opacity-80" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Section Header with Modern Pill Badge */}
          <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
            <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-black text-slate-900 tracking-tight leading-tight">
              Alur Kerja Modern <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#26455E] via-sky-600 to-[#26455E]">Audit Toko Digital</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-4 max-w-2xl mx-auto leading-relaxed">
              Sistem terintegrasi dari perencanaan jadwal, inspeksi GPS anti-fraud, rekap analitik otomatis, hingga penyelesaian tindakan perbaikan tuntas.
            </p>
          </div>

          {/* Workflow Cards Grid with Interactive Flow Track */}
          <div className="relative">
            {/* Desktop Connecting Flow Track Line */}
            <div className="hidden lg:block absolute top-[52px] left-[8%] right-[8%] h-[3px] bg-gradient-to-r from-sky-300 via-blue-400 to-emerald-300 pointer-events-none z-0 rounded-full opacity-60" />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-7 relative z-10">
              {workflowSteps.map((step, idx) => (
                <div
                  key={idx}
                  className="group relative rounded-[26px] p-px transition-all duration-500 hover:-translate-y-2.5 flex flex-col"
                >
                  {/* Outer Gradient Border & Glow on Hover */}
                  <div
                    className={`absolute -inset-0.5 rounded-[28px] bg-gradient-to-b ${step.accentGlow} opacity-0 group-hover:opacity-100 blur-sm transition-all duration-500 pointer-events-none`}
                  />
                  <div
                    className={`absolute inset-0 rounded-[26px] bg-gradient-to-b ${step.accentGlow} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
                  />

                  {/* Card Container Inner */}
                  <div className="relative z-10 w-full h-full rounded-[25px] bg-white p-6 sm:p-7 border border-slate-200/90 group-hover:border-transparent shadow-xs group-hover:shadow-[0_22px_48px_rgba(38,69,94,0.16)] transition-all duration-500 flex flex-col justify-between overflow-hidden">
                    {/* Subtle Card Grid Pattern */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000005_1px,transparent_1px),linear-gradient(to_bottom,#00000005_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-40" />

                    {/* Oversized Faint Watermark Step Number */}
                    <span className="absolute -bottom-3 -right-2 text-7xl font-black text-slate-100/80 group-hover:text-blue-50/70 select-none pointer-events-none transition-colors duration-500 font-mono tracking-tighter">
                      {step.step}
                    </span>

                    <div className="relative z-10">
                      {/* Top Row: Icon + Step Pill */}
                      <div className="flex items-center justify-between gap-3 mb-5">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-xs transition-all duration-300 group-hover:scale-110 group-hover:shadow-md ${step.iconBoxBg}`}
                        >
                          {step.icon}
                        </div>
                        <span
                          className={`text-[11px] font-extrabold uppercase px-3 py-1 rounded-full border tracking-wider transition-colors duration-300 shadow-2xs ${step.stepPill}`}
                        >
                          Langkah {step.step}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#26455E] tracking-tight transition-colors duration-300">
                        {step.title}
                      </h3>
                      <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed mt-2.5">
                        {step.desc}
                      </p>
                    </div>

                    {/* Bottom Micro Highlight Pill */}
                    <div className="relative z-10 mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-[11px] font-bold text-slate-500 group-hover:text-[#26455E] transition-colors duration-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500 group-hover:scale-125 transition-transform duration-300" />
                      <span>{step.tag}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. COMPARISON: TRADITIONAL VS STOREAUDIT
         ========================================================================= */}
      <section id="keunggulan" className="pt-20 sm:pt-24 pb-16 sm:pb-20 bg-transparent scroll-mt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#26455E]">
              Mengapa StoreAudit?
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight mt-2">
              Transformasi dari Audit Manual ke Sistem Terintegrasi
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Traditional Audit */}
            <div className="bg-white p-7 rounded-2xl border border-red-200">
              <span className="text-xs font-bold text-red-600 uppercase tracking-wider">
                Audit Manual / Konvensional
              </span>
              <ul className="mt-5 space-y-3.5 text-sm text-slate-600">
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold">✕</span>
                  <span>Formulir kertas bertumpuk dan rawan hilang atau rusak.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold">✕</span>
                  <span>Tidak ada validasi lokasi, risiko auditor tidak hadir ke toko.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold">✕</span>
                  <span>Rekap data membutuhkan waktu berhari-hari via spreadsheet.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold">✕</span>
                  <span>Tindak lanjut temuan sering terlewat tanpa pelacakan status.</span>
                </li>
              </ul>
            </div>

            {/* StoreAudit Digital */}
            <div className="bg-[#26455E] text-white p-7 rounded-2xl shadow-xl border border-[#26455E]">
              <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                Dengan StoreAudit System
              </span>
              <ul className="mt-5 space-y-3.5 text-sm text-slate-100">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>100% digital, formulir dinamis dapat diakses di tablet/smartphone.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Geotagging GPS otomatis &amp; timestamp foto anti-rekayasa.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Laporan PDF &amp; skor audit keluar instan seketika inspeksi selesai.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Sistem tiket CAPA dengan SLA jelas untuk Store Manager.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          PRICING SECTION (Clean Light Theme with Elegant Glow & Accents)
         ========================================================================= */}
      <section
        id="pricing"
        className="relative pt-20 sm:pt-24 pb-20 sm:pb-24 bg-transparent text-slate-900 overflow-hidden scroll-mt-0 border-b border-slate-200/50"
      >
        {/* Subtle Ambient Backlight Glows for Light Theme */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-b from-sky-200/30 via-slate-200/20 to-transparent blur-3xl pointer-events-none rounded-full" />
        <div className="absolute top-1/2 left-1/3 -translate-x-1/2 w-[350px] h-[250px] bg-sky-300/15 blur-[100px] pointer-events-none rounded-full" />
        <div className="absolute top-1/2 right-1/3 translate-x-1/2 w-[350px] h-[250px] bg-indigo-200/15 blur-[100px] pointer-events-none rounded-full" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Big Stylized "Pricing" Watermark / Title (Light Mode) */}
          <div className="text-center relative select-none">
            <h1 className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-slate-900 via-slate-800 to-slate-300/40 leading-none">
              Harga
            </h1>
            <p className="mt-3 text-xs sm:text-sm font-semibold text-[#26455E] uppercase tracking-widest max-w-xl mx-auto">
              Paket Fleksibel &amp; Terukur Sesuai Jumlah Cabang Toko Anda
            </p>
          </div>

          {/* Monthly / Yearly Billing Toggle (Animated Pill Tab from 21st.dev) */}
          <div className="mt-6 sm:mt-7 flex items-center justify-center">
            <div className="relative inline-flex items-center p-1.5 rounded-full bg-white/90 border border-slate-200/90 shadow-sm backdrop-blur-md select-none">
              <button
                type="button"
                onClick={() => setIsYearly(false)}
                className={`px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer ${!isYearly
                  ? "bg-[#26455E] text-white shadow-md shadow-[#26455E]/20"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Bulanan
              </button>
              <button
                type="button"
                onClick={() => setIsYearly(true)}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer ${isYearly
                  ? "bg-[#26455E] text-white shadow-md shadow-[#26455E]/20"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                <span>Tahunan</span>
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full transition-colors ${isYearly
                    ? "bg-sky-400 text-[#142636]"
                    : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    }`}
                >
                  Hemat 20%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Cards Grid */}
          <div className="mt-7 sm:mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-7 items-stretch max-w-5xl mx-auto">
            {/* Card 1: Lite Plan */}
            <div className="relative group rounded-[28px] p-px transition-all duration-500 hover:-translate-y-1.5 flex flex-col">
              {/* Outer Glow & Gradient Border on Hover */}
              <div className="absolute -inset-0.5 rounded-[30px] bg-gradient-to-b from-sky-400 via-blue-400 to-transparent opacity-0 group-hover:opacity-100 blur-sm transition-all duration-500 pointer-events-none" />
              <div className="absolute inset-0 rounded-[28px] bg-gradient-to-b from-sky-400 via-blue-300 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              {/* Card Container Inner */}
              <div className="relative z-10 w-full h-full rounded-[27px] p-7 sm:p-8 bg-white border border-slate-200/90 group-hover:border-transparent shadow-sm group-hover:shadow-[0_16px_36px_rgba(56,189,248,0.18)] transition-all duration-500 flex flex-col justify-between overflow-hidden">
                {/* Subtle Grid Mask Background Effect from 21st.dev/aymanch-03 */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:28px_28px] opacity-70 [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] pointer-events-none rounded-[27px]" />

                <div className="relative z-10">
                  {/* Price Header */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1.5">
                      <NumberFlow
                        value={isYearly ? 758400 : 79000}
                        locales="id-ID"
                        format={{
                          style: "currency",
                          currency: "IDR",
                          maximumFractionDigits: 0,
                        }}
                        className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight tabular-nums"
                      />
                      <span className="text-sm font-semibold text-slate-500 whitespace-nowrap">
                        {isYearly ? "/tahun" : "/bulan"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-1 tracking-wide">
                      {isYearly
                        ? "Lite Plan • Setara Rp 63.200/bln (Hemat Rp 189.600)"
                        : "Lite Plan • Fleksibel bayar per bulan"}
                    </p>
                  </div>

                  <div className="h-px bg-slate-100 my-6" />

                  {/* Features List */}
                  <ul className="space-y-4 text-xs sm:text-[13px] text-slate-600">
                    <li className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-700" />
                      </div>
                      <span>Hingga 2 cabang toko aktif</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-700" />
                      </div>
                      <span>Checklist audit digital dasar</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-700" />
                      </div>
                      <span>Riwayat audit &amp; skor standar</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-700" />
                      </div>
                      <span>Dukungan email komunitas</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-700" />
                      </div>
                      <span>Fitur keamanan dasar</span>
                    </li>
                  </ul>
                </div>

                {/* Bottom CTA Button with Expand Arrow */}
                <div className="relative z-10 mt-8 pt-4">
                  <Link
                    href={getPackageActionUrl("Lite Plan", 79000, 758400)}
                    className="group/btn w-full py-3 px-4 rounded-full border-2 border-[#26455E] bg-blue-50/80 group-hover:bg-[#26455E] text-[#26455E] group-hover:text-white text-xs font-bold tracking-wide transition-all duration-300 text-center flex items-center justify-center gap-1.5 shadow-xs group-hover:shadow-[0_4px_18px_rgba(38,69,94,0.35)]"
                  >
                    <span>Pilih Paket Lite</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover/btn:translate-x-1" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Card 2: Standard Plan (Middle Card - Highlighted & Popular from 21st.dev) */}
            <div className="relative group rounded-[28px] p-px transition-all duration-500 hover:-translate-y-2 md:-translate-y-2 flex flex-col">
              {/* Glowing Gradient Border (Only Visible on Hover) */}
              <div className="absolute -inset-0.5 rounded-[30px] bg-gradient-to-b from-[#26455E] via-sky-400 to-blue-500 opacity-0 group-hover:opacity-100 blur-sm group-hover:blur-md transition-all duration-500 pointer-events-none" />
              <div className="absolute inset-0 rounded-[28px] bg-gradient-to-b from-[#26455E] via-sky-400 to-[#26455E] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              {/* Card Container Inner */}
              <div className="relative z-10 w-full h-full rounded-[27px] p-7 sm:p-8 bg-white border border-slate-200/90 group-hover:border-transparent shadow-sm group-hover:shadow-[0_20px_45px_rgba(38,69,94,0.25)] transition-all duration-500 flex flex-col justify-between overflow-hidden">
                {/* Subtle Grid Mask Background Effect from 21st.dev/aymanch-03 */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:28px_28px] opacity-70 [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] pointer-events-none rounded-[27px]" />

                <div className="relative z-10">
                  {/* Most Popular Badge from 21st.dev */}

                  {/* Price Header */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1.5">
                      <NumberFlow
                        value={isYearly ? 1910400 : 199000}
                        locales="id-ID"
                        format={{
                          style: "currency",
                          currency: "IDR",
                          maximumFractionDigits: 0,
                        }}
                        className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 group-hover:text-[#26455E] tracking-tight transition-colors duration-300 tabular-nums"
                      />
                      <span className="text-sm font-semibold text-slate-500 whitespace-nowrap">
                        {isYearly ? "/tahun" : "/bulan"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-1 tracking-wide">
                      {isYearly
                        ? "Standard Plan • Setara Rp 159.200/bln (Hemat Rp 477.600)"
                        : "Standard Plan • Fleksibel bayar per bulan"}
                    </p>
                  </div>

                  <div className="h-px bg-slate-100 my-6" />

                  {/* Features List */}
                  <ul className="space-y-4 text-xs sm:text-[13px] text-slate-600 group-hover:text-slate-700 transition-colors">
                    <li className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-slate-100 group-hover:bg-sky-50 flex items-center justify-center shrink-0 transition-colors duration-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-700 group-hover:text-sky-600 transition-colors duration-300" />
                      </div>
                      <span className="font-medium text-slate-800">Hingga 15 cabang toko aktif</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-slate-100 group-hover:bg-sky-50 flex items-center justify-center shrink-0 transition-colors duration-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-700 group-hover:text-sky-600 transition-colors duration-300" />
                      </div>
                      <span>Checklist dinamis &amp; custom template</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-slate-100 group-hover:bg-sky-50 flex items-center justify-center shrink-0 transition-colors duration-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-700 group-hover:text-sky-600 transition-colors duration-300" />
                      </div>
                      <span>Validasi Geotagging &amp; foto bukti</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-slate-100 group-hover:bg-sky-50 flex items-center justify-center shrink-0 transition-colors duration-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-700 group-hover:text-sky-600 transition-colors duration-300" />
                      </div>
                      <span>Ekspor riwayat ke PDF &amp; Excel</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-slate-100 group-hover:bg-sky-50 flex items-center justify-center shrink-0 transition-colors duration-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-700 group-hover:text-sky-600 transition-colors duration-300" />
                      </div>
                      <span>Priority email support &amp; SLA</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-slate-100 group-hover:bg-sky-50 flex items-center justify-center shrink-0 transition-colors duration-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-700 group-hover:text-sky-600 transition-colors duration-300" />
                      </div>
                      <span>Advanced security features</span>
                    </li>
                  </ul>
                </div>

                {/* Bottom CTA Button with Expand Arrow */}
                <div className="relative z-10 mt-8 pt-4">
                  <Link
                    href={getPackageActionUrl("Standard Plan", 199000, 1910400)}
                    className="group/btn w-full py-3 px-4 rounded-full border-2 border-[#26455E] bg-blue-50/80 group-hover:bg-[#26455E] text-[#26455E] group-hover:text-white text-xs font-bold tracking-wide transition-all duration-300 text-center flex items-center justify-center gap-1.5 shadow-xs group-hover:shadow-[0_4px_18px_rgba(38,69,94,0.35)]"
                  >
                    <span>Pilih Paket Standard</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover/btn:translate-x-1" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Card 3: Enterprise */}
            <div className="relative group rounded-[28px] p-px transition-all duration-500 hover:-translate-y-1.5 flex flex-col">
              {/* Outer Glow & Gradient Border on Hover */}
              <div className="absolute -inset-0.5 rounded-[30px] bg-gradient-to-b from-blue-600 via-sky-400 to-transparent opacity-0 group-hover:opacity-100 blur-sm transition-all duration-500 pointer-events-none" />
              <div className="absolute inset-0 rounded-[28px] bg-gradient-to-b from-blue-600 via-sky-300 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              {/* Card Container Inner */}
              <div className="relative z-10 w-full h-full rounded-[27px] p-7 sm:p-8 bg-white border border-slate-200/90 group-hover:border-transparent shadow-sm group-hover:shadow-[0_16px_36px_rgba(37,99,235,0.18)] transition-all duration-500 flex flex-col justify-between overflow-hidden">
                {/* Subtle Grid Mask Background Effect from 21st.dev/aymanch-03 */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:28px_28px] opacity-70 [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] pointer-events-none rounded-[27px]" />

                <div className="relative z-10">
                  {/* Price Header */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1.5">
                      <NumberFlow
                        value={isYearly ? 3830400 : 399000}
                        locales="id-ID"
                        format={{
                          style: "currency",
                          currency: "IDR",
                          maximumFractionDigits: 0,
                        }}
                        className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight tabular-nums"
                      />
                      <span className="text-sm font-semibold text-slate-500 whitespace-nowrap">
                        {isYearly ? "/tahun" : "/bulan"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-1 tracking-wide">
                      {isYearly
                        ? "Enterprise • Setara Rp 319.200/bln (Hemat Rp 957.600)"
                        : "Enterprise • Fleksibel bayar per bulan"}
                    </p>
                  </div>

                  <div className="h-px bg-slate-100 my-6" />

                  {/* Features List */}
                  <ul className="space-y-4 text-xs sm:text-[13px] text-slate-600">
                    <li className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-700" />
                      </div>
                      <span>Cabang toko &amp; auditor tanpa batas</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-700" />
                      </div>
                      <span>Comprehensive transaction analytics</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-700" />
                      </div>
                      <span>Sistem Tiket CAPA &amp; SLA Manager</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-700" />
                      </div>
                      <span>24/7 dedicated priority support</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-700" />
                      </div>
                      <span>Akses API &amp; Webhook integrasi</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-700" />
                      </div>
                      <span>Enhanced enterprise security</span>
                    </li>
                  </ul>
                </div>

                {/* Bottom CTA Button with Expand Arrow */}
                <div className="relative z-10 mt-8 pt-4">
                  <Link
                    href={getPackageActionUrl("Enterprise", 399000, 3830400)}
                    className="group/btn w-full py-3 px-4 rounded-full border-2 border-[#26455E] bg-blue-50/80 group-hover:bg-[#26455E] text-[#26455E] group-hover:text-white text-xs font-bold tracking-wide transition-all duration-300 text-center flex items-center justify-center gap-1.5 shadow-xs group-hover:shadow-[0_4px_18px_rgba(38,69,94,0.35)]"
                  >
                    <span>Pilih Paket Enterprise</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover/btn:translate-x-1" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. FAQ SECTION (Seamless Background Matching Website Theme)
         ========================================================================= */}
      <section
        id="faq"
        className="pt-20 sm:pt-24 pb-20 sm:pb-24 bg-transparent text-slate-900 scroll-mt-0 border-t border-slate-300/40 relative overflow-hidden"
      >
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-12 sm:mb-14">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#26455E] mb-2">
              Pusat Informasi
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Pertanyaan yang Sering Diajukan
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 max-w-lg mx-auto">
              Segala hal yang perlu Anda ketahui tentang sistem dan platform StoreAudit
            </p>
          </div>

          {/* FAQ Accordion Cards (Centered Single Column Layout) */}
          <div className="space-y-3.5 sm:space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div
                  key={idx}
                  className={`rounded-2xl border transition-all duration-300 overflow-hidden ${isOpen
                    ? "border-[#26455E]/50 bg-white shadow-md ring-1 ring-[#26455E]/15"
                    : "border-slate-200/90 hover:border-slate-300 bg-white hover:bg-white/95 shadow-sm hover:shadow-md"
                    }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="w-full flex items-center justify-between px-6 py-4.5 sm:py-5 text-left cursor-pointer group select-none"
                  >
                    <span
                      className={`font-semibold text-sm sm:text-[15px] pr-4 transition-colors ${isOpen ? "text-[#26455E]" : "text-slate-800 group-hover:text-[#26455E]"
                        }`}
                    >
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180 text-[#26455E]" : "text-slate-400 group-hover:text-slate-600"
                        }`}
                    />
                  </button>

                  {/* Expandable Answer with smooth CSS grid transition */}
                  <div
                    className={`grid transition-all duration-300 ease-in-out ${isOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0 pointer-events-none"
                      }`}
                  >
                    <div className="overflow-hidden">
                      <div className="px-6 pb-5 pt-1 text-slate-600 text-sm leading-relaxed border-t border-slate-100">
                        {faq.answer}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          8. CALL TO ACTION BANNER (Background #26455E)
         ========================================================================= */}
      <section data-theme="dark" className="bg-[#26455E] text-white py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
            Siap Meningkatkan Standar Kepatuhan Toko Anda?
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-200 max-w-2xl mx-auto leading-relaxed">
            Bergabunglah dengan ratusan jaringan toko ritel modern yang telah mengadopsi
            StoreAudit untuk proses audit yang lebih cepat, transparan, dan akurat.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-7 py-3.5 rounded-lg bg-white hover:bg-slate-100 text-[#26455E] font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>Daftar Akun Baru Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-7 py-3.5 rounded-lg border border-white/30 hover:bg-white/10 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
            >
              <span>Sudah Punya Akun? Masuk</span>
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          9. FOOTER
         ========================================================================= */}
      <footer className="bg-slate-900 text-white py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold tracking-tight text-white">
                StoreAudit
              </span>
            </div>

            <div className="flex items-center gap-6 text-xs text-slate-400">
              <a
                href="#home"
                onClick={(e) => scrollToSection(e, "#home")}
                className="hover:text-white transition-colors"
              >
                Home
              </a>
              <a
                href="#fitur"
                onClick={(e) => scrollToSection(e, "#fitur")}
                className="hover:text-white transition-colors"
              >
                Fitur
              </a>
              <a
                href="#alur"
                onClick={(e) => scrollToSection(e, "#alur")}
                className="hover:text-white transition-colors"
              >
                Alur Kerja
              </a>
              <a
                href="#keunggulan"
                onClick={(e) => scrollToSection(e, "#keunggulan")}
                className="hover:text-white transition-colors"
              >
                Keunggulan
              </a>
              <a
                href="#pricing"
                onClick={(e) => scrollToSection(e, "#pricing")}
                className="hover:text-white transition-colors"
              >
                Harga
              </a>
              <a
                href="#faq"
                onClick={(e) => scrollToSection(e, "#faq")}
                className="hover:text-white transition-colors"
              >
                FAQ
              </a>
              <Link href="/login" className="hover:text-white transition-colors">
                Portal Login
              </Link>
              <Link href="/register" className="hover:text-white transition-colors">
                Registrasi
              </Link>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
            <p>© 2026 Audit Pro Enterprise Monitor. All rights reserved.</p>
            <p>Platform Monitoring &amp; Audit Toko Terintegrasi</p>
          </div>
        </div>
      </footer>

      {/* Floating Back to Top Button */}
      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Kembali ke atas"
          className="fixed bottom-6 right-6 z-50 p-3 rounded-full bg-[#26455E] text-white shadow-lg hover:bg-[#1e384b] hover:shadow-xl transition-all duration-300 focus:outline-none cursor-pointer flex items-center justify-center group"
        >
          <ArrowUp className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      )}
    </div>
  );
}
