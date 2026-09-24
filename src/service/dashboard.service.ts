// Service Dashboard (Requirement 6): sediakan data marker pelanggaran + poligon zona
// untuk ditampilkan di peta oleh frontend.
import prisma from "../db/prisma.js";

// Warna pin berdasarkan status validasi (Req 6.3).
function pinColor(status: string): string {
  if (status === "valid") return "green";
  return "grey"; // unverified
}

class DashboardService {
  // Data untuk peta: marker (pin) + zona. Marker hanya untuk pelanggaran
  // ber-lokasi valid DAN tidak invalid (Req 6.1, 6.4).
  static async getMapData() {
    const violations = await prisma.violation.findMany({
      where: { status: { not: "invalid" }, locationStatus: "matched" },
      include: { annotatedFrames: true, zone: true },
      orderBy: { createdAt: "desc" },
    });

    const markers = violations.map((v) => ({
      id: v.id,
      lat: v.lat,
      lng: v.lng,
      color: pinColor(v.status),          // grey / green
      status: v.status,
      followUp: v.followUp,
      // info untuk popup (hover/klik): koordinat, zona, waktu, bukti visual
      popup: {
        coordinate: { lat: v.lat, lng: v.lng },
        zoneId: v.zoneId,
        zoneName: v.zone?.name ?? null,
        confidence: v.confidence,
        time: v.createdAt,
        address: v.address ?? null,
        evidenceUrl: v.annotatedFrames[0]?.imagePath ?? null,
      },
    }));

    const zonesRaw = await prisma.zone.findMany();
    const zones = zonesRaw.map((z) => ({ id: z.id, name: z.name, points: z.points }));

    return {
      markers,
      zones,
      isEmpty: markers.length === 0, // untuk empty-state di frontend (Req 6.4)
    };
  }
}

export default DashboardService;