// Repository Laporan: membungkus akses database (Prisma) untuk data laporan.
// Pemetaan/format data (tanggal, downloadUrl, dll) TIDAK di sini — itu di ReportService.
import prisma from "../db/prisma.js";

class ReportRepository {
  static countAll() {
    return prisma.violation.count();
  }

  static countByStatus(status: "valid" | "invalid" | "unverified") {
    return prisma.violation.count({ where: { status } });
  }

  // Semua pelanggaran (semua status) beserta relasi media & frame.
  static findAllWithRelations() {
    return prisma.violation.findMany({
      include: { analysis: { include: { media: true } }, annotatedFrames: true },
      orderBy: { createdAt: "desc" },
    });
  }

  // Satu pelanggaran lengkap untuk isi PDF.
  static findByIdWithRelations(id: string) {
    return prisma.violation.findUnique({
      where: { id },
      include: { analysis: { include: { media: true } }, zone: true, annotatedFrames: true },
    });
  }
}

export default ReportRepository;
