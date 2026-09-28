# Dokumentasi Backend Civision

Selamat datang. Mulai dari sini untuk memahami backend.

## Baca Dulu
- **[PANDUAN-BACKEND.md](PANDUAN-BACKEND.md)** — penjelasan bahasa manusia:
  alur sistem, struktur folder, penjelasan syntax, dan contekan untuk demo.
  (Wajib dibaca ketua tim & anggota yang belum pernah sentuh backend.)

## Dokumentasi API (untuk Frontend)
Semua ada di folder [`api/`](api/):

| Fitur | File | Endpoint utama |
|-------|------|----------------|
| Zona Terlarang | [api/zona.md](api/zona.md) | `GET/POST/PUT/DELETE /api/zones` |
| Dashboard Peta | [api/dashboard.md](api/dashboard.md) | `GET /api/dashboard/map` |
| Validasi Pelanggaran | [api/validasi-pelanggaran.md](api/validasi-pelanggaran.md) | `PATCH /api/violations/:id/status` |
| Riwayat Analisis | [api/riwayat.md](api/riwayat.md) | `GET /api/history` |
| Laporan + PDF | [api/laporan.md](api/laporan.md) | `GET /api/reports`, `GET /api/reports/:id/pdf` |

## Catatan
- Dokumen spec lengkap (requirements, design, tasks) ada terpisah di folder
  `.kiro/specs/pkl-detection-report/` (bukan di sini, biar folder docs ringkas).
- Untuk menjalankan backend: nyalakan MySQL (XAMPP) lalu `npm run dev`.
- Untuk mengisi data contoh saat demo/tes: `npx tsx prisma/seed.ts`.