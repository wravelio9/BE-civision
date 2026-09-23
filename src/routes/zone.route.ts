// Route Zona Terlarang (CRUD) - Requirement 2.
import express from "express";
import ZoneController from "../controller/zone.controller.js";

const router = express.Router();

router.post("/zones", ZoneController.create);
router.get("/zones", ZoneController.list);
router.get("/zones/:id", ZoneController.getById);
router.put("/zones/:id", ZoneController.update);
router.delete("/zones/:id", ZoneController.remove);

export default router;