// Service Laporan (Requirement 7): statistik + tabel laporan + data 1 laporan
// + generate PDF laporan (pdfkit). Semua bagian ini hanya dipakai oleh ReportController.
// Tabel menampilkan SEMUA status (valid/invalid/unverified).
// Akses database didelegasikan ke ReportRepository.
import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";
import type { Response } from "express";
import ReportRepository from "../repository/report.repository.js";
import type {
  ReportData,
  PaginationParams,
  ReportListResult,
} from "../interface/report.interface.js";

// Error validasi laporan (mis. query pagination tidak valid). Controller
// menerjemahkannya jadi response { ok: false, message } dengan status ini.
export class ReportError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

// Aturan pagination GET /api/reports.
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const INVALID_PAGINATION_MESSAGE = "Parameter page/pageSize tidak valid.";

// Ubah satu nilai query jadi bilangan bulat positif.
// - tidak dikirim  -> pakai nilai default
// - bukan angka bulat (mis. "abc", "1.5", "-1", dikirim 2x) -> null (tidak valid)
function parsePositiveInt(raw: unknown, defaultValue: number): number | null {
  if (raw === undefined) {
    return defaultValue;
  }
  if (typeof raw !== "string" || !/^[0-9]+$/.test(raw)) {
    return null;
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value)) {
    return null;
  }
  return value;
}

// Format tanggal & jam dalam zona Asia/Jakarta (WIB). Server (Vercel) berjalan
// di UTC, jadi getHours() dkk. akan mundur 7 jam; Intl dipakai agar selalu WIB.
const jakartaFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23", // 00-23 (bukan 24:00:00 untuk tengah malam)
});

// -> { date: "DD/MM/YYYY", timestamp: "HH:MM:SS" }
function formatJakarta(t: Date): { date: string; timestamp: string } {
  const parts: Record<string, string> = {};
  for (const part of jakartaFormatter.formatToParts(t)) {
    parts[part.type] = part.value;
  }
  return {
    date: `${parts.day}/${parts.month}/${parts.year}`,
    timestamp: `${parts.hour}:${parts.minute}:${parts.second}`,
  };
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
  let imgPath: string | null = null;
  if (data.evidencePath) {
    imgPath = path.resolve(process.cwd(), data.evidencePath);
  }
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

  // Validasi query ?page=&pageSize=. Lempar ReportError (400) bila tidak valid.
  // page >= 1 (default 1), pageSize 1-50 (default 10).
  static parsePagination(query: { page?: unknown; pageSize?: unknown }): PaginationParams {
    const page = parsePositiveInt(query.page, DEFAULT_PAGE);
    const pageSize = parsePositiveInt(query.pageSize, DEFAULT_PAGE_SIZE);

    if (page === null || page < 1) {
      throw new ReportError(INVALID_PAGINATION_MESSAGE);
    }
    if (pageSize === null || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
      throw new ReportError(INVALID_PAGINATION_MESSAGE);
    }
    return { page, pageSize };
  }

  // Satu halaman laporan (baris tabel) - SEMUA status ditampilkan.
  // page melebihi totalPages -> reports kosong, pagination tetap diisi (bukan error).
  static async listTable({ page, pageSize }: PaginationParams): Promise<ReportListResult> {
    const skip = (page - 1) * pageSize;
    const [violations, totalItems] = await ReportRepository.findAllWithRelations(skip, pageSize);

    const reports = violations.map((v) => {
      const { date, timestamp } = formatJakarta(v.createdAt);
      return {
        id: v.id,
        // "Location" dari address (reverse geocode); fallback koordinat bila kosong.
        location: v.address ?? `${v.lat.toFixed(5)}, ${v.lng.toFixed(5)}`,
        date,
        timestamp,
        // "Media (Link)": frame beranotasi bila ada; selain itu URL publik foto asli
        // di Supabase (alur analisis saat ini tidak membuat AnnotatedFrame).
        mediaUrl: v.annotatedFrames[0]?.imagePath ?? v.analysis?.media?.storagePath ?? null,
        mediaName: v.analysis?.media?.originalName ?? null,
        status: v.status,                                    // valid | invalid | unverified
        downloadUrl: `/api/reports/${v.id}/pdf`,             // kolom Download
        coordinate: { lat: v.lat, lng: v.lng },
      };
    });

    return {
      reports,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize), // 0 bila totalItems = 0
      },
    };
  }

  // Data 1 laporan (buat isi PDF).
  static async getOne(violationId: string): Promise<ReportData | null> {
    const v = await ReportRepository.findByIdWithRelations(violationId);
    if (!v) return null;
    const { date, timestamp } = formatJakarta(v.createdAt);
    return {
      id: v.id,
      location: v.address ?? `${v.lat.toFixed(5)}, ${v.lng.toFixed(5)}`,
      coordinate: { lat: v.lat, lng: v.lng },
      date,
      timestamp,
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
