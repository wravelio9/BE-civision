import express from "express";
import dotenv from "dotenv";
import cors from "cors"

dotenv.config();
import logger from "./middlewares/logger.js"
import apiRoute from "./routes/main.route.js";
import zoneRoute from "./routes/zone.route.js";
import analysisRoute from "./routes/analysis.route.js";
import violationRoute from "./routes/violation.route.js";
import dashboardRoute from "./routes/dashboard.route.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
// app.use(logger);

app.get("/health", (req, res) => {
    res.json({ status: 'OK', env: PORT})
})

app.use(apiRoute);
app.use("/api", zoneRoute);       // Zona: /api/zones
app.use("/api", analysisRoute);   // Analisis: /api/analysis
app.use("/api", violationRoute);  // Validasi pelanggaran: /api/violations
app.use("/api", dashboardRoute);  // Dashboard peta: /api/dashboard/map

if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`BE is running on http://localhost:${PORT}`)
        console.log(`AI is running on ${process.env.AI_SERVICE_URL}`)
    })
}

export default app;