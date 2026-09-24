# API Dashboard Peta (Requirement 6)

Menyediakan data pelanggaran (pin) + zona untuk ditampilkan di peta oleh frontend.

Base URL: `http://localhost:3000`

## Endpoint
`GET /api/dashboard/map`

Response:
```json
{
  "ok": true,
  "markers": [
    {
      "id": "uuid",
      "lat": -6.175, "lng": 106.827,
      "color": "grey",          // grey (unverified) | green (valid)
      "status": "unverified",
      "followUp": "belum",
      "popup": {
        "coordinate": { "lat": -6.175, "lng": 106.827 },
        "zoneId": "uuid", "zoneName": "Alun-alun",
        "confidence": 0.76,
        "time": "2026-09-24T...",
        "address": null,
        "evidenceUrl": "storage/frames/xxx.jpg"
      }
    }
  ],
  "zones": [ { "id":"uuid", "name":"Alun-alun", "points":[[lng,lat],...] } ],
  "isEmpty": false
}
```

## Aturan tampilan (untuk Frontend)
- `markers` HANYA berisi pelanggaran ber-lokasi valid & bukan `invalid`.
- Warna pin: `grey` = unverified, `green` = valid. (invalid tidak dikirim = tidak ditampilkan)
- `zones` = poligon untuk digambar di peta bersama pin.
- `isEmpty: true` → tampilkan pesan "tidak ada pelanggaran berlokasi".
- `popup` = data untuk ditampilkan saat hover/klik pin (koordinat, zona, waktu, bukti visual).
- Untuk aksi verifikasi (valid/invalid) & follow-up, pakai endpoint di `api-validasi-pelanggaran.md`.