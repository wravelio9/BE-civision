// Controller Analisis: merangkai Roboflow (deteksi) + OCR (koordinat) + zona + simpan.
// Alur: foto -> Roboflow deteksi gerobak -> OCR baca koordinat (bila EXIF kosong)
//        -> resolver (EXIF/OCR/manual) -> cek zona -> simpan Analysis+Violation.
import { Request, Response, NextFunction } from "express";
import AnalysisService, {
  type ResolveInput,
  type PersistAnalysisInput,
  type LatLon,
} from "../service/analysis.service.js";
import { callRoboflow, saveAnnotatedImage } from "../service/roboflow.service.js";
import { parseRoboflowResponse } from "../service/roboflowResponse.service.js";
import { readCoordinatesFromImage } from "../service/ocr.service.js";

interface AnalyzeBody {
  mediaId: string;
  manualLatLon?: LatLon | null;
  detectorMode?: string;
}

class AnalysisController {
  // POST /api/analysis  (multipart: field "photo" WAJIB berisi foto)
  static async analyze(req: Request, res: Response, next: NextFunction) {
    try {
      const body: AnalyzeBody =
        typeof req.body?.payload === "string" ? JSON.parse(req.body.payload) : req.body;

      if (!body?.mediaId) {
        return res.status(400).json({ ok: false, message: "mediaId wajib diisi." });
      }
      const photoBuffer = (req as any).file?.buffer as Buffer | undefined;
      if (!photoBuffer) {
        return res.status(400).json({ ok: false, message: "Foto (field 'photo') wajib diunggah." });
      }

      // 1) DETEKSI: kirim foto (base64) ke Roboflow
      const imageBase64 = photoBuffer.toString("base64");
      const roboflowRaw = await callRoboflow(imageBase64);
      const unit = parseRoboflowResponse(roboflowRaw);
      const detections = unit.detections;

      // 2) Simpan gambar beranotasi dari Roboflow (base64 -> file)
      const annotatedPath = await saveAnnotatedImage(unit.annotatedImageBase64);

      // 3) KOORDINAT: baca OCR dari foto (dipakai bila EXIF kosong)
      const ocr = await readCoordinatesFromImage(photoBuffer);

      // 4) RESOLVER: EXIF (dari foto) -> OCR -> manual
      const resolveInput: ResolveInput = {
        photo: photoBuffer,
        ocrLatLon: ocr.latlon,
        manualLatLon: body.manualLatLon ?? null,
      };
      const resolved = await AnalysisService.resolveCoordinate(resolveInput);

      // 5) SIMPAN: cek zona + buat Violation
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
        detections,
        detectionCount: detections.length,
        coordinateSource: resolved.source,
        coordinate: resolved.latlon,
        ocrRawText: ocr.rawText,
        annotatedImagePath: annotatedPath,
        result,
        // sertakan prediction MENTAH Roboflow supaya format aslinya terlihat
        roboflowRaw,
      });
    } catch (err) {
      next(err);
    }
  }
}

export default AnalysisController;