// Service Laporan (Requirement 7): statistik + tabel laporan + data 1 laporan (buat PDF).
// Tabel menampilkan SEMUA status (valid/invalid/unverified).
import prisma from "../db/prisma.js";

function pad(n: number) { return n.toString().padStart(2, "0"); }

class ReportService {
  // Statistik untuk kartu di atas tabel (total/valid/invalid/unverified).
  static async stats() {
    const [total, valid, invalid, unverified] = await Promise.all([
      prisma.violation.count(),
      prisma.violation.count({ where: { status: "valid" } }),
      prisma.violation.count({ where: { status: "invalid" } }),
      prisma.violation.count({ where: { status: "unverified" } }),
    ]);
    return { total, valid, invalid, unverified };
  }

  // Daftar laporan (baris tabel) - SEMUA status ditampilkan.
  static async listTable() {
    const violations = await prisma.violation.findMany({
      include: { analysis: { include: { media: true } }, annotatedFrames: true },
      orderBy: { createdAt: "desc" },
    });

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
  static async getOne(violationId: string) {
    const v = await prisma.violation.findUnique({
      where: { id: violationId },
      include: { analysis: { include: { media: true } }, zone: true, annotatedFrames: true },
    });
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