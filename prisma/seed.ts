// Script SEED: mengisi database dengan data contoh untuk demo/tes.
// Jalankan: npx tsx prisma/seed.ts
// Aman dijalankan berulang (data contoh lama dengan tanda [SEED] dibersihkan dulu).
import prisma from "../src/config/prisma.js";

const SEED_TAG = "[SEED]";

async function main() {
  console.log("Membersihkan data contoh lama...");
  // Hapus data lama bertanda SEED (urut: violation -> analysis -> report -> media -> zone)
  const oldMedia = await prisma.mediaFile.findMany({ where: { originalName: { startsWith: SEED_TAG } } });
  const oldMediaIds = oldMedia.map((m) => m.id);
  if (oldMediaIds.length) {
    const oldAnalyses = await prisma.analysis.findMany({ where: { mediaId: { in: oldMediaIds } } });
    const anIds = oldAnalyses.map((a) => a.id);
    await prisma.annotatedFrame.deleteMany({ where: { violation: { analysisId: { in: anIds } } } });
    await prisma.violation.deleteMany({ where: { analysisId: { in: anIds } } });
    await prisma.report.deleteMany({ where: { analysisId: { in: anIds } } });
    await prisma.analysis.deleteMany({ where: { id: { in: anIds } } });
    await prisma.mediaFile.deleteMany({ where: { id: { in: oldMediaIds } } });
  }
  await prisma.zone.deleteMany({ where: { name: { startsWith: SEED_TAG } } });

  console.log("Membuat data contoh...");

  // 1 Zona contoh (sekitar Kebon Jeruk, Jakarta Barat)
  const zone = await prisma.zone.create({
    data: {
      name: `${SEED_TAG} Zona Kb. Jeruk`,
      points: [
        [106.760, -6.190], [106.775, -6.190], [106.775, -6.200], [106.760, -6.200],
      ] as any,
    },
  });

  // 1 Media + 1 Analysis
  const media = await prisma.mediaFile.create({
    data: { originalName: `${SEED_TAG} patroli-kbjeruk.jpg`, mediaType: "photo", sizeBytes: 250000, storagePath: "storage/media/seed.jpg" },
  });
  const analysis = await prisma.analysis.create({
    data: { mediaId: media.id, status: "done", progress: 100, photoCount: 1 },
  });

  // Beberapa pelanggaran dengan status beragam
  const rows = [
    { status: "valid",      followUp: "sudah", conf: 0.82 },
    { status: "valid",      followUp: "belum", conf: 0.76 },
    { status: "invalid",    followUp: "belum", conf: 0.55 },
    { status: "unverified", followUp: "belum", conf: 0.68 },
    { status: "unverified", followUp: "belum", conf: 0.91 },
  ];

  let i = 0;
  for (const r of rows) {
    i++;
    const v = await prisma.violation.create({
      data: {
        analysisId: analysis.id,
        zoneId: zone.id,
        lat: -6.195 + i * 0.0005,
        lng: 106.767 + i * 0.0005,
        confidence: r.conf,
        bbox: { x1: 10, y1: 20, x2: 120, y2: 240 } as any,
        coordinateSource: "gps_exif",
        locationStatus: "matched",
        status: r.status as any,
        followUp: r.followUp as any,
        address: `Jl. Raya Kb. Jeruk No.${20 + i}, Kb. Jeruk`,
      },
    });
    // 1 frame beranotasi (bukti visual) per pelanggaran
    await prisma.annotatedFrame.create({
      data: { violationId: v.id, imagePath: `storage/frames/seed-${i}.jpg` },
    });
  }

  const total = await prisma.violation.count();
  console.log(`SEED SELESAI. Total pelanggaran di DB sekarang: ${total}`);
  console.log(`Zona: ${zone.name} | Analysis: ${analysis.id}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error("SEED ERROR:", e.message); process.exit(1); });