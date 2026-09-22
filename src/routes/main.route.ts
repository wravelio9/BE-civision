import express from "express"
import Controller from "../controller/main.controller.js"
const app = express.Router()

app.post("/upload", Controller.upload)

app.get("/report", Controller.report)

// app.put()

export default app;