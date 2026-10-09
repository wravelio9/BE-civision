// Parser respons AI (format Wilson) -> unit analisis yang dipakai backend.
// Mengurai struktur bersarang data.images.results[] menjadi bentuk sederhana.
import type { AiResponse, ParsedImageUnit } from "../interface/aiResponse.interface.js";
import type { RawDetection, LatLon } from "../interface/analysis.interface.js";

// Ambil daftar hasil foto dari respons AI Wilson (aman terhadap field hilang).
export function parseAiImageResults(res: AiResponse): ParsedImageUnit[] {
  const results = res?.data?.images?.results ?? [];
  return results.map((r) => {
    let detections: RawDetection[] = [];
    if (Array.isArray(r.detections)) {
      detections = r.detections;
    }

    // Koordinat OCR hanya dipakai bila lat & lon berupa angka.
    let ocrLatLon: LatLon | null = null;
    if (r.ocr && typeof r.ocr.lat === "number" && typeof r.ocr.lon === "number") {
      ocrLatLon = { lat: r.ocr.lat, lon: r.ocr.lon };
    }

    return {
      filename: r.filename ?? null,
      detections,
      ocrLatLon,
      annotatedImageUrl: r.annotated_image_url ?? null,
    };
  });
}

export default { parseAiImageResults };