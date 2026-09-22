// Error handler terpusat: menerjemahkan berbagai error jadi response rapi.
import { Request, Response, NextFunction } from "express";
import multer from "multer";

// eslint-disable-next-line no-unused-vars
function errorHandler(err:any, req:Request, res:Response, next:NextFunction) {
  // Error dari multer (mis. file terlalu besar).
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload gagal: ${err.message}` });
  }

  // Error dari fileFilter (bukan video).
  if (err && err.message === "File harus berupa video.") {
    return res.status(400).json({ error: err.message });
  }

  // Error dari AI service (axios).
  if (err && err.response) {
    return res.status(err.response.status).json({
      error: "AI service mengembalikan error",
      detail: err.response.data,
    });
  }

  // AI service tidak bisa dihubungi.
  if (err && (err.code === "ECONNREFUSED" || err.code === "ECONNABORTED" || err.request)) {
    return res.status(502).json({
      error: "Gagal menghubungi AI service",
      detail: err.message,
    });
  }

  console.error("[unhandled error]", err);
  return res.status(500).json({ error: "Terjadi kesalahan internal" });
}

module.exports = errorHandler;
