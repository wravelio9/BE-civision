// Service Zona Terlarang: validasi (Requirement 2) + logika bisnis.
// Akses database didelegasikan ke ZoneRepository.
import ZoneRepository from "../repository/zone.repository.js";
import lineIntersect from "@turf/line-intersect";
import { lineString, polygon as turfPolygon } from "@turf/helpers";
import type { LngLat, ZoneInput, ZoneValidationError } from "../interface/zone.service.interface.js";

export class ZoneError extends Error {
  code: ZoneValidationError;
  constructor(code: ZoneValidationError, message: string) {
    super(message);
    this.code = code;
  }
}

const MAX_ZONES = 20; // Requirement 2.5

// Validasi bentuk poligon (Requirement 2.2, 2.3).
export function validatePolygon(points: LngLat[]): { valid: boolean; reason?: ZoneValidationError } {
  // Minimal 3 titik (Req 2.3)
  if (!Array.isArray(points) || points.length < 3) {
    return { valid: false, reason: "too_few_points" };
  }
  // Cek self-intersecting: bentuk ring tertutup lalu deteksi perpotongan sisi.
  const ring: LngLat[] = [...points, points[0] as LngLat]; // tutup poligon
  const line = lineString(ring);
  const intersections = lineIntersect(line, line);
  // lineIntersect terhadap dirinya sendiri: titik simpul wajar muncul,
  // tapi perpotongan di luar simpul menandakan self-intersecting.
  // Pendekatan sederhana & aman untuk demo: jumlah titik potong unik
  // melebihi jumlah simpul => ada perpotongan sisi.
  const uniquePts = new Set(
    intersections.features.map((f: any) => f.geometry.coordinates.join(","))
  );
  if (uniquePts.size > points.length) {
    return { valid: false, reason: "self_intersecting" };
  }
  return { valid: true };
}

class ZoneService {
  // CREATE (Req 2.2, 2.3, 2.4, 2.5)
  static async create(input: ZoneInput) {
    if (!input.name || !input.name.trim()) {
      throw new ZoneError("name_required", "Nama zona wajib diisi.");
    }
    const check = validatePolygon(input.points);
    if (!check.valid) {
      if (check.reason === "too_few_points") {
        throw new ZoneError("too_few_points", "Poligon harus memiliki minimal 3 titik.");
      }
      throw new ZoneError("self_intersecting", "Poligon tidak boleh saling berpotongan.");
    }
    // Batas maksimal 20 zona (Req 2.5)
    const count = await ZoneRepository.count();
    if (count >= MAX_ZONES) {
      throw new ZoneError("max_zones_reached", `Maksimal ${MAX_ZONES} zona sudah tercapai.`);
    }
    return ZoneRepository.create({ name: input.name.trim(), points: input.points as any });
  }

  // READ all (Req 2.4)
  static async list() {
    return ZoneRepository.findMany();
  }

  // READ one
  static async getById(id: string) {
    return ZoneRepository.findById(id);
  }

  // UPDATE (Req 2.7) - validasi ulang bila points diubah
  static async update(id: string, input: Partial<ZoneInput>) {
    const existing = await ZoneRepository.findById(id);
    if (!existing) return null;

    const data: { name?: string; points?: any } = {};
    if (input.name !== undefined) {
      if (!input.name.trim()) throw new ZoneError("name_required", "Nama zona wajib diisi.");
      data.name = input.name.trim();
    }
    if (input.points !== undefined) {
      const check = validatePolygon(input.points);
      if (!check.valid) {
        if (check.reason === "too_few_points") {
          throw new ZoneError("too_few_points", "Poligon harus memiliki minimal 3 titik.");
        }
        throw new ZoneError("self_intersecting", "Poligon tidak boleh saling berpotongan.");
      }
      data.points = input.points as any;
    }
    return ZoneRepository.update(id, data);
  }

  // DELETE (Req 2.7)
  static async remove(id: string) {
    const existing = await ZoneRepository.findById(id);
    if (!existing) return null;
    await ZoneRepository.delete(id);
    return existing;
  }
}

export default ZoneService;
