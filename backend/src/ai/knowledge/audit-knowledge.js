/**
 * Knowledge Base & Konteks Data Audit Retail
 * Berisi pedoman SOP audit, kategori checklist standar, dan contoh temuan operasional
 */
const AUDIT_KNOWLEDGE = {
  standarKepatuhan: {
    targetMinimumSkor: "85%",
    kategoriAudit: [
      "Operasional Harian & Kasir (POS, Uang Modal, Mesin EDC)",
      "Visual Merchandising & Planogram (Display Rak, Price Tag)",
      "Kebersihan, Fasilitas & K3 (Jalur Evakuasi, Tabung APAR, Toilet)",
      "Stok & Gudang (FEFO, Penyusunan Karton, Kartu Stok)",
      "Keamanan (CCTV, Alarm Sensor, Brankas)",
      "Pendingin & Cold Storage (Chiller 2-6°C, Freezer minimal -18°C)"
    ],
    klasifikasiTemuan: {
      kritis: "Temuan berisiko tinggi yang dapat menyebabkan kerugian finansial, bahaya keselamatan K3, atau sanksi hukum (harus diselesaikan dalam 1x24 jam).",
      mayor: "Penyimpangan SOP yang berdampak langsung pada operasional atau pengalaman pelanggan (diselesaikan dalam 3x24 jam).",
      minor: "Penyimpangan kecil administratif atau kerapihan yang tidak menghentikan operasional (diselesaikan dalam 7 hari kerja)."
    }
  },
  pedomanTindakanKorektif: [
    "Identifikasi akar masalah (Root Cause Analysis)",
    "Tetapkan PIC (Penanggung Jawab) perbaikan di toko terkait",
    "Dokumentasikan foto bukti sebelum (before) dan sesudah (after) perbaikan",
    "Lakukan re-verifikasi audit pada jadwal kunjungan berikutnya"
  ]
};

function getFormattedKnowledgeContext() {
  return `
Konteks Standar Sistem Audit Retail:
- Target Minimum Skor Kepatuhan: ${AUDIT_KNOWLEDGE.standarKepatuhan.targetMinimumSkor}
- Kategori Checklist: ${AUDIT_KNOWLEDGE.standarKepatuhan.kategoriAudit.join(', ')}
- Tingkat Temuan:
  - Kritis: ${AUDIT_KNOWLEDGE.standarKepatuhan.klasifikasiTemuan.kritis}
  - Mayor: ${AUDIT_KNOWLEDGE.standarKepatuhan.klasifikasiTemuan.mayor}
  - Minor: ${AUDIT_KNOWLEDGE.standarKepatuhan.klasifikasiTemuan.minor}
`.trim();
}

module.exports = {
  AUDIT_KNOWLEDGE,
  getFormattedKnowledgeContext,
};
