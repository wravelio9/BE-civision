// Parser respons AI (format Wilson) -> unit analisis yang dipakai backend.
// Mengurai struktur bersarang data.images.results[] menjadi bentuk sederhana.
import type { RawDetection, LatLon } from "./analysis.service.js";

// Bentuk sebagian respons AI yang kita butuhkan (fleksibel/opsional).
export interface AiImageResult {
  filename?: string;
  detections?: RawDetection[];
  count?: number;
  ocr?: LatLon | null;               // { lat, lon } atau null
  annotated_image_url?: string;
}

export interface AiResponse {
  success?: boolean;
  data?: {
    images?: {
      results?: AiImageResult[];
      errors?: unknown[];
    };
  };
}

// Satu foto hasil parse: deteksi + koordinat OCR (bila ada) + url anotasi.
export interface ParsedImageUnit {
  filename: string | null;
  detections: RawDetection[];
  ocrLatLon: LatLon | null;
  annotatedImageUrl: string | null;
}

// Ambil daftar hasil foto dari respons AI Wilson (aman terhadap field hilang).
export function parseAiImageResults(res: AiResponse): ParsedImageUnit[] {
  const results = res?.data?.images?.results ?? [];
  return results.map((r) => ({
    filename: r.filename ?? null,
    detections: Array.isArray(r.detections) ? r.detections : [],
    ocrLatLon:
      r.ocr && typeof r.ocr.lat === "number" && typeof r.ocr.lon === "number"
        ? { lat: r.ocr.lat, lon: r.ocr.lon }
        : null,
    annotatedImageUrl: r.annotated_image_url ?? null,
  }));
}

export default { parseAiImageResults };