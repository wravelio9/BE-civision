// Service Riwayat Analisis (Requirement 8): daftar analisis lampau + detail laporan.
import prisma from "../db/prisma.js";

class HistoryService {
  // Daftar riwayat, urut terbaru -> terlama (Req 8.3). Sertakan info media & jumlah pelanggaran aktif.
  static async list() {
    const analyses = await prisma.analysis.findMany({
      orderBy: { analyzedAt: "desc" },
      include: {
        media: true,
        violations: { where: { status: { not: "invalid" } } },
      },
    });

    return analyses.map((a) => ({
      id: a.id,
      mediaName: a.media?.originalName ?? null,
      mediaType: a.media?.mediaType ?? null,
      analyzedAt: a.analyzedAt,               // presisi detik (Req 8.1)
      status: a.status,
      totalViolations: a.violations.length,
    }));
  }

  // Detail satu entri riwayat: laporan lengkap (Req 8.5).
  // null jika tidak ditemukan (Req 8.6 ditangani di controller).
  static async getDetail(id: string) {
    const analysis = await prisma.analysis.findUnique({
      where: { id },
      include: {
        media: true,
        violations: {
          where: { status: { not: "invalid" } },
          include: { zone: true, annotatedFrames: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!analysis) return null;

    return {
      id: analysis.id,
      media: analysis.media
        ? { id: analysis.media.id, name: analysis.media.originalName, type: analysis.media.mediaType }
        : null,
      analyzedAt: analysis.analyzedAt,
      status: analysis.status,
      totalViolations: analysis.violations.length,
      violations: analysis.violations.map((v) => ({
        id: v.id,
        lat: v.lat, lng: v.lng,
        zoneId: v.zoneId, zoneName: v.zone?.name ?? null,
        confidence: v.confidence,
        status: v.status, followUp: v.followUp,
        coordinateSource: v.coordinateSource,
        evidenceUrl: v.annotatedFrames[0]?.imagePath ?? null,
        time: v.createdAt,
      })),
    };
  }
}

export default HistoryService;