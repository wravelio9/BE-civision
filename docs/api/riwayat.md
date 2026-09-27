# API Riwayat Analisis (Requirement 8)

Daftar analisis yang pernah dilakukan + buka laporan lengkapnya.

Base URL: `http://localhost:3000`

## 1. Daftar Riwayat
`GET /api/history`

Urut terbaru → terlama. Response:
```json
{
  "ok": true,
  "history": [
    { "id":"uuid", "mediaName":"foto-patroli.jpg", "mediaType":"photo",
      "analyzedAt":"2026-09-24T...", "status":"done", "totalViolations": 1 }
  ],
  "isEmpty": false
}
```
`isEmpty: true` → tampilkan pesan "belum ada riwayat analisis" (Req 8.4).

## 2. Detail / Laporan Satu Analisis
`GET /api/history/:id`

Response 200:
```json
{
  "ok": true,
  "report": {
    "id":"uuid",
    "media": { "id":"uuid", "name":"foto-patroli.jpg", "type":"photo" },
    "analyzedAt":"...", "status":"done", "totalViolations": 1,
    "violations": [
      { "id":"uuid", "lat":-6.1, "lng":106.8, "zoneId":"uuid", "zoneName":"Alun-alun",
        "confidence":0.8, "status":"unverified", "followUp":"belum",
        "coordinateSource":"gps_exif", "evidenceUrl":"storage/frames/xxx.jpg", "time":"..." }
    ]
  }
}
```
Response 404 (Req 8.6):
```json
{ "ok": false, "message": "Laporan tidak tersedia." }
```

## Catatan
- Pelanggaran berstatus `invalid` tidak dihitung/ditampilkan (soft-delete).
- Waktu presisi hingga detik.