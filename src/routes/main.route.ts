import express from "express"
import multer from "multer"
import Controller from "../controller/main.controller.js"

const app = express.Router()

// Simpan berkas di memori dulu; controller yang menulis ke storage.
// Batas 200MB (video terbesar); validasi detail dilakukan di controller.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
})

app.post("/upload", upload.single("media"), Controller.upload)

app.get("/report", Controller.report)

export default app;