// Repository Analisis: membungkus akses database (Prisma) untuk menyimpan
// Analysis beserta Violation-nya secara atomik. Logika bisnis (matching zona,
// threshold confidence, reverse geocode) TIDAK di sini — itu di AnalysisService.
import prisma from "../config/prisma.js";
import type { AnalysisCreateData } from "../interface/analysis.interface.js";

class AnalysisRepository {
  // Ambil semua zona (dipakai untuk point-in-polygon di service).
  static findAllZones() {
    return prisma.zone.findMany();
  }

  // Ambil record MediaFile (cek mediaId valid + lokasi file di storage).
  static findMediaById(id: string) {
    return prisma.mediaFile.findUnique({ where: { id } });
  }

  // Buat Analysis + semua Violation-nya dalam satu transaksi (atomik, Req 4.7).
  static async createAnalysisWithViolations(
    analysisData: AnalysisCreateData,
    violations: any[],
  ) {
    return prisma.$transaction(async (tx) => {
      const analysis = await tx.analysis.create({
        data: {
          mediaId: analysisData.mediaId,
          detectorMode: analysisData.detectorMode,
          status: "done",
          progress: 100,
          photoCount: analysisData.photoCount,
          videoDuration: analysisData.videoDuration,
        },
      });

      for (const v of violations) {
        await tx.violation.create({ data: { ...v, analysisId: analysis.id } });
      }

      return analysis;
    });
  }
}

export default AnalysisRepository;
