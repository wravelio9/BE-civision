// Zone Matcher: menentukan apakah sebuah Titik Deteksi berada di dalam Zona
// Terlarang (point-in-polygon). Deterministik, bukan AI. Requirement 5.1, 5.2, 5.3.
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint, polygon as turfPolygon } from "@turf/helpers";
import type { LatLon } from "./exif.service.js";

export type LngLat = [number, number]; // [lng, lat]

export interface ZoneLike {
  id: string;
  name: string;
  points: LngLat[]; // ring poligon (urutan simpul)
}

export interface MatchResult {
  inside: boolean;
  zoneId: string | null;
  zoneName: string | null;
}

// Ubah daftar titik zona menjadi GeoJSON polygon (ring tertutup).
function toClosedRing(points: LngLat[]): LngLat[] {
  if (points.length === 0) return points;
  const first = points[0]!;
  const last = points[points.length - 1]!;
  if (first[0] === last[0] && first[1] === last[1]) return points;
  return [...points, first];
}

// Cek satu titik terhadap satu zona.
export function isPointInZone(latlon: LatLon, zone: ZoneLike): boolean {
  if (!zone.points || zone.points.length < 3) return false;
  const pt = turfPoint([latlon.lon, latlon.lat]); // GeoJSON: [lng, lat]
  const poly = turfPolygon([toClosedRing(zone.points)]);
  return booleanPointInPolygon(pt, poly);
}

// Cek titik terhadap kumpulan zona; kembalikan zona pertama yang memuatnya.
export function matchZone(latlon: LatLon, zones: ZoneLike[]): MatchResult {
  for (const zone of zones) {
    if (isPointInZone(latlon, zone)) {
      return { inside: true, zoneId: zone.id, zoneName: zone.name };
    }
  }
  return { inside: false, zoneId: null, zoneName: null };
}

class ZoneMatcher {
  static isPointInZone = isPointInZone;
  static matchZone = matchZone;
}

export default ZoneMatcher;