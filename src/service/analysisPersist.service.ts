// Persist Service: mengubah hasil deteksi + koordinat menjadi record
// Analysis + Violation di database (atomik via transaksi). Requirement 5.2, 5.3, 5.4, 4.7.
// Akses database didelegasikan ke AnalysisPersistRepository.
import AnalysisPersistRepository from "../repository/analysisPersist.repository.js";
import { matchZone, type ZoneLike } from "./zoneMatcher.service.js";
import { isWithinRegion, type LatLon } from "./exif.service.js";
import { reverseGeocode } from "./geocode.service.js";

// Satu deteksi mentah dari AI (format Wilson).
export interface RawDetection {
  label: string;
  confidence: number;
  bbox: { x1: number; y1: number; x2: number; y2: number };
}

export type CoordinateSource = "gps_exif" | "ocr" | "manual";

// Input untuk satu unit gambar (1 foto = 1 unit).
export interface AnalysisUnitInput {
  detections: RawDetection[];
  latlon: LatLon | null;              // koordinat dari EXIF/OCR/manual (null jika gagal semua)
  coordinateSource: CoordinateSource | null;
  frameTimestampSec?: number | null;  // untuk video (null untuk foto)
}

export interface PersistAnalysisInput {
  mediaId: string;
  detectorMode?: string;              // default "proxy"
  units: AnalysisUnitInput[];         // foto = 1 unit; video = banyak unit
  photoCount?: number;
  videoDuration?: number;
}

export interface PersistResult {
  analysisId: string;
  totalDetections: number;
  totalViolations: number;
  unknownLocation: number;            // deteksi valid tapi tanpa lokasi valid
}

const CONFIDENCE_THRESHOLD = 0.5; // Requirement 4.3

class AnalysisPersistService {
  // Simpan satu Analysis beserta Violation-nya secara atomik.
  static async persist(input: PersistAnalysisInput): Promise<PersistResult> {
    // Ambil zona sekali (dipakai untuk semua unit).
    const zonesRaw = await AnalysisPersistRepository.findAllZones();
    const zones: ZoneLike[] = zonesRaw.map((z) => ({
      id: z.id,
      name: z.name,
      points: z.points as unknown as [number, number][],
    }));

    let totalDetections = 0;
    let unknownLocation = 0;

    // Siapkan data violation sebelum transaksi.
    const violationData: any[] = [];

    for (const unit of input.units) {
      // Koordinat valid = ada DAN di dalam region (Requirement 3.7).
      const hasValidCoord = unit.latlon !== null && isWithinRegion(unit.latlon);

      for (const det of unit.detections) {
        // Hanya deteksi dengan confidence >= 0.5 dianggap valid (Req 4.3).
        if (det.confidence < CONFIDENCE_THRESHOLD) continue;
        totalDetections++;

        if (!hasValidCoord || !unit.latlon) {
          // Deteksi valid tapi tanpa Titik Deteksi valid => "lokasi tidak diketahui",
          // BUKAN pelanggaran (Requirement 5.3). Tidak disimpan sebagai Violation.
          unknownLocation++;
          continue;
        }

        // Cek titik masuk zona mana (point-in-polygon).
        const match = matchZone(unit.latlon, zones);
        if (!match.inside) {
          // Ada koordinat valid tapi di luar semua zona => bukan pelanggaran.
          continue;
        }

        // Pelanggaran (Req 5.2, 5.4). Isi alamat via reverse geocoding (fallback null).
        const address = await reverseGeocode(unit.latlon);
        violationData.push({
          zoneId: match.zoneId,
          lat: unit.latlon.lat,
          lng: unit.latlon.lon,
          confidence: det.confidence,
          bbox: det.bbox as any,
          coordinateSource: unit.coordinateSource ?? "manual",
          startTimeSec: unit.frameTimestampSec ?? null,
          endTimeSec: unit.frameTimestampSec ?? null,
          address,
          locationStatus: "matched",
          // status default "unverified", followUp default "belum" (Req 9.1)
        });
      }
    }

    // Tulis Analysis + Violation secara atomik (Req 4.7).
    const analysis = await AnalysisPersistRepository.createAnalysisWithViolations(
      {
        mediaId: input.mediaId,
        detectorMode: input.detectorMode ?? "proxy",
        photoCount: input.photoCount ?? 0,
        videoDuration: input.videoDuration ?? 0,
      },
      violationData,
    );

    return {
      analysisId: analysis.id,
      totalDetections,
      totalViolations: violationData.length,
      unknownLocation,
    };
  }
}

export default AnalysisPersistService;
