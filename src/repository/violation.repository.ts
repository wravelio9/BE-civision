// Repository Pelanggaran: membungkus semua akses database (Prisma) untuk entitas Violation.
// Logika bisnis (validasi status, aturan follow-up) TIDAK di sini — itu di ViolationService.
import prisma from "../config/prisma.js";

class ViolationRepository {
  // Daftar pelanggaran aktif (bukan invalid), opsional filter per analysis.
  static findActive(analysisId?: string) {
    return prisma.violation.findMany({
      where: {
        status: { not: "invalid" },
        ...(analysisId ? { analysisId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  static findById(id: string) {
    return prisma.violation.findUnique({ where: { id } });
  }

  static update(id: string, data: any) {
    return prisma.violation.update({ where: { id }, data });
  }
}

export default ViolationRepository;
