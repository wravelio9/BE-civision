// Controller Zona Terlarang - menangani request CRUD zona.
import { Request, Response, NextFunction } from "express";
import ZoneService, { ZoneError } from "../service/zone.service.js";

// Terjemahkan ZoneError (validasi) menjadi HTTP 400 yang rapi.
function handleZoneError(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof ZoneError) {
    return res.status(400).json({ ok: false, errorCode: err.code, message: err.message });
  }
  return next(err);
}

class ZoneController {
  // POST /api/zones
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, points } = req.body;
      const zone = await ZoneService.create({ name, points });
      return res.status(201).json({ ok: true, message: "Zona tersimpan.", zone });
    } catch (err) {
      return handleZoneError(err, res, next);
    }
  }

  // GET /api/zones
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const zones = await ZoneService.list();
      return res.json({ ok: true, zones });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/zones/:id
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const zone = await ZoneService.getById(req.params.id as string);
      if (!zone) return res.status(404).json({ ok: false, message: "Zona tidak ditemukan." });
      return res.json({ ok: true, zone });
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/zones/:id
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, points } = req.body;
      const zone = await ZoneService.update(req.params.id as string, { name, points });
      if (!zone) return res.status(404).json({ ok: false, message: "Zona tidak ditemukan." });
      return res.json({ ok: true, message: "Zona diperbarui.", zone });
    } catch (err) {
      return handleZoneError(err, res, next);
    }
  }

  // DELETE /api/zones/:id
  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const zone = await ZoneService.remove(req.params.id as string);
      if (!zone) return res.status(404).json({ ok: false, message: "Zona tidak ditemukan." });
      return res.json({ ok: true, message: "Zona dihapus.", zone });
    } catch (err) {
      next(err);
    }
  }
}

export default ZoneController;