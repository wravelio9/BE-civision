// Controller Dashboard (Requirement 6).
import { Request, Response, NextFunction } from "express";
import DashboardService from "../service/dashboard.service.js";

class DashboardController {
  // GET /api/dashboard/map
  static async mapData(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await DashboardService.getMapData();
      return res.json({ ok: true, ...data });
    } catch (err) {
      next(err);
    }
  }
}

export default DashboardController;