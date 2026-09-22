import express from "express"
import multer from "multer";
import Controller from "../controller/main.controller.js"
const app = express.Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // maks 10MB per file
});

app.post("/upload", upload.array("photos", 20), Controller.upload)

app.get("/report", Controller.report)

// app.put()

export default app;

// C create
// R read
// u update
// d delete