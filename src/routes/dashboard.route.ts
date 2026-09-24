// Route Dashboard (Requirement 6).
import express from "express";
import DashboardController from "../controller/dashboard.controller.js";

const router = express.Router();
router.get("/dashboard/map", DashboardController.mapData);

export default router;