// Service Upload: simpan file media ke storage + buat record MediaFile.
// Deteksi gerobak TIDAK di sini lagi (pindah ke frontend ONNX). Backend hanya
// menyimpan media, lalu frontend mengirim mediaId + detections ke /api/analysis.
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import prisma from "../config/prisma.js";

export class UploadError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const STORAGE_DIR = path.resolve(process.cwd(), "storage", "media");

export interface SavedMedia {
  id: string;
  originalName: string;
  mediaType: "photo" | "video";
  sizeBytes: number;
  storagePath: string;
}

class Service {
  // Simpan satu file ke storage + buat record MediaFile di DB.
  static async saveOne(file: Express.Multer.File): Promise<SavedMedia> {
    const mimetype = file.mimetype || "";
    const mediaType: "photo" | "video" = mimetype.startsWith("video/") ? "video" : "photo";

    await fs.mkdir(STORAGE_DIR, { recursive: true });
    const id = crypto.randomUUID();
    const ext = path.extname(file.originalname) || "";
    const storagePath = path.join("storage", "media", `${id}${ext}`);
    await fs.writeFile(path.resolve(process.cwd(), storagePath), file.buffer);

    const media = await prisma.mediaFile.create({
      data: {
        originalName: file.originalname.slice(0, 255),
        mediaType,
        sizeBytes: file.size,
        storagePath,
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