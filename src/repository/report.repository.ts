// Repository Laporan: membungkus akses database (Prisma) untuk data laporan.
// Pemetaan/format data (tanggal, downloadUrl, dll) TIDAK di sini — itu di ReportService.
import prisma from "../config/prisma.js";

class ReportRepository {
  static countAll() {
    return prisma.violation.count();
  }

  static countByStatus(status: "valid" | "invalid" | "unverified") {
    return prisma.violation.count({ where: { status } });
  }

  // Satu halaman pelanggaran (semua status) beserta relasi media & frame,
  // sekaligus total baris. Dijalankan dalam satu transaksi agar halaman & total konsisten.
  // Urutan: terbaru dulu; id sebagai pemecah seri supaya urutan stabil bila
  // createdAt sama (tidak ada baris dobel/hilang antar halaman).
  static findAllWithRelations(skip: number, take: number) {
    return prisma.$transaction([
      prisma.violation.findMany({
        include: { analysis: { include: { media: true } }, annotatedFrames: true },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip,
        take,
      }),
      prisma.violation.count(),
    ]);
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
