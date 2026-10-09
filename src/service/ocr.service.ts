// Service OCR (backend) - membaca koordinat dari overlay foto pakai tesseract.js.
// Untuk foto tanpa GPS EXIF: baca teks koordinat yang "dibakar" di gambar (overlay)
// lalu ubah menjadi { lat, lon }. Simbol derajat ditulis sebagai \u00b0 agar aman encoding.
import { createWorker } from "tesseract.js";
import type { LatLon } from "../interface/analysis.interface.js";

const DEG = "\\u00b0"; // simbol derajat untuk regex

// ---- Parsing teks -> koordinat (fungsi murni) ----
export function parseCoordinatesFromText(text: string): LatLon | null {
  if (!text) return null;
  const t = text.replace(/\s+/g, " ").trim();

  // 1) Desimal + arah: "6.1752 S, 106.8272 E" / "6.1752\u00b0S 106.8272\u00b0E"
  const decDir = new RegExp(
    `(-?\\d{1,3}(?:\\.\\d+)?)\\s*${DEG}?\\s*([NS])\\s*[, ]+\\s*(-?\\d{1,3}(?:\\.\\d+)?)\\s*${DEG}?\\s*([EW])`,
    "i"
  );
  let m = t.match(decDir);
  if (m) {
    let lat = parseFloat(m[1]!);
    let lon = parseFloat(m[3]!);
    if (m[2]!.toUpperCase() === "S") lat = -Math.abs(lat);
    if (m[4]!.toUpperCase() === "W") lon = -Math.abs(lon);
    if (isReasonable(lat, lon)) return { lat, lon };
  }

  // 2) Desimal bertanda tanpa arah: "-6.1752, 106.8272"
  const decPlain = /(-?\d{1,2}\.\d{3,})\s*[, ]+\s*(-?\d{1,3}\.\d{3,})/;
  m = t.match(decPlain);
  if (m) {
    const lat = parseFloat(m[1]!);
    const lon = parseFloat(m[2]!);
    if (isReasonable(lat, lon)) return { lat, lon };
  }

  // 3) DMS: "6\u00b010'30.7\"S 106\u00b049'37.9\"E" (semua simbol opsional, toleran spasi)
  const dms = new RegExp(
    `(\\d{1,3})\\s*${DEG}?\\s*(\\d{1,2})\\s*['\u2019]?\\s*(\\d{1,2}(?:\\.\\d+)?)\\s*["\u201d]?\\s*([NS])\\s*[, ]*\\s*(\\d{1,3})\\s*${DEG}?\\s*(\\d{1,2})\\s*['\u2019]?\\s*(\\d{1,2}(?:\\.\\d+)?)\\s*["\u201d]?\\s*([EW])`,
    "i"
  );
  m = t.match(dms);
  if (m) {
    let lat = dmsToDecimal(+m[1]!, +m[2]!, +m[3]!);
    let lon = dmsToDecimal(+m[5]!, +m[6]!, +m[7]!);
    if (m[4]!.toUpperCase() === "S") lat = -lat;
    if (m[8]!.toUpperCase() === "W") lon = -lon;
    if (isReasonable(lat, lon)) return { lat, lon };
  }

  return null;
}

function dmsToDecimal(d: number, min: number, sec: number): number {
  return d + min / 60 + sec / 3600;
}

function isReasonable(lat: number, lon: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return false;
  if (lat === 0 && lon === 0) return false;
  return true;
}

// Baca lebar & tinggi JPEG dari header (tanpa library). Mengembalikan null bila
// bukan JPEG/format tak dikenal -> pemanggil fallback OCR seluruh gambar.
function readJpegSize(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null; // bukan JPEG
  let o = 2;
  while (o < buf.length) {
    if (buf[o] !== 0xff) { o++; continue; }
    const marker = buf[o + 1]!;
    // SOF markers berisi dimensi (kecuali C4/C8/CC yang bukan frame).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const height = buf.readUInt16BE(o + 5);
      const width = buf.readUInt16BE(o + 7);
      return { width, height };
    }
    o += 2 + buf.readUInt16BE(o + 2); // lompat ke segmen berikutnya
  }
  return null;
}

// ---- OCR gambar -> koordinat (tesseract.js) ----
// Anti-crash: OCR cuma cadangan koordinat (EXIF/manual masih ada), jadi gambar rusak
// atau worker error TIDAK boleh menggagalkan upload, apalagi mematikan server.
// tesseract.js v7 melempar error dari dalam event handler worker kalau tidak ada
// errorHandler -> jadi uncaughtException. Karena itu errorHandler wajib dipasang.
export async function readCoordinatesFromImage(
  image: Buffer | string
): Promise<{ latlon: LatLon | null; rawText: string }> {
  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
  try {
    // Di serverless (Vercel) filesystem read-only kecuali /tmp. Tesseract perlu
    // menulis cache + file bahasa, jadi arahkan ke /tmp. Di lokal pakai default.
    const onVercel = !!process.env.VERCEL;
    const options = onVercel
      ? { errorHandler: (e: unknown) => console.warn("[ocr] worker error:", e), langPath: "/tmp", cachePath: "/tmp" }
      : { errorHandler: (e: unknown) => console.warn("[ocr] worker error:", e) };
    worker = await createWorker("eng", undefined, options);

    // Overlay koordinat Timemark ada di 1/3 bawah foto. OCR seluruh foto yang ramai
    // (gerobak, jalan) menghasilkan teks acak, jadi batasi ke area bawah via rectangle
    // bawaan tesseract (tanpa library crop). Butuh dimensi gambar; bila gagal baca
    // dimensi, fallback OCR seluruh gambar.
    const size = Buffer.isBuffer(image) ? readJpegSize(image) : null;
    const recognizeOpts = size
      ? { rectangle: { left: 0, top: Math.floor(size.height * 0.66), width: size.width, height: size.height - Math.floor(size.height * 0.66) } }
      : undefined;

    const { data } = await worker.recognize(image as any, recognizeOpts);
    const rawText = data.text ?? "";
    return { latlon: parseCoordinatesFromText(rawText), rawText };
  } catch (err: any) {
    console.warn("[ocr] gagal membaca gambar, dilewati:", err?.message ?? err);
    return { latlon: null, rawText: "" };
  } finally {
    if (worker) {
      try { await worker.terminate(); } catch { /* abaikan */ }
    }
  }
}

export default { parseCoordinatesFromText, readCoordinatesFromImage };