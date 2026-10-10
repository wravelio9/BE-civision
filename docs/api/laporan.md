# API Laporan (Requirement 7)

Halaman "Reports Details": kartu statistik + tabel pelanggaran + unduh PDF.

Base URL: `http://localhost:3000`

## 1. Statistik + Tabel Laporan (server-side pagination)
`GET /api/reports?page=1&pageSize=10`

Query:

| Query    | Tipe    | Default | Aturan |
|----------|---------|---------|--------|
| page     | integer | 1       | ≥ 1    |
| pageSize | integer | 10      | 1 – 50 |

- Tanpa query = halaman 1, 10 item.
- `page` / `pageSize` bukan bilangan bulat (mis. `abc`, `1.5`, `-1`) atau di luar batas → 400.
- `page` melebihi `totalPages` → tetap 200 dengan `reports: []`, `pagination` tetap diisi.

Response 200:
```json
{
  "ok": true,
  "stats": { "total": 15280, "valid": 12702, "invalid": 2415, "unverified": 163 },
  "reports": [
    {
      "id": "b7c1…-uuid",
      "location": "Jl. Raya Kb. Jeruk No.27, Kebon Jeruk",
      "date": "26/09/2026",
      "timestamp": "13:19:27",
      "mediaUrl": "https://<project>.supabase.co/storage/v1/object/public/media/<uuid>.jpg",
      "mediaName": "IMG_0012.jpg",
      "status": "valid",
      "downloadUrl": "/api/reports/b7c1…-uuid/pdf",
      "coordinate": { "lat": -6.1925, "lng": 106.7695 }
    }
  ],
  "pagination": { "page": 1, "pageSize": 10, "totalItems": 15280, "totalPages": 1528 },
  "isEmpty": false
}
```

Field:
- `stats`: hitungan SELURUH data (bukan per halaman).
- `reports`: hanya isi 1 halaman, urut terbaru dulu (`createdAt` desc, lalu `id` desc
  supaya urutan stabil → tidak ada baris dobel/hilang antar halaman).
  - `location`: alamat hasil reverse geocode; fallback `"lat, lng"` (5 desimal) bila kosong.
  - `date` / `timestamp`: zona waktu Asia/Jakarta (WIB), format `DD/MM/YYYY` dan `HH:MM:SS`.
  - `mediaUrl`: frame beranotasi bila ada; selain itu URL publik foto asli di Supabase. `null` bila tidak ada keduanya.
  - `status`: `valid` | `invalid` | `unverified`.
  - `downloadUrl`: link unduh PDF (lihat bagian 2).
- `pagination.totalItems`: jumlah semua pelanggaran (semua status) = `stats.total`.
- `pagination.totalPages`: `ceil(totalItems / pageSize)`; `0` bila tidak ada data.
- `isEmpty`: `true` bila tidak ada data sama sekali (`totalItems === 0`), BUKAN karena halaman ini kosong.

Response error:

| Kasus              | Status | Body |
|--------------------|--------|------|
| Query tidak valid  | 400    | `{ "ok": false, "message": "Parameter page/pageSize tidak valid." }` |
| Error DB / lainnya | 500    | `{ "ok": false, "message": "Gagal mengambil data laporan." }` |

Catatan: tabel menampilkan SEMUA status. Warna titik status di frontend:
- valid = hijau, invalid = merah, unverified = abu-abu.

## 2. Unduh PDF Laporan
`GET /api/reports/:id/pdf`

Mengunduh file PDF berisi detail 1 pelanggaran + bukti visual.
Response: file PDF (Content-Disposition: attachment).
404 bila pelanggaran tidak ditemukan.

Isi PDF: judul, instansi tujuan (Satpol PP/Dishub), ID, lokasi, koordinat, zona,
tanggal & waktu (Asia/Jakarta, sama dengan tabel), status, keyakinan AI, dan gambar bukti (frame beranotasi).

## Untuk Frontend
- Kartu atas pakai `stats`.
- Tabel pakai `reports[]` (kolom: #, Location, Date, Timestamp, Media=link mediaUrl, Status=titik warna, Download=link downloadUrl).
- Nomor baris (#) = `(pagination.page - 1) * pagination.pageSize + index + 1`.
- Kontrol halaman pakai `pagination.page` & `pagination.totalPages`; ganti halaman = panggil ulang
  `GET /api/reports?page=<n>&pageSize=<size>`.
- Tampilkan "belum ada laporan" bila `isEmpty === true`. Bila `isEmpty === false` tapi
  `reports` kosong, berarti `page` > `totalPages` → arahkan ke halaman terakhir.
- Kolom Download / ikon unduh -> arahkan ke `downloadUrl` (browser otomatis unduh PDF).