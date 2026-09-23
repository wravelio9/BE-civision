# API Zona Terlarang (CRUD)

Dokumentasi kontrak API untuk fitur Zona Terlarang. Dipakai sebagai acuan Frontend.

Base URL (lokal): `http://localhost:3000`

## Konsep Penting

- Zona Terlarang = poligon geografis di peta (area yang tidak boleh ditempati PKL).
- Frontend menggambar poligon di peta (Leaflet). Hasil gambar = daftar titik koordinat.
- Backend hanya MENERIMA & MENYIMPAN koordinat itu (tidak ada peta di backend).
- Format koordinat: `[lng, lat]` (bujur dulu, lalu lintang) mengikuti standar GeoJSON/Leaflet.
- `points` adalah array titik. Contoh segitiga: `[[lng,lat],[lng,lat],[lng,lat]]`.

## Aturan Validasi (Requirement 2)

| Aturan | Keterangan |
|--------|-----------|
| Minimal 3 titik | Poligon < 3 titik ditolak (`too_few_points`) |
| Tidak boleh saling berpotongan | Poligon self-intersecting ditolak (`self_intersecting`) |
| Maksimal 20 zona | Jika sudah 20 zona, create baru ditolak (`max_zones_reached`) |
| Nama wajib | Nama kosong ditolak (`name_required`) |
| Urutan titik dipertahankan | Titik disimpan sesuai urutan yang dikirim |

---

## Endpoints

### 1. Buat Zona
`POST /api/zones`

Request body:
```json
{
  "name": "Alun-alun Kota",
  "points": [[106.827, -6.175], [106.829, -6.175], [106.829, -6.177]]
}
```

Response 201:
```json
{
  "ok": true,
  "message": "Zona tersimpan.",
  "zone": {
    "id": "uuid",
    "name": "Alun-alun Kota",
    "points": [[106.827, -6.175], [106.829, -6.175], [106.829, -6.177]],
    "createdAt": "2026-09-23T10:00:00.000Z"
  }
}
```

Response 400 (validasi gagal):
```json
{ "ok": false, "errorCode": "too_few_points", "message": "Poligon harus memiliki minimal 3 titik." }
```
Nilai `errorCode` yang mungkin: `name_required`, `too_few_points`, `self_intersecting`, `max_zones_reached`.

---

### 2. Daftar Semua Zona
`GET /api/zones`

Response 200:
```json
{
  "ok": true,
  "zones": [
    { "id": "uuid", "name": "Alun-alun Kota", "points": [[...]], "createdAt": "..." }
  ]
}
```

---

### 3. Detail Satu Zona
`GET /api/zones/:id`

Response 200:
```json
{ "ok": true, "zone": { "id": "uuid", "name": "...", "points": [[...]], "createdAt": "..." } }
```
Response 404:
```json
{ "ok": false, "message": "Zona tidak ditemukan." }
```

---

### 4. Ubah Zona
`PUT /api/zones/:id`

Request body (name dan/atau points, keduanya opsional):
```json
{ "name": "Nama Baru", "points": [[106.827, -6.175], [106.829, -6.175], [106.829, -6.177]] }
```
Response 200:
```json
{ "ok": true, "message": "Zona diperbarui.", "zone": { ... } }
```
Jika `points` diubah, divalidasi ulang (aturan sama seperti create).

---

### 5. Hapus Zona
`DELETE /api/zones/:id`

Response 200:
```json
{ "ok": true, "message": "Zona dihapus.", "zone": { ...data zona yang dihapus... } }
```
Response 404 jika tidak ditemukan.

---

## Catatan untuk Frontend

- Kirim body sebagai JSON (`Content-Type: application/json`).
- Saat user selesai menggambar poligon di Leaflet, ambil koordinatnya dalam urutan `[lng, lat]` lalu kirim ke `POST /api/zones`.
- Tangani `ok: false` untuk menampilkan pesan error validasi ke user.
- Batas 20 zona: sembunyikan/nonaktifkan tombol "tambah zona" jika sudah 20 (opsional, backend tetap menolak).