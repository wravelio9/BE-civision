// Controller @ POST "/upload" (ALL-IN-ONE)
// Satu tembakan dari FE: foto + hasil deteksi ONNX -> backend:
//   1. simpan foto + record MediaFile
//   2. baca koordinat (GPS EXIF -> OCR -> manual)
//   3. cek zona (point-in-polygon)
//   4. simpan Analysis + Violation
// Lalu balikin ringkasan. Deteksi gerobak dilakukan di FE (ONNX), bukan di sini.
import { Request, Response, NextFunction } from "express";
import Service, { UploadError } from "../service/main.service.js";
import AnalysisService, {
  type ResolveInput,
  type PersistAnalysisInput,
  type RawDetection,
  type LatLon,
} from "../service/analysis.service.js";
import { readCoordinatesFromImage } from "../service/ocr.service.js";

class Controller {
  // POST /upload
  // multipart:
  //   - field "files": satu foto (atau lebih; diproses per foto)
  //   - field "payload" (JSON string) ATAU body: { detections?, manualLatLon? }
  static async upload(req: Request, res: Response, next: NextFunction) {
    try {
      const files = (req.files as Express.Multer.File[]) || [];
      if (files.length === 0) {
        return res.status(400).json({ success: false, error: "Tidak ada file. Gunakan field 'files'." });
      }

      // Payload opsional (deteksi ONNX dari FE + koordinat manual).
      let payload: { detections?: RawDetection[]; manualLatLon?: LatLon | null } = {};
      if (typeof req.body?.payload === "string") {
        payload = JSON.parse(req.body.payload);
      } else if (req.body && typeof req.body === "object") {
        payload = req.body;
      }
      const detections: RawDetection[] = Array.isArray(payload.detections) ? payload.detections : [];

      const outputs: any[] = [];

      // Proses tiap foto: simpan media -> koordinat -> zona -> simpan pelanggaran.
      for (const file of files) {
        if (!(file.mimetype || "").startsWith("image/")) continue;

        // 1) simpan media + record MediaFile
        const media = await Service.saveOne(file);

        // 2) koordinat: OCR dari foto (dipakai bila EXIF kosong)
        const ocr = await readCoordinatesFromImage(file.buffer);
        const resolveInput: ResolveInput = {
          photo: file.buffer,
          ocrLatLon: ocr.latlon,
          manualLatLon: payload.manualLatLon ?? null,
        };
        const resolved = await AnalysisService.resolveCoordinate(resolveInput);

        // 3+4) cek zona + simpan Analysis + Violation
        const persistInput: PersistAnalysisInput = {
          mediaId: media.id,
          photoCount: 1,
          units: [
            { detections, latlon: resolved.latlon, coordinateSource: resolved.source },
          ],
        };
        const result = await AnalysisService.persist(persistInput);

        outputs.push({
          mediaId: media.id,
          filename: media.originalName,
          coordinateSource: resolved.source,
          coordinate: resolved.latlon,
          detectionCount: detections.length,
          result,
        });
      }

      if (outputs.length === 0) {
        return res.status(400).json({ success: false, error: "Tidak ada file gambar yang diproses." });
      }

      return res.status(201).json({ success: true, data: outputs });
    } catch (err: any) {
      if (err instanceof UploadError) {
        return res.status(err.status).json({ success: false, error: err.message });
      }
      next(err);
    }
  }

  // Controller @ GET "/report"
  static async report(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
}

export default Controller;