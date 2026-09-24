// Route Validasi Pelanggaran (Requirement 9).
import express from "express";
import ViolationController from "../controller/violation.controller.js";

const router = express.Router();

router.get("/violations", ViolationController.list);
router.patch("/violations/:id/status", ViolationController.setStatus);
router.patch("/violations/:id/follow-up", ViolationController.setFollowUp);

export default router;