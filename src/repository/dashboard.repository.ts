ccaea8f6-34aa-4c42-8d2e-781a26b3e19b// Repository Dashboard: membungkus akses database (Prisma) untuk data peta.
// Pemetaan marker/warna pin TIDAK di sini — itu di DashboardService.
import prisma from "../db/prisma.js";

class DashboardRepository {
  // Pelanggaran ber-lokasi valid & tidak invalid, untuk marker peta.
  static findMappableViolations() {
    return prisma.violation.findMany({
      where: { status: { not: "invalid" }, locationStatus: "matched" },
      include: { annotatedFrames: true, zone: true },
      orderBy: { createdAt: "desc" },
    });
  }

  static findAllZones() {
    return prisma.zone.findMany();
  }
}

export default DashboardRepository;
