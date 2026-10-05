import "dotenv/config";
// Service Roboflow: kirim gambar (base64) ke Roboflow, dapat prediction.
// Juga decode annotated_image (base64) dari Roboflow menjadi file foto.
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const ROBOFLOW_URL =
  process.env.ROBOFLOW_URL ||
  "https://serverless.roboflow.com/wilson-ravelio/workflows/general-segmentation-api";
// API key dibaca saat fungsi dipanggil (lihat callRoboflow)

// Panggil Roboflow dengan gambar base64. Kembalikan JSON mentah apa adanya
// supaya kita bisa lihat format prediction aslinya.
export async function callRoboflow(imageBase64: string): Promise<any> {
  const API_KEY = process.env.AI_API_KEY || "";
  if (!API_KEY) throw new Error("AI_API_KEY belum diset di .env");

  const res = await fetch(ROBOFLOW_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      inputs: {
        image: { type: "base64", value: imageBase64 },
        classes: "gerobak",
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Roboflow error ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

// Decode gambar beranotasi (base64) dari Roboflow menjadi file .jpg di storage.
// Kembalikan path relatif file, atau null bila base64 kosong.
export async function saveAnnotatedImage(base64: string | null | undefined): Promise<string | null> {
  if (!base64) return null;
  // buang prefix data URL bila ada (data:image/jpeg;base64,....)
  const clean = base64.replace(/^data:image\/\w+;base64,/, "");
  const dir = path.resolve(process.cwd(), "storage", "frames");
  await fs.mkdir(dir, { recursive: true });
  const filename = `${crypto.randomUUID()}.jpg`;
  const relPath = path.join("storage", "frames", filename);
  await fs.writeFile(path.resolve(process.cwd(), relPath), Buffer.from(clean, "base64"));
  return relPath;
}

export default { callRoboflow, saveAnnotatedImage };