import express from "express";
import dotenv from "dotenv";

dotenv.config();
import logger from "./middlewares/logger.js"
import apiRoute from "./routes/main.route.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(logger);

app.get("/health", (req, res) => {
    res.json({ status: 'OK', env: PORT })
})

app.use("/api", apiRoute);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
})