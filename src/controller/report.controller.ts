// Controller Laporan (Requirement 7).
import { Request, Response, NextFunction } from "express";
import ReportService from "../service/report.service.js";

class ReportController {
  // GET /api/reports  -> data tabel laporan
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const rows = await ReportService.listTable();
      return res.json({ ok: true, reports: rows, isEmpty: rows.length === 0 });
    } catch (err) {
      next(err);
    }
  }
}

export default ReportController;