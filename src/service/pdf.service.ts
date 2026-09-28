// Service Generate PDF laporan pelanggaran (Requirement 7) pakai pdfkit.
import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";
import type { Response } from "express";

interface ReportData {
  id: string;
  location: string;
  coordinate: { lat: number; lng: number };
  date: string;
  timestamp: string;
  mediaName: string | null;
  zoneName: string | null;
  status: string;
  confidence: number;
  evidencePath: string | null;
  targetAgency: string;
}

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

export default { streamReportPdf };