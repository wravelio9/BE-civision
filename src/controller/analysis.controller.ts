// Controller Analisis: menyatukan resolver koordinat + persist (Requirement 5).
// Alur foto: baca EXIF -> (OCR slot) -> manual -> cek zona -> simpan Analysis+Violation.
import { Request, Response, NextFunction } from "express";
import { resolveCoordinate, type ResolveInput } from "../service/coordinateResolver.service.js";
import AnalysisPersistService, { type RawDetection, type PersistAnalysisInput } from "../service/analysisPersist.service.js";
import type { LatLon } from "../service/exif.service.js";

interface AnalyzeBody {
  mediaId: string;
  detections?: RawDetection[];
  ocrLatLon?: LatLon | null;
  manualLatLon?: LatLon | null;
  detectorMode?: string;
}

class AnalysisController {
  // POST /api/analysis  (multipart: field "photo" opsional untuk baca EXIF)
  static async analyze(req: Request, res: Response, next: NextFunction) {
    try {
      const body: AnalyzeBody =
        typeof req.body?.payload === "string" ? JSON.parse(req.body.payload) : req.body;

      if (!body?.mediaId) {
        return res.status(400).json({ ok: false, message: "mediaId wajib diisi." });
      }

      const photoBuffer = (req as any).file?.buffer as Buffer | undefined;

      // Rakit input resolver tanpa properti undefined (exactOptionalPropertyTypes).
      const resolveInput: ResolveInput = {
        ocrLatLon: body.ocrLatLon ?? null,
        manualLatLon: body.manualLatLon ?? null,
      };
      if (photoBuffer) resolveInput.photo = photoBuffer;

      const resolved = await resolveCoordinate(resolveInput);

      const persistInput: PersistAnalysisInput = {
        mediaId: body.mediaId,
        photoCount: 1,
        units: [
          {
            detections: body.detections ?? [],
            latlon: resolved.latlon,
            coordinateSource: resolved.source,
          },
        ],
      };
      if (body.detectorMode) persistInput.detectorMode = body.detectorMode;

      const result = await AnalysisPersistService.persist(persistInput);

      return res.status(201).json({
        ok: true,
        message: "Analisis tersimpan.",
        coordinateSource: resolved.source,
        coordinate: resolved.latlon,
        result,
      });
    } catch (err) {
      next(err);
    }
  }
}

export default AnalysisController;