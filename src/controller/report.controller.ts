// Controller Laporan (Requirement 7): statistik + tabel + unduh PDF.
import { Request, Response, NextFunction } from "express";
import ReportService from "../service/report.service.js";
import { streamReportPdf } from "../service/pdf.service.js";

class ReportController {
  // GET /api/reports  -> statistik + data tabel laporan
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const [stats, reports] = await Promise.all([
        ReportService.stats(),
        ReportService.listTable(),
      ]);
      return res.json({ ok: true, stats, reports, isEmpty: reports.length === 0 });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/reports/:id/pdf  -> unduh PDF laporan
  static async downloadPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ReportService.getOne(req.params.id as string);
      if (!data) {
        return res.status(404).json({ ok: false, message: "Laporan tidak ditemukan." });
      }
      streamReportPdf(data, res);
    } catch (err) {
      next(err);
    }
  }
}

export default ReportController;