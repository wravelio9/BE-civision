// Konfigurasi terpusat, dibaca dari environment variable.
import dotenv from "dotenv";
dotenv.config();

const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  defaultConf: parseFloat(process.env.DEFAULT_CONF || "0.5"),
  maxVideoBytes: parseInt(process.env.MAX_VIDEO_MB || "200", 10) * 1024 * 1024,
};

export default config;