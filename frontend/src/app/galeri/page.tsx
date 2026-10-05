"use client";

import React, { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Search,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Store,
  AlertTriangle,
  ZoomIn,
  SlidersHorizontal,
} from "lucide-react";
import { GalleryService } from "@/services/gallery.service";
import { AuditGalleryLog, AuditPhoto } from "@/types/gallery";
import PhotoDetailModal from "./components/PhotoDetailModal";
import FilterModal, { GalleryFilterState } from "./components/FilterModal";

export default function GaleriPage() {
  const [logs] = useState<AuditGalleryLog[]>(GalleryService.getAll());
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStore, setSelectedStore] = useState<string>("Semua Toko");
  const [selectedStatus, setSelectedStatus] = useState<"Semua Status" | "Memiliki Issue" | "Semua Sesuai">("Semua Status");
  const [isStoreDropdownOpen, setIsStoreDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Advanced Filters
  const [advancedFilters, setAdvancedFilters] = useState<GalleryFilterState>({
    dateRange: "all",
    category: "Semua Kategori",
    onlyIssues: false,
  });

  // Modal / Lightbox State
  const [activeModalPhoto, setActiveModalPhoto] = useState<{
    photo: AuditPhoto;
    log: AuditGalleryLog;
    index: number;
  } | null>(null);

  // Fallback image error handler directly mutating src safely
  const handleImageError = (category: string, e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.currentTarget;
    const fallback = GalleryService.getFallbackForCategory(category);
    if (target.src !== fallback) {
      target.src = fallback;
    }
  };

  // Pagination State (4 cards per page as shown in screenshot)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  const storesList = useMemo(() => {
    return ["Semua Toko", ...GalleryService.getStoresList()];
  }, []);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // 1. Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm ||
        log.storeName.toLowerCase().includes(searchLower) ||
        log.scheduleTitle.toLowerCase().includes(searchLower) ||
        log.date.toLowerCase().includes(searchLower);

      if (!matchSearch) return false;

      // 2. Store dropdown filter
      if (selectedStore !== "Semua Toko" && log.storeName !== selectedStore) {
        return false;
      }

      // 3. Status dropdown filter
      if (selectedStatus === "Memiliki Issue" && log.status !== "Issue") {
        return false;
      }
      if (selectedStatus === "Semua Sesuai" && log.status !== "Semua Sesuai") {
        return false;
      }

      // 4. Advanced: Only issues
      if (advancedFilters.onlyIssues && log.status !== "Issue") {
        return false;
      }

      // 5. Advanced: Category filter
      if (advancedFilters.category !== "Semua Kategori") {
        const hasMatchingCat = log.photos.some(
          (p) => p.category === advancedFilters.category
        );
        if (!hasMatchingCat) return false;
      }

      return true;
    });
  }, [logs, searchTerm, selectedStore, selectedStatus, advancedFilters]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  const totalFilteredCount = filteredLogs.length;
  const startItem = totalFilteredCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalFilteredCount);

  // Active filter count indicator
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (advancedFilters.dateRange !== "all") count++;
    if (advancedFilters.category !== "Semua Kategori") count++;
    if (advancedFilters.onlyIssues) count++;
    return count;
  }, [advancedFilters]);

  // Modal navigation handlers
  const handleOpenPhoto = (log: AuditGalleryLog, photo: AuditPhoto, index: number) => {
    setActiveModalPhoto({ log, photo, index });
  };

  const handleNextPhoto = () => {
    if (!activeModalPhoto) return;
    const nextIdx = activeModalPhoto.index + 1;
    if (nextIdx < activeModalPhoto.log.photos.length) {
      setActiveModalPhoto({
        log: activeModalPhoto.log,
        photo: activeModalPhoto.log.photos[nextIdx],
        index: nextIdx,
      });
    }
  };

  const handlePrevPhoto = () => {
    if (!activeModalPhoto) return;
    const prevIdx = activeModalPhoto.index - 1;
    if (prevIdx >= 0) {
      setActiveModalPhoto({
        log: activeModalPhoto.log,
        photo: activeModalPhoto.log.photos[prevIdx],
        index: prevIdx,
      });
    }
  };

  return (
    <DashboardLayout>
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Galeri Foto Audit
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-600 text-xs font-semibold">
              Workspace A
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Dokumentasi bukti foto kepatuhan operasional dan inspeksi checklist toko
          </p>
        </div>
      </div>

      {/* Main Container */}
      <div className="space-y-3.5">
        {/* Search & Filter Toolbar */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-3.5 shadow-2xs">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari nama toko, jadwal, atau tanggal..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#193f53]/20 focus:border-[#193f53] transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Filter Group */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Dropdown Toko */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsStoreDropdownOpen(!isStoreDropdownOpen);
                    setIsStatusDropdownOpen(false);
                  }}
                  className={`flex items-center justify-between gap-2 px-3 py-2 bg-white border ${
                    selectedStore !== "Semua Toko"
                      ? "border-blue-500 text-blue-600 bg-blue-50/40"
                      : "border-slate-200 text-slate-700"
                  } rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer min-w-[130px]`}
                >
                  <span className="truncate max-w-[120px]">{selectedStore}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>

                {isStoreDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setIsStoreDropdownOpen(false)}
                    />
                    <div className="absolute right-0 lg:left-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-30 max-h-60 overflow-y-auto">
                      {storesList.map((store) => (
                        <button
                          key={store}
                          type="button"
                          onClick={() => {
                            setSelectedStore(store);
                            setIsStoreDropdownOpen(false);
                            setCurrentPage(1);
                          }}
                          className={`w-full text-left px-3.5 py-2 text-xs font-medium transition-colors ${
                            selectedStore === store
                              ? "bg-blue-50 text-blue-600 font-bold"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {store}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Advanced Filter Button */}
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-2 bg-white border ${
                  activeFilterCount > 0
                    ? "border-blue-500 text-blue-600 bg-blue-50/40"
                    : "border-slate-200 text-slate-700"
                } rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filter</span>
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Dropdown Status */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsStatusDropdownOpen(!isStatusDropdownOpen);
                    setIsStoreDropdownOpen(false);
                  }}
                  className={`flex items-center justify-between gap-2 px-3 py-2 bg-white border ${
                    selectedStatus !== "Semua Status"
                      ? "border-blue-500 text-blue-600 bg-blue-50/40"
                      : "border-slate-200 text-slate-700"
                  } rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer min-w-[130px]`}
                >
                  <span>{selectedStatus}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>

                {isStatusDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setIsStatusDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-30">
                      {[
                        "Semua Status",
                        "Memiliki Issue",
                        "Semua Sesuai",
                      ].map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => {
                            setSelectedStatus(status as any);
                            setIsStatusDropdownOpen(false);
                            setCurrentPage(1);
                          }}
                          className={`w-full text-left px-3.5 py-2 text-xs font-medium transition-colors ${
                            selectedStatus === status
                              ? "bg-blue-50 text-blue-600 font-bold"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Audit Cards List */}
        {paginatedLogs.length > 0 ? (
          <div className="space-y-3">
            {paginatedLogs.map((log) => (
              <div
                key={log.id}
                className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-xs transition-shadow hover:shadow-sm"
              >
                {/* Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                  <div className="flex flex-wrap items-center gap-2 text-xs sm:text-[13px]">
                    <div className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                      <Store className="w-3 h-3" />
                    </div>
                    <span className="font-bold text-slate-900">
                      {log.storeName}
                    </span>
                    <span className="text-slate-300 font-bold">·</span>
                    <span className="text-slate-600 font-medium">
                      {log.scheduleTitle}
                    </span>
                    <span className="text-slate-300 font-bold">·</span>
                    <span className="text-slate-500 font-normal text-[11px] sm:text-xs">
                      {log.date}
                    </span>
                  </div>

                  {/* Status Badge Right */}
                  <div className="shrink-0">
                    {log.status === "Issue" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 border border-rose-200 text-rose-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        Issue ({log.issueCount})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Semua Sesuai
                      </span>
                    )}
                  </div>
                </div>

                {/* Photos Compact Row (Smaller size) */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 pt-2.5">
                  {log.photos.map((photo, index) => (
                    <div
                      key={photo.id}
                      onClick={() => handleOpenPhoto(log, photo, index)}
                      className={`relative w-[76px] h-[76px] sm:w-[86px] sm:h-[86px] md:w-[92px] md:h-[92px] rounded-lg sm:rounded-xl overflow-hidden cursor-pointer group shrink-0 transition-all duration-200 hover:shadow-md hover:scale-[1.04] bg-slate-100 ${
                        photo.hasIssue
                          ? "border-2 border-rose-500 ring-2 ring-rose-100"
                          : "border border-slate-200 hover:border-slate-300"
                      }`}
                      title={`${photo.caption} - ${photo.checklistQuestion}`}
                    >
                      {/* Photo Image */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt={photo.caption}
                        onError={(e) => handleImageError(photo.category, e)}
                        className="w-full h-full object-cover group-hover:brightness-95 transition-all"
                        loading="lazy"
                      />

                      {/* Issue Tag on Image */}
                      {photo.hasIssue && (
                        <div className="absolute top-1 left-1/2 -translate-x-1/2 z-10 px-1.5 py-0.2 rounded bg-rose-600 text-white font-extrabold text-[7.5px] sm:text-[8px] tracking-wider uppercase flex items-center gap-0.5 shadow-xs whitespace-nowrap">
                          <AlertTriangle className="w-2 h-2" />
                          ISSUE
                        </div>
                      )}

                      {/* Hover Overlay with Preview Icon */}
                      <div className="absolute inset-0 bg-slate-950/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-white/90 text-slate-800 flex items-center justify-center shadow-md">
                          <ZoomIn className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center shadow-xs">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-800">
              Tidak Ada Foto Audit Ditemukan
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
              Tidak ada hasil yang sesuai dengan kriteria pencarian atau filter yang dipilih. Coba ubah kata kunci atau reset filter.
            </p>
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedStore("Semua Toko");
                setSelectedStatus("Semua Status");
                setAdvancedFilters({
                  dateRange: "all",
                  category: "Semua Kategori",
                  onlyIssues: false,
                });
              }}
              className="mt-3.5 px-3.5 py-1.5 bg-[#193f53] text-white rounded-lg text-xs font-semibold hover:bg-[#143343] transition-colors cursor-pointer"
            >
              Reset Semua Filter
            </button>
          </div>
        )}

        {/* Pagination Section */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-wrap gap-3 items-center justify-between">
          <p className="text-[11px] text-slate-500">
            Menampilkan <span className="font-bold text-slate-900">{startItem}-{endItem}</span> dari{" "}
            <span className="font-bold text-slate-900">{totalFilteredCount} toko terverifikasi</span>
          </p>

          <div className="flex gap-1 text-[11px]">
            {/* Prev Button */}
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 transition-colors ${
                currentPage === 1
                  ? "text-slate-300 border-slate-100 cursor-not-allowed"
                  : "text-slate-600 hover:bg-slate-50 cursor-pointer"
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page Numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs transition-colors cursor-pointer ${
                  currentPage === page
                    ? "bg-[#193f53] text-white shadow-2xs"
                    : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {page}
              </button>
            ))}

            {/* Next Button */}
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`px-3 h-7 flex items-center justify-center rounded-md border border-slate-200 font-bold ml-1 transition-colors ${
                currentPage === totalPages
                  ? "text-slate-300 border-slate-100 cursor-not-allowed"
                  : "text-slate-600 hover:bg-slate-50 cursor-pointer"
              }`}
            >
              Selanjutnya <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox / Detail Photo Modal */}
      {activeModalPhoto && (
        <PhotoDetailModal
          isOpen={!!activeModalPhoto}
          photo={activeModalPhoto.photo}
          log={activeModalPhoto.log}
          currentIndex={activeModalPhoto.index + 1}
          totalPhotos={activeModalPhoto.log.photos.length}
          hasPrev={activeModalPhoto.index > 0}
          hasNext={activeModalPhoto.index < activeModalPhoto.log.photos.length - 1}
          onPrev={handlePrevPhoto}
          onNext={handleNextPhoto}
          onSelectPhotoIndex={(idx) => {
            if (activeModalPhoto) {
              setActiveModalPhoto({
                log: activeModalPhoto.log,
                photo: activeModalPhoto.log.photos[idx],
                index: idx,
              });
            }
          }}
          onClose={() => setActiveModalPhoto(null)}
        />
      )}

      {/* Advanced Filter Modal */}
      <FilterModal
        isOpen={isFilterModalOpen}
        filters={advancedFilters}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={(newFilters) => {
          setAdvancedFilters(newFilters);
          setCurrentPage(1);
        }}
        onReset={() => {
          setAdvancedFilters({
            dateRange: "all",
            category: "Semua Kategori",
            onlyIssues: false,
          });
          setCurrentPage(1);
        }}
      />
    </DashboardLayout>
  );
}
