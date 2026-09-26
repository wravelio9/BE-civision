// Service Laporan (Requirement 7): sediakan data laporan pelanggaran dalam
// format tabel (ID | Jalan | Date | Timestamp | Media | Status | Download).
import prisma from "../db/prisma.js";

function pad(n: number) { return n.toString().padStart(2, "0"); }

class ReportService {
  // Daftar laporan (baris tabel). Sembunyikan yang invalid (soft-delete).
  static async listTable() {
    const violations = await prisma.violation.findMany({
      where: { status: { not: "invalid" } },
      include: { analysis: { include: { media: true } }, annotatedFrames: true },
      orderBy: { createdAt: "desc" },
    });

    return violations.map((v) => {
      const t = v.createdAt;
      return {
        id: v.id,
        // "Jalan" dari address (hasil reverse geocode); fallback koordinat bila kosong.
        jalan: v.address ?? `${v.lat.toFixed(5)}, ${v.lng.toFixed(5)}`,
        date: `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`,
        timestamp: `${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`,
        media: v.analysis?.media?.originalName ?? null,
        status: v.status,          // unverified | valid
        // Link download PDF laporan pelanggaran ini.
        downloadUrl: `/api/reports/${v.id}/pdf`,
        // data pendukung (buat frontend bila perlu)
        coordinate: { lat: v.lat, lng: v.lng },
        evidenceUrl: v.annotatedFrames[0]?.imagePath ?? null,
      };
    });
  }

  // Data 1 laporan (buat isi PDF).
  static async getOne(violationId: string) {
    const v = await prisma.violation.findUnique({
      where: { id: violationId },
      include: { analysis: { include: { media: true } }, zone: true, annotatedFrames: true },
    });
    if (!v) return null;
    const t = v.createdAt;
    return {
      id: v.id,
      jalan: v.address ?? `${v.lat.toFixed(5)}, ${v.lng.toFixed(5)}`,
      coordinate: { lat: v.lat, lng: v.lng },
      date: `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`,
      timestamp: `${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`,
      media: v.analysis?.media?.originalName ?? null,
      zoneName: v.zone?.name ?? null,
      status: v.status,
      confidence: v.confidence,
      evidenceUrl: v.annotatedFrames[0]?.imagePath ?? null,
      targetAgency: "Satpol PP / Dishub",
    };
  }
}

export default ReportService;