import express from "express";
import dotenv from "dotenv";
import cors from "cors"

dotenv.config();
import logger from "./middlewares/logger.js"
import apiRoute from "./routes/main.route.js";
import zoneRoute from "./routes/zone.route.js";
import analysisRoute from "./routes/analysis.route.js";
import violationRoute from "./routes/violation.route.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json()); // parse body JSON (dibutuhkan endpoint zona & analisis)
// app.use(logger);

app.get("/health", (req, res) => {
    res.json({ status: 'OK', env: PORT})
})

app.use(apiRoute);
app.use("/api", zoneRoute);       // Zona: /api/zones
app.use("/api", analysisRoute);   // Analisis: /api/analysis
app.use("/api", violationRoute);  // Validasi pelanggaran: /api/violations

// Only start a listener when running locally, not on Vercel (serverless).
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`BE is running on http://localhost:${PORT}`)
        console.log(`AI is running on ${process.env.AI_SERVICE_URL}`)
    })
}

export default app;