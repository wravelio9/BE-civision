// Route Riwayat Analisis (Requirement 8).
import express from "express";
import HistoryController from "../controller/history.controller.js";

const router = express.Router();
router.get("/history", HistoryController.list);
router.get("/history/:id", HistoryController.detail);

export default router;