// Logika validasi unggah Media (fungsi murni) - Requirement 1.
// Aturan: foto JPG/PNG 1KB-20MB, video MP4 1MB-200MB, tidak boleh kosong.

export type MediaType = "photo" | "video";

export interface UploadValidationInput {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

export type UploadErrorCode =
  | "empty_file"
  | "unsupported_format"
  | "size_out_of_range";

export interface UploadValidationResult {
  ok: boolean;
  mediaType?: MediaType;
  errorCode?: UploadErrorCode;
  message?: string;
}

const PHOTO_MIN = 1 * 1024; // 1 KB
const PHOTO_MAX = 20 * 1024 * 1024; // 20 MB
const VIDEO_MIN = 1 * 1024 * 1024; // 1 MB
const VIDEO_MAX = 200 * 1024 * 1024; // 200 MB

const PHOTO_MIME = new Set(["image/jpeg", "image/png"]);
const VIDEO_MIME = new Set(["video/mp4"]);

export function validateUpload(input: UploadValidationInput): UploadValidationResult {
  // 1) Berkas kosong / tidak terbaca (Req 1.5)
  if (!input.sizeBytes || input.sizeBytes <= 0) {
    return { ok: false, errorCode: "empty_file", message: "Berkas kosong atau tidak dapat dibaca." };
  }

  // 2) Format (Req 1.3)
  let mediaType: MediaType | undefined;
  if (PHOTO_MIME.has(input.mimeType)) mediaType = "photo";
  else if (VIDEO_MIME.has(input.mimeType)) mediaType = "video";

  if (!mediaType) {
    return {
      ok: false,
      errorCode: "unsupported_format",
      message: "Hanya format foto (JPG/PNG) dan video (MP4) yang didukung.",
    };
  }

  // 3) Ukuran (Req 1.1, 1.2, 1.4)
  const [min, max] = mediaType === "photo" ? [PHOTO_MIN, PHOTO_MAX] : [VIDEO_MIN, VIDEO_MAX];
  if (input.sizeBytes < min || input.sizeBytes > max) {
    const maxLabel = mediaType === "photo" ? "20 MB" : "200 MB";
    return {
      ok: false,
      errorCode: "size_out_of_range",
      message: `Ukuran ${mediaType === "photo" ? "foto" : "video"} melebihi batas maksimum (${maxLabel}) atau terlalu kecil.`,
    };
  }

  return { ok: true, mediaType };
}