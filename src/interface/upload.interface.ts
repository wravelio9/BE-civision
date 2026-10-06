// Interface/tipe untuk src/service/upload.service.ts dan src/controller/upload.controller.ts

export interface SavedMedia {
  id: string;
  originalName: string;
  mediaType: "photo" | "video";
  sizeBytes: number;
  storagePath: string;
}

// POST /api/upload/signed-url  (body dari FE)
export interface SignedUploadRequest {
  filename: string;
  contentType: string;
  sizeBytes: number;
}

// Respons signed-url: FE meng-upload file LANGSUNG ke Supabase pakai signedUrl ini,
// sehingga file besar tidak lewat Vercel (batas body 4.5 MB).
export interface SignedUploadResult {
  path: string;        // path objek di bucket, dikirim balik saat confirm
  token: string;
  signedUrl: string;   // URL PUT upload langsung ke Supabase Storage
  bucket: string;
  maxBytes: number;
}

// POST /api/upload/confirm  (body dari FE, setelah upload ke Supabase sukses)
export interface ConfirmUploadRequest {
  path: string;
  originalName: string;
}
