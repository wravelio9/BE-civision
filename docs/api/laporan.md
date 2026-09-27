# API Laporan (Requirement 7)

Halaman "Reports Details": kartu statistik + tabel pelanggaran + unduh PDF.

Base URL: `http://localhost:3000`

## 1. Statistik + Tabel Laporan
`GET /api/reports`

Response:
```json
{
  "ok": true,
  "stats": { "total": 15280, "valid": 12702, "invalid": 2415, "unverified": 163 },
  "reports": [
    {
      "id": "00001...",
      "location": "Jl. Raya Kb. Jeruk No.27",   // dari reverse geocode; fallback koordinat
      "date": "26/09/2026",                       // DD/MM/YYYY
      "timestamp": "13:19:27",
      "mediaUrl": "storage/frames/xxx.jpg",       // kolom "Media" (Link)
      "mediaName": "foto.jpg",
      "status": "valid",                          // valid | invalid | unverified
      "downloadUrl": "/api/reports/00001.../pdf", // kolom "Download"
      "coordinate": { "lat": -6.1, "lng": 106.8 }
    }
  ],
  "isEmpty": false
}
```

Catatan: tabel menampilkan SEMUA status. Warna titik status di frontend:
- valid = hijau, invalid = merah, unverified = abu-abu.

## 2. Unduh PDF Laporan
`GET /api/reports/:id/pdf`

Mengunduh file PDF berisi detail 1 pelanggaran + bukti visual.
Response: file PDF (Content-Disposition: attachment).
404 bila pelanggaran tidak ditemukan.

Isi PDF: judul, instansi tujuan (Satpol PP/Dishub), ID, lokasi, koordinat, zona,
tanggal, waktu, status, keyakinan AI, dan gambar bukti (frame beranotasi).

## Untuk Frontend
- Kartu atas pakai `stats`.
- Tabel pakai `reports[]` (kolom: #, Location, Date, Timestamp, Media=link mediaUrl, Status=titik warna, Download=link downloadUrl).
- Kolom Download / ikon unduh -> arahkan ke `downloadUrl` (browser otomatis unduh PDF).