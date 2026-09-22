// Middleware upload gabungan (multer). Menerima file gambar ATAU video.
// File disimpan di memori lalu diteruskan ke AI service oleh controller/service.
import { Request } from "express";
import multer from "multer";
import config from "../config/config.js";

// Terima file bertipe image/* atau video/*. Tolak selain itu.
function mediaFileFilter(req: Request, file: any, cb: any) {
  const mimetype: string = file.mimetype || "";
  if (mimetype.startsWith("image/") || mimetype.startsWith("video/")) {
    return cb(null, true);
  }
  cb(new Error("File harus berupa gambar atau video."));
}

const upload = multer({
  storage: multer.memoryStorage(),
  // Pakai batas terbesar (video) agar image maupun video sama-sama lolos.
  // Validasi ukuran spesifik bisa ditambahkan di controller bila perlu.
  limits: { fileSize: config.maxVideoBytes },
  fileFilter: mediaFileFilter,
});

// Ekspor middleware untuk field bernama "files" (bisa banyak file).
export default upload;
