import express from "express";
import dotenv from "dotenv";
import cors from "cors"

dotenv.config();
import logger from "./middlewares/logger.js"
import apiRoute from "./routes/main.route.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
// app.use(logger);

app.get("/health", (req, res) => {
    res.json({ status: 'OK', env: PORT })
})

app.use(apiRoute);

// Only start a listener when running locally, not on Vercel (serverless).
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`BE is running on http://localhost:${PORT}`)
        console.log(`AI is running on ${process.env.AI_SERVICE_URL}`)
    })
}

export default app;