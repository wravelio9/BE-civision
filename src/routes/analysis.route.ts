// Route Analisis (Requirement 5) - endpoint menyatukan resolver koordinat + persist.
import express from "express";
import multer from "multer";
import AnalysisController from "../controller/analysis.controller.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// field "photo" opsional (untuk baca GPS EXIF). Data lain via body/JSON.
router.post("/analysis", upload.single("photo"), AnalysisController.analyze);

export default router;