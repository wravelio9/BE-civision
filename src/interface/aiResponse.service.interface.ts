// Interface/tipe untuk src/service/aiResponse.service.ts
import type { RawDetection, LatLon } from "./analysis.interface.js";

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
