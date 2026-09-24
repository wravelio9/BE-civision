// Controller Validasi Pelanggaran (Requirement 9).
import { Request, Response, NextFunction } from "express";
import ViolationService, { ViolationError } from "../service/violation.service.js";

function handleErr(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof ViolationError) {
    return res.status(err.status).json({ ok: false, errorCode: err.code, message: err.message });
  }
  return next(err);
}

class ViolationController {
  // GET /api/violations  (opsional query: ?analysisId=...)
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const analysisId = typeof req.query.analysisId === "string" ? req.query.analysisId : undefined;
      const violations = await ViolationService.listActive(analysisId);
      return res.json({ ok: true, violations });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/violations/:id/status   body: { status: "valid" | "invalid" }
  static async setStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.body;
      const v = await ViolationService.setStatus(req.params.id as string, status);
      return res.json({ ok: true, message: "Status validasi diperbarui.", violation: v });
    } catch (err) {
      return handleErr(err, res, next);
    }
  }

  // PATCH /api/violations/:id/follow-up   body: { followUp: "belum" | "sudah" }
  static async setFollowUp(req: Request, res: Response, next: NextFunction) {
    try {
      const { followUp } = req.body;
      const v = await ViolationService.setFollowUp(req.params.id as string, followUp);
      return res.json({ ok: true, message: "Tindak lanjut diperbarui.", violation: v });
    } catch (err) {
      return handleErr(err, res, next);
    }
  }
}

export default ViolationController;