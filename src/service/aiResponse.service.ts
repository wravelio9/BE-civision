// Parser respons AI (format Wilson) -> unit analisis yang dipakai backend.
// Mengurai struktur bersarang data.images.results[] menjadi bentuk sederhana.
import type { AiResponse, ParsedImageUnit } from "../interface/aiResponse.interface.js";

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