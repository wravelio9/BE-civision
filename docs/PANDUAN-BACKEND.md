# Panduan Backend Civision (Bahasa Manusia)

Dokumen ini menjelaskan backend TANPA istilah teknis rumit. Buat ketua tim & anggota
yang belum pernah sentuh backend, dan buat contekan saat presentasi/demo.

---

## 1. Backend ini tugasnya apa?

Menerima foto/video → cari tahu lokasinya → cek apakah masuk zona terlarang →
simpan sebagai "pelanggaran" → sediakan datanya buat ditampilkan.

Analogi: backend = "petugas administrasi" yang mencatat & memutuskan.
AI (Wilson) = "mata" yang mendeteksi. Frontend (Shavelina) = "wajah" yang dilihat user.

---

## 2. Struktur Folder (isi tiap folder)

```
src/
├── index.ts            → titik START aplikasi (nyalakan server, daftar semua "pintu")
│
├── config/             → pengaturan (port, alamat AI, dll.)
│
├── routes/             → daftar "PINTU MASUK" (alamat URL / endpoint)
│   ├── main.route.ts       → pintu upload & report (punya Wilson)
│   ├── zone.route.ts       → pintu kelola zona terlarang
│   └── analysis.route.ts   → pintu analisis (simpan hasil deteksi)
│
├── controller/         → "PENERIMA TAMU": nangkap request, atur jawaban
│   ├── main.controller.ts      → upload (Wilson)
│   ├── zone.controller.ts      → zona
│   └── analysis.controller.ts  → analisis
│
├── service/            → "PEKERJA": logika inti yang benar-benar mengerjakan
│   ├── main.service.ts             → kirim foto ke AI (Wilson)
│   ├── zone.service.ts             → simpan/validasi zona
│   ├── exif.service.ts             → baca koordinat GPS dari foto
│   ├── coordinateResolver.service  → pilih koordinat: GPS→OCR→manual
│   ├── zoneMatcher.service.ts      → cek titik masuk zona mana
│   └── analysisPersist.service.ts  → simpan pelanggaran ke database
│
├── db/                 → koneksi ke database
│   └── prisma.ts
│
└── middlewares/        → "penjaga" yang jalan otomatis (log, error, upload)

prisma/schema.prisma    → "cetak biru" database (bentuk tabel)
docs/                   → dokumentasi (termasuk file ini)
```

**Pola penting:** tiap fitur punya 3 lapis — route (pintu) → controller (penerima) → service (pekerja).
Kalau bingung nyari sesuatu: mulai dari `routes/` buat lihat ada pintu apa aja.

---

## 3. Alur Utama (dari foto sampai tersimpan)

```
1. User upload foto
2. AI (Wilson) deteksi PKL → kasih kotak + tingkat keyakinan
3. Backend baca koordinat foto (dari GPS di metadata)
4. Backend cek: koordinat itu masuk zona terlarang?
   - YA  → catat sebagai PELANGGARAN (status awal: "belum diperiksa")
   - TIDAK/tanpa lokasi → bukan pelanggaran
5. Simpan ke database
6. (Nanti) tampilkan di peta + petugas verifikasi valid/tidak
```

---

## 4. Contekan Jawab Pertanyaan (buat demo/tim)

**T: Backend-nya ngapain?**
J: Menerima foto, menentukan lokasinya dari GPS, mengecek apakah lokasi itu
   masuk zona terlarang, lalu menyimpannya sebagai pelanggaran.

**T: Koordinat lokasinya dari mana?**
J: Utama dari GPS di metadata foto. Kalau nggak ada, dari OCR (baca teks di foto).
   Kalau nggak ada juga, petugas input manual di peta.

**T: Gimana tau itu pelanggaran?**
J: Kami gambar "zona terlarang" di peta. Kalau PKL terdeteksi di dalam zona itu,
   dihitung pelanggaran. Ini pakai perhitungan geometri, bukan tebakan AI.

**T: Kenapa pakai database?**
J: Biar data pelanggaran tersimpan permanen — bisa dilihat di dashboard, dibuat
   laporan, dan ditinjau ulang di riwayat.

**T: Statusnya apa aja?**
J: Belum diperiksa (abu-abu) → petugas tandai Valid (hijau) atau Tidak Valid
   (disembunyikan). Yang valid bisa ditandai sudah/belum ditindaklanjuti.

---

## 5. Pembagian Tugas Tim

- Keanan (kamu): Backend — database, zona, simpan pelanggaran, API
- Wilson: AI (Python) — deteksi PKL + OCR koordinat, fitur upload
- Shavelina: Frontend/UI — peta, tampilan, dashboard

---

Catatan: kamu TIDAK perlu paham syntax/kode. Cukup paham alur di dokumen ini.
Detail teknis biar jadi urusan implementasi; yang penting kamu bisa cerita alurnya.