import express from "express"
import upload from "../middlewares/upload.js"
import Controller from "../controller/main.controller.js"
const app = express.Router()

// Satu endpoint upload untuk gambar & video. Field name: "files" (bisa banyak).
app.post("/upload", upload.array("files", 20), Controller.upload)

app.get("/report", Controller.report)

// app.put()

export default app;