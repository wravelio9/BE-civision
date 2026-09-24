// Controller Riwayat Analisis (Requirement 8).
import { Request, Response, NextFunction } from "express";
import HistoryService from "../service/history.service.js";

class HistoryController {
  // GET /api/history
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await HistoryService.list();
      // Req 8.4: empty-state ditandai lewat isEmpty
      return res.json({ ok: true, history: items, isEmpty: items.length === 0 });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/history/:id
  static async detail(req: Request, res: Response, next: NextFunction) {
    try {
      const detail = await HistoryService.getDetail(req.params.id as string);
      // Req 8.6: laporan tak ditemukan -> pesan, daftar tetap bisa diambil terpisah
      if (!detail) {
        return res.status(404).json({ ok: false, message: "Laporan tidak tersedia." });
      }
      return res.json({ ok: true, report: detail });
    } catch (err) {
      next(err);
    }
  }
}

export default HistoryController;