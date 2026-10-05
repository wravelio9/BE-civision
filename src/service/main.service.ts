// Service Upload: meneruskan gambar ke Roboflow Workflow (deteksi "gerobak")
// dan mengembalikan hasil JSON-nya. Logika diambil dari model/gerobak.js.
// API key HANYA ada di backend (proxy), tidak pernah dikirim ke FE.
import axios from "axios";
import config from "../config/config.js";

export interface UploadFileResult {
  filename: string;
  mimetype: string;
  result: unknown; // JSON mentah dari Roboflow Workflow
}

export interface UploadFileError {
  filename: string;
  error: string;
  detail?: unknown;
}

export class UploadError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

class Service {
  // Kirim satu gambar (base64) ke Roboflow Workflow, kembalikan JSON hasilnya.
  static async detectGerobak(buffer: Buffer): Promise<unknown> {
    const response = await axios.post(
      config.roboflowWorkflowUrl,
      {
        inputs: {
          image: { type: "base64", value: buffer.toString("base64") },
          classes: config.roboflowClasses,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.roboflowApiKey}`,
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 120000,
      },
    );
    return response.data;
  }

  // Proses semua file gambar. Satu file gagal tidak menggagalkan file lain.
  static async upload(files: Express.Multer.File[]) {
    if (!config.roboflowApiKey) {
      throw new UploadError("AI_API_KEY belum diset di environment.", 500);
    }

    const images = files.filter((f) => (f.mimetype || "").startsWith("image/"));
    const skipped = files.filter((f) => !(f.mimetype || "").startsWith("image/"));

    if (images.length === 0) {
      throw new UploadError("Tidak ada file gambar. Deteksi gerobak hanya mendukung gambar.");
    }

    const settled = await Promise.allSettled(images.map((f) => this.detectGerobak(f.buffer)));

    const results: UploadFileResult[] = [];
    const errors: UploadFileError[] = skipped.map((f) => ({
      filename: f.originalname,
      error: "Tipe file tidak didukung (hanya gambar).",
    }));

    settled.forEach((s, i) => {
      const file = images[i]!;
      if (s.status === "fulfilled") {
        results.push({ filename: file.originalname, mimetype: file.mimetype, result: s.value });
      } else {
        const err: any = s.reason;
        errors.push({
          filename: file.originalname,
          error: err?.response ? "Roboflow mengembalikan error" : "Gagal menghubungi Roboflow",
          detail: err?.response?.data ?? err?.message,
        });
      }
    });

    return { total: files.length, succeeded: results.length, failed: errors.length, results, errors };
  }
}

export default Service
