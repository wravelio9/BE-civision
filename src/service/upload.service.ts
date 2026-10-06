// Service Upload: simpan file media ke Supabase Storage + buat record MediaFile.
// Deteksi gerobak TIDAK di sini (pindah ke frontend ONNX). Backend hanya menyimpan
// media ke bucket Supabase lalu mencatat path + URL publiknya di DB.
// Catatan: backend jalan di serverless (Vercel) yang filesystem-nya read-only,
// jadi file TIDAK boleh ditulis ke disk lokal.
import path from "node:path";
import crypto from "node:crypto";
import prisma from "../config/prisma.js";
import supabase, { SUPABASE_BUCKET } from "../config/supabase.js";
import type { SavedMedia } from "../interface/upload.interface.js";

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

    // Upload ke bucket Supabase.
    const { error: uploadErr } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(objectPath, file.buffer, {
        contentType: mimetype || "application/octet-stream",
        upsert: false,
      });

    if (uploadErr) {
      throw new UploadError(`Gagal upload ke storage: ${uploadErr.message}`, 502);
    }

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
