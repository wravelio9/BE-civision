// Service pembaca GPS EXIF dari foto (Requirement 3.1) + validasi region (Requirement 3.7).
// Berjalan di Node (backend), bukan di AI. Sumber koordinat UTAMA untuk foto.
import exifr from "exifr";

export interface LatLon {
  lat: number;
  lon: number;
}

export interface ExifResult {
  latlon: LatLon | null;
  present: boolean; // true jika GPS EXIF valid ditemukan
}

// Batas wilayah target (region_bounds). Default: sekitar Indonesia.
// Bisa dioverride lewat environment variable bila perlu.
export interface RegionBounds {
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
}

export const DEFAULT_REGION_BOUNDS: RegionBounds = {
  latMin: parseFloat(process.env.REGION_LAT_MIN || "-11.5"),
  latMax: parseFloat(process.env.REGION_LAT_MAX || "6.5"),
  lonMin: parseFloat(process.env.REGION_LON_MIN || "94.5"),
  lonMax: parseFloat(process.env.REGION_LON_MAX || "141.5"),
};

// Baca GPS EXIF dari berkas foto (buffer atau path).
// exifr sudah mengembalikan latitude/longitude dalam desimal (S/W negatif).
export async function readExifGps(input: Buffer | string): Promise<ExifResult> {
  try {
    const gps = await exifr.gps(input);
    if (
      gps &&
      typeof gps.latitude === "number" &&
      typeof gps.longitude === "number" &&
      Number.isFinite(gps.latitude) &&
      Number.isFinite(gps.longitude)
    ) {
      return { latlon: { lat: gps.latitude, lon: gps.longitude }, present: true };
    }
    return { latlon: null, present: false };
  } catch {
    // EXIF tidak ada / rusak / bukan gambar ber-EXIF
    return { latlon: null, present: false };
  }
}

// Validasi kewajaran koordinat: harus di dalam region_bounds (inklusif).
// Berlaku untuk SEMUA sumber koordinat (EXIF/OCR/manual) - Requirement 3.7.
export function isWithinRegion(
  latlon: LatLon,
  bounds: RegionBounds = DEFAULT_REGION_BOUNDS
): boolean {
  return (
    latlon.lat >= bounds.latMin &&
    latlon.lat <= bounds.latMax &&
    latlon.lon >= bounds.lonMin &&
    latlon.lon <= bounds.lonMax
  );
}

class ExifService {
  static readGps = readExifGps;
  static isWithinRegion = isWithinRegion;
}

export default ExifService;