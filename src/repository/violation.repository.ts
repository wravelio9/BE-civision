// Repository Pelanggaran: membungkus semua akses database (Prisma) untuk entitas Violation.
// Logika bisnis (validasi status, aturan follow-up) TIDAK di sini — itu di ViolationService.
import prisma from "../config/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";

class ViolationRepository {
  // Daftar pelanggaran aktif (bukan invalid), opsional filter per analysis.
  static findActive(analysisId?: string) {
    const where: Prisma.ViolationWhereInput = {
      status: { not: "invalid" },
    };
    // Filter per analysis hanya bila analysisId diberikan.
    if (analysisId) {
      where.analysisId = analysisId;
    }

    return prisma.violation.findMany({
      where,
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
