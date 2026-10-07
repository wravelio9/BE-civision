// Service Upload: simpan file media ke Supabase Storage + buat record MediaFile.
// Deteksi gerobak TIDAK di sini (pindah ke frontend ONNX). Backend hanya menyimpan
// media ke bucket Supabase lalu mencatat path + URL publiknya di DB.
// Catatan: backend jalan di serverless (Vercel) yang filesystem-nya read-only,
// jadi file TIDAK boleh ditulis ke disk lokal.
import path from "node:path";
import crypto from "node:crypto";
import prisma from "../config/prisma.js";
import config from "../config/config.js";
import { getSupabase, SUPABASE_BUCKET } from "../config/supabase.js";
import type {
  SavedMedia,
  SignedUploadRequest,
  SignedUploadResult,
  ConfirmUploadRequest,
} from "../interface/upload.interface.js";

// Path objek yang dibuat backend: <uuid><ext>. Confirm hanya menerima pola ini,
// supaya FE tidak bisa mendaftarkan objek sembarang di bucket.
const OBJECT_PATH_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\.[a-z0-9]{1,10})?$/i;

function isMediaMime(mimetype: string): boolean {
  return mimetype.startsWith("image/") || mimetype.startsWith("video/");
}

// Ekstensi aman dari nama file: huruf/angka saja, maks 10 karakter.
function safeExt(filename: string): string {
  const ext = path.extname(filename || "").toLowerCase();
  return /^\.[a-z0-9]{1,10}$/.test(ext) ? ext : "";
}

// Coba ulang operasi jaringan yang gagal sesaat (fetch failed / timeout / 5xx).
// Masalah "kadang gagal kadang tidak" saat upload ke Supabase umumnya karena
// jaringan internet yang kirim lagi lambat, jadi 1-2 percobaan ulang biasanya lolos.
const RETRY_ATTEMPTS = 3;      // total percobaan (1 awal + 2 ulang)
const RETRY_BASE_DELAY_MS = 600;

function isTransientError(err: any): boolean {
  const msg = String(err?.message ?? err ?? "").toLowerCase();
  return (
    msg.includes("fetch failed") ||
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("socket") ||
    msg.includes("network") ||
    msg.includes("eai_again")
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Jalankan `fn`; jika gagal karena error jaringan sesaat, ulangi dengan jeda
// yang membesar (backoff). Error non-jaringan langsung dilempar tanpa diulang.
async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let lastErr: any;
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt >= RETRY_ATTEMPTS || !isTransientError(err)) break;
      const delay = RETRY_BASE_DELAY_MS * attempt;
      console.warn(`[upload] ${label} gagal (percobaan ${attempt}/${RETRY_ATTEMPTS}), coba lagi dalam ${delay}ms:`, (err as any)?.message ?? err);
      await sleep(delay);
    }
  }
  throw lastErr;
}

export class UploadError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

class Service {
  // Simpan satu file ke Supabase Storage + buat record MediaFile di DB.
  static async saveOne(file: Express.Multer.File): Promise<SavedMedia> {
    const mimetype = file.mimetype || "";
    const mediaType: "photo" | "video" = mimetype.startsWith("video/") ? "video" : "photo";

    // Path objek di bucket: <uuid><ext> (bucket sudah bernama media)
    const id = crypto.randomUUID();
    const ext = path.extname(file.originalname) || "";
    const objectPath = `${id}${ext}`;
    const supabase = getSupabase();

    // Upload ke bucket Supabase (dengan retry untuk kegagalan jaringan sesaat).
    await withRetry("upload storage", async () => {
      const { error: uploadErr } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .upload(objectPath, file.buffer, {
          contentType: mimetype || "application/octet-stream",
          upsert: true, // retry aman: objek yang sama boleh ditimpa
        });
      // Lempar agar withRetry bisa menilai apakah ini error jaringan sesaat.
      if (uploadErr) throw new UploadError(`Gagal upload ke storage: ${uploadErr.message}`, 502);
    });

    // URL publik (bucket di-set public). Dipakai FE untuk menampilkan foto.
    const { data: pub } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(objectPath);
    const publicUrl = pub?.publicUrl ?? objectPath;

    const media = await prisma.mediaFile.create({
      data: {
        originalName: file.originalname.slice(0, 255),
        mediaType,
        sizeBytes: file.size,
        storagePath: publicUrl, // simpan URL publik agar FE langsung bisa pakai
      },
    });

    return {
      id: media.id,
      originalName: media.originalName,
      mediaType: media.mediaType as "photo" | "video",
      sizeBytes: media.sizeBytes,
      storagePath: media.storagePath,
    };
  }

