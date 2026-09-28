// Repository Riwayat Analisis: membungkus akses database (Prisma) untuk entitas Analysis.
// Pemetaan bentuk response TIDAK di sini — itu di HistoryService.
import prisma from "../db/prisma.js";

class HistoryRepository {
  // Semua analisis, terbaru -> terlama, dengan media & pelanggaran aktif.
  static findAll() {
    return prisma.analysis.findMany({
      orderBy: { analyzedAt: "desc" },
      include: {
        media: true,
        violations: { where: { status: { not: "invalid" } } },
      },
    });
  }

  // Satu analisis lengkap dengan media, zona, dan frame beranotasi.
  static findById(id: string) {
    return prisma.analysis.findUnique({
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
  }
}

export default HistoryRepository;
