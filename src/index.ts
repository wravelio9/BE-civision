import express from "express";
import dotenv from "dotenv";

dotenv.config();
import logger from "./middlewares/logger.js"
import apiRoute from "./routes/main.route.js";

const app = express();
const PORT = process.env.PORT || 3000;
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

// Simpan file upload di memory (tidak ditulis ke disk). Cocok karena kita
// langsung meneruskannya ke AI service.

app.use(logger);

app.get("/health", (req, res) => {
    res.json({ status: 'OK', env: PORT })
})

app.use(apiRoute);

app.listen(PORT, () => {
    console.log(`BE is running on http://localhost:${PORT}`)
    console.log(`AI is running on ${process.env.AI_SERVICE_URL}`)
})