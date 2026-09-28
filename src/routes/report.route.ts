// Route Laporan (Requirement 7).
import express from "express";
import ReportController from "../controller/report.controller.js";

const router = express.Router();
router.get("/reports", ReportController.list);
router.get("/reports/:id/pdf", ReportController.downloadPdf);

export default router;