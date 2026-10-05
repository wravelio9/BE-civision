// Controller Analisis: menerima hasil deteksi (ONNX dari frontend) + OCR koordinat
// -> cek zona -> simpan Analysis+Violation.
//
// Deteksi gerobak dilakukan di FRONTEND pakai model ONNX (onnxruntime-web).
// Backend TIDAK mendeteksi; backend menerima "detections" yang sudah jadi,
// lalu menentukan koordinat (EXIF/OCR/manual), mencocokkan zona, dan menyimpan.
import { Request, Response, NextFunction } from "express";
import AnalysisService from "../service/analysis.service.js";
import { readCoordinatesFromImage } from "../service/ocr.service.js";
import type {
  ResolveInput,
  PersistAnalysisInput,
  RawDetection,
  LatLon,
  AnalyzeBody,
} from "../interface/analysis.interface.js";

class AnalysisController {
  // POST /api/analysis
  // multipart: field "photo" (opsional, untuk baca EXIF/OCR koordinat)
  // field "payload" (JSON) ATAU body JSON: { mediaId, detections, manualLatLon? }
  static async analyze(req: Request, res: Response, next: NextFunction) {
    try {
      const body: AnalyzeBody =
        typeof req.body?.payload === "string" ? JSON.parse(req.body.payload) : req.body;

      if (!body?.mediaId) {
        return res.status(400).json({ ok: false, message: "mediaId wajib diisi." });
      }

      const photoBuffer = (req as any).file?.buffer as Buffer | undefined;

      // Deteksi datang dari frontend (ONNX). Default [] bila tidak ada.
      const detections: RawDetection[] = Array.isArray(body.detections) ? body.detections : [];

      // KOORDINAT: baca OCR dari foto (dipakai bila EXIF kosong). Hanya bila ada foto.
      let ocrLatLon: LatLon | null = null;
      let ocrRawText = "";
      if (photoBuffer) {
        const ocr = await readCoordinatesFromImage(photoBuffer);
        ocrLatLon = ocr.latlon;
        ocrRawText = ocr.rawText;
      }

      // RESOLVER: EXIF (dari foto) -> OCR -> manual
      const resolveInput: ResolveInput = {
        ocrLatLon,
        manualLatLon: body.manualLatLon ?? null,
      };
      if (photoBuffer) resolveInput.photo = photoBuffer;
      const resolved = await AnalysisService.resolveCoordinate(resolveInput);

      // SIMPAN: cek zona + buat Violation
      const persistInput: PersistAnalysisInput = {
        mediaId: body.mediaId,
        photoCount: 1,
        units: [
          {
            detections,
            latlon: resolved.latlon,
            coordinateSource: resolved.source,
          },
        ],
      };
      if (body.detectorMode) persistInput.detectorMode = body.detectorMode;
      const result = await AnalysisService.persist(persistInput);

      return res.status(201).json({
        ok: true,
        message: "Analisis tersimpan.",
        detectionCount: detections.length,
        coordinateSource: resolved.source,
        coordinate: resolved.latlon,
        ocrRawText,
        result,
      });
    } catch (err) {
      next(err);
    }
  }
}

export default AnalysisController;