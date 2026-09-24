// Coordinate Resolver: menentukan Titik Deteksi foto dengan strategi berjenjang
// (Requirement 3): 1) GPS EXIF -> 2) OCR -> 3) input manual.
import { readExifGps, type LatLon } from "./exif.service.js";

export type CoordinateSource = "gps_exif" | "ocr" | "manual";

export interface ResolvedCoordinate {
  latlon: LatLon | null;
  source: CoordinateSource | null;
}

export interface ResolveInput {
  photo?: Buffer | string;          // berkas foto untuk dibaca EXIF-nya
  ocrLatLon?: LatLon | null;        // koordinat hasil OCR dari AI (slot Wilson)
  manualLatLon?: LatLon | null;     // koordinat input manual
}

// Urutan: EXIF -> OCR -> manual. Yang pertama tersedia dipakai.
export async function resolveCoordinate(input: ResolveInput): Promise<ResolvedCoordinate> {
  // 1) GPS EXIF (sumber utama foto)
  if (input.photo !== undefined) {
    const exif = await readExifGps(input.photo);
    if (exif.present && exif.latlon) {
      return { latlon: exif.latlon, source: "gps_exif" };
    }
  }
  // 2) OCR (cadangan) - dari AI Wilson (belum tersedia, slot siap)
  if (input.ocrLatLon) {
    return { latlon: input.ocrLatLon, source: "ocr" };
  }
  // 3) Input manual (cadangan terakhir)
  if (input.manualLatLon) {
    return { latlon: input.manualLatLon, source: "manual" };
  }
  return { latlon: null, source: null };
}

export default { resolveCoordinate };