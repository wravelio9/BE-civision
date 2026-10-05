// Konfigurasi terpusat, dibaca dari environment variable.
import dotenv from "dotenv";
dotenv.config();

const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  aiServiceUrl: (process.env.AI_SERVICE_URL || "http://localhost:8000").replace(/\/+$/, ""),
  // Roboflow Workflow (deteksi gerobak). API key dibaca dari AI_API_KEY.
  roboflowApiKey: process.env.AI_API_KEY || "",
  roboflowWorkflowUrl:
    process.env.ROBOFLOW_WORKFLOW_URL ||
    "https://serverless.roboflow.com/wilson-ravelio/workflows/general-segmentation-api",
  roboflowClasses: process.env.ROBOFLOW_CLASSES || "gerobak",
  defaultConf: parseFloat(process.env.DEFAULT_CONF || "0.5"),
  maxVideoBytes: parseInt(process.env.MAX_VIDEO_MB || "200", 10) * 1024 * 1024,
};

export default config;
 