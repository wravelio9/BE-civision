# API Validasi Pelanggaran (Requirement 9)

Endpoint untuk petugas meninjau & memvalidasi pelanggaran hasil deteksi.

Base URL: `http://localhost:3000`

## Status Pelanggaran
- `unverified` = belum diperiksa (default saat baru terdeteksi) → pin ABU-ABU
- `valid` = petugas setuju ini pelanggaran → pin HIJAU
- `invalid` = petugas menolak → DISEMBUNYIKAN dari peta/daftar (soft-delete, data tetap ada)

## Tindak Lanjut (hanya untuk `valid`)
- `belum` (default) / `sudah`

---

## 1. Daftar Pelanggaran Aktif
`GET /api/violations`  (opsional: `?analysisId=xxx`)

Hanya menampilkan yang TIDAK `invalid`. Response:
```json
{ "ok": true, "violations": [ { "id":"...", "lat":-6.1, "lng":106.8, "zoneId":"...", "confidence":0.8, "status":"unverified", "followUp":"belum", "coordinateSource":"gps_exif", "bbox":{...} } ] }
```

## 2. Ubah Status Validasi
`PATCH /api/violations/:id/status`
Body:
```json
{ "status": "valid" }
```
atau `{ "status": "invalid" }`.
- `valid` → follow-up otomatis jadi `belum`.
- `invalid` → disembunyikan (soft-delete), baris tetap ada.

Response: `{ "ok": true, "violation": { ... } }`

## 3. Ubah Tindak Lanjut (hanya valid)
`PATCH /api/violations/:id/follow-up`
Body:
```json
{ "followUp": "sudah" }
```
atau `{ "followUp": "belum" }`.
Kalau pelanggaran belum berstatus `valid`, ditolak (`errorCode: not_valid`).

---

## Error
- 404 `not_found` — pelanggaran tidak ada
- 400 `invalid_status` / `invalid_followup` — nilai tidak dikenal
- 400 `not_valid` — follow-up dipakai pada pelanggaran non-valid

## Untuk Frontend
- Warna pin: unverified=abu-abu, valid=hijau, invalid=jangan ditampilkan.
- Popup klik pin: tombol Valid/Invalid → panggil endpoint #2. Untuk valid: checkbox sudah/belum → endpoint #3.