// Service Laporan (Requirement 7): statistik + tabel laporan + data 1 laporan
// + generate PDF laporan (pdfkit). Semua bagian ini hanya dipakai oleh ReportController.
// Tabel menampilkan SEMUA status (valid/invalid/unverified).
// Akses database didelegasikan ke ReportRepository.
import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";
import type { Response } from "express";
import ReportRepository from "../repository/report.repository.js";
import type { ReportData } from "../interface/report.interface.js";

function pad(n: number) { return n.toString().padStart(2, "0"); }

// Render laporan langsung ke response (di-stream sebagai file PDF unduhan).
export function streamReportPdf(data: ReportData, res: Response) {
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="laporan-${data.id}.pdf"`);
  doc.pipe(res);

  // Judul
  doc.fontSize(18).text("LAPORAN PELANGGARAN PKL", { align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(11).fillColor("gray").text(`Kepada: ${data.targetAgency}`, { align: "center" });
  doc.moveDown(1);
  doc.fillColor("black");

  // Garis pemisah
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.8);

  // Detail (label : nilai)
  const row = (label: string, value: string) => {
    doc.fontSize(11).fillColor("gray").text(label, { continued: true, width: 150 });
    doc.fillColor("black").text("  " + value);
    doc.moveDown(0.3);
  };
  row("ID Pelanggaran", data.id);
  row("Lokasi", data.location);
  row("Koordinat", `${data.coordinate.lat}, ${data.coordinate.lng}`);
  row("Zona Terlarang", data.zoneName ?? "-");
  row("Tanggal", data.date);
  row("Waktu", data.timestamp);
  row("Status", data.status);
  row("Keyakinan AI", `${(data.confidence * 100).toFixed(1)}%`);
  row("Media", data.mediaName ?? "-");

  doc.moveDown(0.8);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.8);

  // Bukti visual (bila file ada)
  doc.fontSize(12).fillColor("black").text("Bukti Visual:", { underline: true });
  doc.moveDown(0.5);
  const imgPath = data.evidencePath ? path.resolve(process.cwd(), data.evidencePath) : null;
  if (imgPath && fs.existsSync(imgPath)) {
    try {
      doc.image(imgPath, { fit: [480, 360], align: "center" });
    } catch {
      doc.fontSize(10).fillColor("red").text("(Gagal memuat gambar bukti.)");
    }
  } else {
    doc.fontSize(10).fillColor("gray").text("(Bukti visual tidak tersedia.)");
  }

  doc.end();
}

class ReportService {
  static streamReportPdf = streamReportPdf;

  // Statistik untuk kartu di atas tabel (total/valid/invalid/unverified).
  static async stats() {
    const [total, valid, invalid, unverified] = await Promise.all([
      ReportRepository.countAll(),
      ReportRepository.countByStatus("valid"),
      ReportRepository.countByStatus("invalid"),
      ReportRepository.countByStatus("unverified"),
    ]);
    return { total, valid, invalid, unverified };
  }

  // Daftar laporan (baris tabel) - SEMUA status ditampilkan.
  static async listTable() {
    const violations = await ReportRepository.findAllWithRelations();

    return violations.map((v) => {
      const t = v.createdAt;
      return {
        id: v.id,
        // "Location" dari address (reverse geocode); fallback koordinat bila kosong.
        location: v.address ?? `${v.lat.toFixed(5)}, ${v.lng.toFixed(5)}`,
        date: `${pad(t.getDate())}/${pad(t.getMonth() + 1)}/${t.getFullYear()}`,
        timestamp: `${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`,
        mediaUrl: v.annotatedFrames[0]?.imagePath ?? null,   // "Media (Link)"
        mediaName: v.analysis?.media?.originalName ?? null,
        status: v.status,                                    // valid | invalid | unverified
        downloadUrl: `/api/reports/${v.id}/pdf`,             // kolom Download
        coordinate: { lat: v.lat, lng: v.lng },
      };
    });
  }

  // Data 1 laporan (buat isi PDF).
  static async getOne(violationId: string): Promise<ReportData | null> {
    const v = await ReportRepository.findByIdWithRelations(violationId);
    if (!v) return null;
    const t = v.createdAt;
    return {
      id: v.id,
      location: v.address ?? `${v.lat.toFixed(5)}, ${v.lng.toFixed(5)}`,
      coordinate: { lat: v.lat, lng: v.lng },
      date: `${pad(t.getDate())}/${pad(t.getMonth() + 1)}/${t.getFullYear()}`,
      timestamp: `${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`,
      mediaName: v.analysis?.media?.originalName ?? null,
      zoneName: v.zone?.name ?? null,
      status: v.status,
      confidence: v.confidence,
      evidencePath: v.annotatedFrames[0]?.imagePath ?? null,
      targetAgency: "Satpol PP / Dishub",
    };
  }
}

export default ReportService;
