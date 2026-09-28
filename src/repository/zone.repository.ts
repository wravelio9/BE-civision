// Repository Zona: membungkus semua akses database (Prisma) untuk entitas Zone.
// Logika bisnis/validasi TIDAK di sini — itu tanggung jawab ZoneService.
import prisma from "../db/prisma.js";

class ZoneRepository {
  static count() {
    return prisma.zone.count();
  }

  static create(data: { name: string; points: any }) {
    return prisma.zone.create({ data });
  }

  static findMany() {
    return prisma.zone.findMany({ orderBy: { createdAt: "desc" } });
  }

  static findById(id: string) {
    return prisma.zone.findUnique({ where: { id } });
  }

  static update(id: string, data: { name?: string; points?: any }) {
    return prisma.zone.update({ where: { id }, data });
  }

  static delete(id: string) {
    return prisma.zone.delete({ where: { id } });
  }
}

export default ZoneRepository;