  // Langkah 1 (upload langsung): buat signed upload URL ke Supabase Storage.
  // File TIDAK lewat backend, jadi tidak kena batas body Vercel (4.5 MB).
  static async createSignedUpload(input: SignedUploadRequest): Promise<SignedUploadResult> {
    const filename = typeof input?.filename === "string" ? input.filename.trim() : "";
    const contentType = typeof input?.contentType === "string" ? input.contentType : "";
    const sizeBytes = Number(input?.sizeBytes);

    if (!filename) throw new UploadError("filename wajib diisi.");
    if (!isMediaMime(contentType)) throw new UploadError("contentType harus image/* atau video/*.");
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      throw new UploadError("sizeBytes harus angka lebih dari 0.");
    }
    if (sizeBytes > config.maxVideoBytes) {
      throw new UploadError(`Ukuran file melebihi batas ${config.maxVideoBytes} byte.`, 413);
    }

    const objectPath = `${crypto.randomUUID()}${safeExt(filename)}`;
    const { data, error } = await getSupabase()
      .storage.from(SUPABASE_BUCKET)
      .createSignedUploadUrl(objectPath);

    if (error || !data) {
      throw new UploadError(`Gagal membuat signed upload URL: ${error?.message ?? "unknown"}`, 502);
    }

    return {
      path: data.path,
      token: data.token,
      signedUrl: data.signedUrl,
      bucket: SUPABASE_BUCKET,
      maxBytes: config.maxVideoBytes,
    };
  }

  // Langkah 2 (upload langsung): FE sudah upload ke Supabase, catat MediaFile di DB.
  // Ukuran & tipe diambil dari metadata Supabase, bukan dipercaya dari FE.
  static async confirmUpload(input: ConfirmUploadRequest): Promise<SavedMedia> {
    const objectPath = typeof input?.path === "string" ? input.path.trim() : "";
    const originalName =
      typeof input?.originalName === "string" && input.originalName.trim()
        ? input.originalName.trim().slice(0, 255)
        : objectPath;

    if (!OBJECT_PATH_RE.test(objectPath)) {
      throw new UploadError("path tidak valid. Gunakan path dari /api/upload/signed-url.");
    }

    const supabase = getSupabase();
    const { data: info, error } = await supabase.storage.from(SUPABASE_BUCKET).info(objectPath);
    if (error || !info) {
      throw new UploadError("File belum ada di storage. Upload ke signedUrl dulu.", 404);
    }

    const contentType = info.contentType ?? "";
    if (!isMediaMime(contentType)) {
      throw new UploadError("File di storage bukan gambar atau video.");
    }
    const sizeBytes = Number(info.size ?? 0);
    if (sizeBytes > config.maxVideoBytes) {
      throw new UploadError(`Ukuran file melebihi batas ${config.maxVideoBytes} byte.`, 413);
    }

    const { data: pub } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(objectPath);

    const media = await prisma.mediaFile.create({
      data: {
        originalName,
        mediaType: contentType.startsWith("video/") ? "video" : "photo",
        sizeBytes,
        storagePath: pub?.publicUrl ?? objectPath,
      },
    });

    return {
      id: media.id,
      originalName: media.originalName,
      mediaType: media.mediaType as "photo" | "video",
      sizeBytes: media.sizeBytes,
      storagePath: media.storagePath,
    };
  }

  // Simpan banyak file. Satu gagal tidak menggagalkan yang lain.
  static async upload(files: Express.Multer.File[]) {
    const images = files.filter((f) => (f.mimetype || "").startsWith("image/"));
    if (images.length === 0) {
      throw new UploadError("Tidak ada file gambar yang diunggah.");
    }

    const saved: SavedMedia[] = [];
    const errors: { filename: string; error: string }[] = [];
    for (const f of images) {
      try {
        saved.push(await Service.saveOne(f));
      } catch (e: any) {
        errors.push({ filename: f.originalname, error: e?.message ?? "Gagal menyimpan" });
      }
    }

    return { total: images.length, succeeded: saved.length, failed: errors.length, media: saved, errors };
  }
}

export default Service;
