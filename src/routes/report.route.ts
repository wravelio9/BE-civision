// Route Laporan (Requirement 7).
import express from "express";
import ReportController from "../controller/report.controller.js";

const router = express.Router();
router.get("/reports", ReportController.list);
// endpoint PDF ditambahkan di tahap berikutnya

export default router;