// Parser respons Roboflow -> unit analisis yang dipakai backend.
//
// Struktur asli Roboflow (dikonfirmasi dari response nyata):
//   { outputs: [ { annotated_image: {type:"base64", value}, predictions: { image, predictions: [...] } } ] }
// Catatan: isi predictions[] masih kosong saat model belum mendeteksi objek.
// Asumsi format tiap prediction (standar Roboflow): { x, y, width, height, confidence, class }
import type { RawDetection, LatLon } from "./analysis.service.js";

export interface RoboflowPrediction {
  x?: number;          // titik tengah X
  y?: number;          // titik tengah Y
  width?: number;
  height?: number;
  confidence?: number;
  class?: string;
}

export interface RoboflowOutput {
  annotated_image?: { type?: string; value?: string };
  predictions?: {
    image?: { width?: number | null; height?: number | null };
    predictions?: RoboflowPrediction[];
  };
}

export interface RoboflowResponse {
  outputs?: RoboflowOutput[];
}

export interface ParsedImageUnit {
  detections: RawDetection[];
  annotatedImageBase64: string | null;
  ocrLatLon: LatLon | null;
}

// Konversi satu prediction Roboflow (titik tengah) -> RawDetection (sudut).
function mapPrediction(p: RoboflowPrediction): RawDetection | null {
  if (
    typeof p.x !== "number" || typeof p.y !== "number" ||
    typeof p.width !== "number" || typeof p.height !== "number"
  ) {
    return null;
  }
  return {
    label: p.class ?? "gerobak",
    confidence: typeof p.confidence === "number" ? p.confidence : 0,
    bbox: {
      x1: p.x - p.width / 2,
      y1: p.y - p.height / 2,
      x2: p.x + p.width / 2,
      y2: p.y + p.height / 2,
    },
  };
}

// Ambil hasil dari respons Roboflow (struktur asli: root.outputs[0]).
export function parseRoboflowResponse(res: RoboflowResponse): ParsedImageUnit {
  const output = res?.outputs?.[0];
  const rawPreds = output?.predictions?.predictions ?? [];
  const detections = rawPreds
    .map(mapPrediction)
    .filter((d): d is RawDetection => d !== null);

  return {
    detections,
    annotatedImageBase64:
      output?.annotated_image?.type === "base64"
        ? output.annotated_image.value ?? null
        : null,
    ocrLatLon: null, // koordinat dari OCR backend, bukan Roboflow
  };
}

export default { parseRoboflowResponse };