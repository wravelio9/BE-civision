// Service Reverse Geocoding: ubah koordinat (lat/lon) menjadi nama jalan/alamat
// menggunakan OpenStreetMap Nominatim. Dipanggil SEKALI saat pelanggaran dibuat,
// hasilnya disimpan ke kolom address (biar tidak convert berulang).
import type { LatLon } from "./exif.service.js";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";

// Ubah koordinat -> alamat. Kembalikan null bila gagal (offline / rate limit / tidak ketemu).
// Pemanggil WAJIB sediakan fallback (mis. tampilkan koordinat) bila null.
export async function reverseGeocode(latlon: LatLon): Promise<string | null> {
  try {
    const url = `${NOMINATIM_URL}?format=jsonv2&lat=${latlon.lat}&lon=${latlon.lon}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        // Nominatim mewajibkan User-Agent yang mengidentifikasi aplikasi.
        "User-Agent": "Civision-PKL-Detection/1.0 (lomba smart city)",
        "Accept-Language": "id",
      },
      // batasi waktu tunggu agar tidak menggantung
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data: any = await res.json();

    // Susun nama jalan dari bagian alamat yang tersedia.
    const a = data.address ?? {};
    const road = a.road || a.pedestrian || a.footway || a.residential || null;
    if (road) {
      const area = a.suburb || a.village || a.town || a.city_district || a.city || "";
      return area ? `${road}, ${area}` : road;
    }
    // fallback ke display_name ringkas bila tidak ada 'road'
    return data.display_name ?? null;
  } catch {
    return null; // gagal -> pemanggil pakai fallback koordinat
  }
}

export default { reverseGeocode };