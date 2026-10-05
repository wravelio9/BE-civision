// Parser respons Roboflow -> unit analisis yang dipakai backend.
//
// CATATAN PENTING: Isi "predictions.predictions[]" dari Roboflow saat ini BELUM
// kami ketahui (masih kosong di contoh). Parser ini memakai ASUMSI format standar
// Roboflow object detection:
//   { x, y, width, height, confidence, class }   (x,y = titik TENGAH box)
// Begitu format asli didapat, sesuaikan fungsi mapPrediction() di bawah saja.
import type { RawDetection, LatLon } from "./analysis.service.js";

// ---- Bentuk respons Roboflow (sebagian yang dibutuhkan) ----
export interface RoboflowPrediction {
  x?: number;          // titik tengah X (piksel)
  y?: number;          // titik tengah Y (piksel)
  width?: number;      // lebar box
  height?: number;     // tinggi box
  confidence?: number; // 0..1
  class?: string;      // mis. "gerobak"
}

export interface RoboflowOutput {
  annotated_image?: { type?: string; value?: string }; // base64 gambar beranotasi
  predictions?: {
    image?: { width?: number; height?: number };
    predictions?: RoboflowPrediction[];
  };
}

export interface RoboflowResult {
  filename?: string;
  mimetype?: string;
  result?: { outputs?: RoboflowOutput[] };
}

export interface RoboflowResponse {
  success?: boolean;
  data?: {
    total?: number;
    results?: RoboflowResult[];
    errors?: unknown[];
  };
}

// Hasil parse per foto.
export interface ParsedImageUnit {
  filename: string | null;
  detections: RawDetection[];
  annotatedImageBase64: string | null; // gambar beranotasi (base64) dari Roboflow
  ocrLatLon: LatLon | null;            // diisi oleh OCR backend (bukan dari Roboflow)
}

// Konversi satu prediction Roboflow -> RawDetection backend.
// Roboflow: x,y = titik tengah; backend: bbox pakai sudut (x1,y1,x2,y2).
// >>> Kalau format asli berbeda, cukup ubah fungsi ini. <<<
function mapPrediction(p: RoboflowPrediction): RawDetection | null {
  if (
    typeof p.x !== "number" || typeof p.y !== "number" ||
    typeof p.width !== "number" || typeof p.height !== "number"
  ) {
    return null;
  }
  const x1 = p.x - p.width / 2;
  const y1 = p.y - p.height / 2;
  const x2 = p.x + p.width / 2;
  const y2 = p.y + p.height / 2;
  return {
    label: p.class ?? "gerobak",
    confidence: typeof p.confidence === "number" ? p.confidence : 0,
    bbox: { x1, y1, x2, y2 },
  };
}

// Ambil daftar hasil foto dari respons Roboflow (aman terhadap field hilang).
export function parseRoboflowResults(res: RoboflowResponse): ParsedImageUnit[] {
  const results = res?.data?.results ?? [];
  return results.map((r) => {
    const output = r.result?.outputs?.[0];
    const rawPreds = output?.predictions?.predictions ?? [];
    const detections = rawPreds
      .map(mapPrediction)
      .filter((d): d is RawDetection => d !== null);

    return {
      filename: r.filename ?? null,
      detections,
      annotatedImageBase64:
        output?.annotated_image?.type === "base64"
          ? output.annotated_image.value ?? null
          : null,
      ocrLatLon: null, // koordinat diisi oleh OCR backend, bukan Roboflow
    };
  });
}

export default { parseRoboflowResults };