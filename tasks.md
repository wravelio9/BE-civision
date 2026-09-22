# Implementation Plan: PKL Detection Report (Arsitektur Hybrid Node.js + Python)

## Overview

Rencana implementasi ini menerjemahkan desain **hybrid Node.js + Python** menjadi langkah-langkah koding inkremental untuk Sistem pemantauan ketertiban ruang publik berbasis zona. Pendekatan mengikuti prinsip desain: **batch (bukan realtime)**, **foto sebagai jalur utama, video = kumpulan foto**, **perolehan koordinat berjenjang (tiered fallback) yang diorkestrasi Coordinate Resolver di Node**, dan **pemisahan tanggung jawab yang tegas** antar runtime.

Pembagian runtime (dari desain):

- **Express.js (Node)** = backend utama + pemilik logika keputusan murni: REST API, unggah media (multer), CRUD Zona Terlarang, **pembacaan GPS EXIF foto (exifr)**, **Coordinate Resolver (orkestrasi fallback koordinat berjenjang, EXIF-first untuk foto / OCR-first untuk video)**, **Region Validator (validasi kewajaran koordinat untuk SEMUA sumber)**, orkestrasi job + pelacakan progres, pengambilan laporan, riwayat, penyajian frontend, serta **seluruh logika murni** (filter confidence, parsing/round-trip koordinat, interpolasi, point-in-polygon + validasi poligon via turf.js, pembentukan & penggabungan pelanggaran, pemformatan waktu, ringkasan laporan, data marker peta). Persistensi SQLite via `better-sqlite3`. PDF via Puppeteer, frame beranotasi digambar di Node (`canvas`/`sharp`). Frontend Leaflet + leaflet-draw termasuk **Pemilih Koordinat Peta OSM**.
- **Mesin Analisis Python** = microservice lokal (FastAPI/Flask di `localhost`, model dimuat sekali) yang **hanya** menangani: penyamplan frame (OpenCV), deteksi YOLO (Ultralytics, proxy + fine-tune), dan pembacaan overlay EasyOCR. Mesin ini **zone-agnostic dan koordinat-agnostic**: mengembalikan deteksi (bbox + confidence) dan **koordinat OCR mentah**. Node yang menentukan urutan fallback, sumber koordinat final (`coordinate_source`), dan Titik Deteksi. Mengekspos `POST /analyze` dan `GET /jobs/{id}`.

Urutan pembangunan: **logika inti murni di Node** (parse koordinat, validasi region semua sumber, validasi poligon + point-in-polygon turf.js, filter confidence, **ekstraksi GPS EXIF**, **Coordinate Resolver (urutan berjenjang)**, interpolasi, pembentukan/penggabungan pelanggaran, pemformatan waktu, validasi unggah, round-trip persistensi) dibangun & diuji-properti **lebih dulu**. Kemudian **mesin Python** (sampling, YOLO, OCR koordinat mentah) dibangun & diekspos sebagai microservice lokal, lalu **diintegrasikan dengan orkestrator Node**. **Jalur foto batch (jalur demo wajib) diprioritaskan sebelum video.** Deteksi realtime **di luar cakupan**.

### Struktur Dua Sub-Proyek

- `node-app/` — aplikasi Express (npm): `express`, `multer`, `better-sqlite3`, `@turf/*`, `puppeteer`, `canvas`/`sharp`, **`exifr`**, dan test runner `vitest` + `fast-check`. Menyajikan frontend Leaflet + leaflet-draw (termasuk Pemilih Koordinat Peta OSM).
- `python-engine/` — microservice Python: `ultralytics`, `easyocr`, `opencv-python`, `fastapi`/`flask` + `uvicorn`, serta `pytest` + `hypothesis`.

### Konvensi Property-Based Test

- **Node (`fast-check`)**: `fc.assert(fc.property(...), { numRuns: 100 })` (minimum 100 iterasi). Tag komentar:
  `// Feature: pkl-detection-report, Property {number}: {property_text}`
- **Python (`hypothesis`)**: `@settings(max_examples=100)` (minimum 100 iterasi). Tag komentar:
  `# Feature: pkl-detection-report, Property {number}: {property_text}`
- Setiap Property 1–23 dipetakan ke **tepat satu** property-based test, di runtime tempat logika yang diuji berada.
- Pemetaan runtime (sesuai Testing Strategy desain):
  - **Node/`fast-check`**: Property 1, 2, 3, 4, 5, 6, 7, 10, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, **23**.
  - **Python/`hypothesis`**: Property 8 (skip frame OCR gagal), Property 9 (penyamplan video), Property 11 (mode detektor tidak mengubah keluaran normalisasi).

## Tasks

- [ ] 1. Siapkan dua sub-proyek (Node/Express + Python engine) dan struktur data domain Node
  - [ ] 1.1 Inisialisasi proyek Node/Express dan toolchain
    - Buat `node-app/` dengan `package.json`; pasang `express`, `multer`, `better-sqlite3`, `@turf/boolean-point-in-polygon`, `@turf/boolean-valid`, `@turf/line-intersect`, `@turf/helpers`, `@turf/distance`, `puppeteer`, `sharp` (atau `canvas`), **`exifr`**, dev-deps `vitest` + `fast-check`
    - Buat struktur direktori `node-app/src/{core,db,api,services,frontend}`, `node-app/tests/`, dan folder `storage/media`, `storage/frames`, `storage/pdf`
    - Definisikan struktur data domain Node (TypeScript type/JS JSDoc): `LatLon`, `BoundingBox`, `Detection`, `OcrResult`, **`ExifResult{ latlon?, present }`**, **`ResolvedCoordinate{ latlon?, coordinate_source, valid }`**, `CoordinateSource = 'gps_exif' | 'ocr' | 'manual'`, `MatchResult`, `Violation` (**termasuk field `coordinate_source`**); definisikan objek konfigurasi (`detector_mode`, `confidence_threshold=0.5`, `region_bounds`, `video_sample_interval_sec=1.0`, `merge_gap_sec=1.0`, `interpolation_max_jump_meters`, `max_zones=20`, `min_zones=1`, `target_agency`, `python_engine_url`)
    - Siapkan skrip test `vitest --run`
    - _Requirements: 4.3, 4.4, 4.5, 5.5, 3.3, 2.5, 7.4_
  - [ ] 1.2 Inisialisasi mesin Python dan toolchain
    - Buat `python-engine/` dengan `requirements.txt`/`pyproject.toml`; pasang `ultralytics`, `easyocr`, `opencv-python`, `fastapi` + `uvicorn` (atau `flask`), dev-deps `pytest` + `hypothesis`
    - Buat struktur `python-engine/app/{sampler,detector,ocr}`, `python-engine/tests/`
    - Definisikan struktur data domain Python yang dipertukarkan sebagai JSON: `Detection{bbox,confidence,cls}`, `ProcessingUnit{image,timestamp?}`, `OcrResult{latlon?,raw_text,valid}` (koordinat OCR **mentah**, zone/coord-agnostic)
    - Siapkan kerangka `pytest` + `hypothesis` (`@settings(max_examples=100)`)
    - _Requirements: 4.1, 4.2, 3.4_

- [ ] 2. (Node) Implementasi parser & pemformat koordinat overlay (logika murni)
  - [ ] 2.1 Implementasi formatter dan parser koordinat overlay
    - Tulis `formatCoordinate(latlon) -> string` bergaya `6.160208°S, 106.755835°E`
    - Tulis `parseCoordinate(text) -> LatLon | null` toleran terhadap tanda derajat, arah N/S/E/W, spasi; konversi S/W menjadi negatif
    - _Requirements: 3.2, 3.4_
  - [ ]* 2.2 Property test round-trip parser koordinat (fast-check)
    - **Property 5: Parser koordinat overlay bersifat round-trip**
    - **Validates: Requirements 3.2, 3.4**
    - `// Feature: pkl-detection-report, Property 5: ...` — generate LatLon dalam rentang wajar (arah N/S/E/W), format lalu parse, bandingkan dalam toleransi presisi desimal, `{ numRuns: 100 }`

- [ ] 3. (Node) Implementasi GPS EXIF Extractor & validasi region semua sumber (logika murni)
  - [ ] 3.1 Implementasi GPS EXIF Extractor (exifr)
    - Tulis `readExifGps(photoPath) -> ExifResult{ latlon?, present }` menggunakan `exifr`; baca tag GPS (lintang/bujur + ref N/S/E/W), konversi ke desimal (S/W negatif)
    - GPS EXIF hilang/rusak → `present = false`; **tidak dijalankan untuk video** (GPS EXIF tak tersedia per-frame)
    - _Requirements: 3.1_
  - [ ]* 3.2 Integration test ekstraksi GPS EXIF (Node)
    - Verifikasi ekstraksi koordinat + flag `present` pada foto sampel (EXIF valid, tanpa EXIF, EXIF rusak); render/parsing pihak ketiga diuji via integration bukan PBT
    - _Requirements: 3.1_
  - [ ] 3.3 Implementasi Region Validator (validasi kewajaran koordinat semua sumber)
    - Tulis `validateRegion(latlon, regionBounds) -> boolean` (inklusif pada batas)
    - Berlaku untuk **semua** `coordinate_source` (gps_exif, ocr, manual); koordinat di luar region → tidak valid & **tidak pernah** dipakai Pencocokan Zona, terlepas dari sumbernya
    - _Requirements: 3.7_
  - [ ]* 3.4 Property test validasi kewajaran koordinat semua sumber (fast-check)
    - **Property 6: Validasi kewajaran koordinat sesuai region**
    - **Validates: Requirements 3.7**
    - `// Feature: pkl-detection-report, Property 6: ...` — generate koordinat dari sumber sembarang (gps_exif/ocr/manual) di dalam & di luar `region_bounds`; valid iff di dalam batas terlepas dari `coordinate_source`; koordinat tidak valid tak dipakai pencocokan

- [ ] 4. (Node) Implementasi Coordinate Resolver: fallback koordinat berjenjang (logika murni)
  - [ ] 4.1 Implementasi orkestrasi fallback berjenjang
    - Tulis `resolveCoordinate(unit, mediaType, exifResult?, ocrResult?, manualInput?) -> ResolvedCoordinate{ latlon?, coordinate_source, valid }`
    - **Foto (EXIF-first)**: bila GPS EXIF valid → pakai, `coordinate_source='gps_exif'`, dan **OCR TIDAK dipakai** (3.1); bila EXIF hilang/tidak valid → OCR mentah, `coordinate_source='ocr'` (3.2); bila keduanya gagal → tandai perlu Input Manual, `coordinate_source='manual'` (3.3)
    - **Video (OCR-first)**: OCR per frame → `coordinate_source='ocr'` (3.4); frame gagal ditandai untuk skip (3.5); Input Manual cadangan terakhir → `coordinate_source='manual'` (3.6); GPS EXIF **dilewati**
    - Serahkan koordinat terpilih ke Region Validator (task 3.3) sebelum Pencocokan Zona
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  - [ ]* 4.2 Property test GPS-EXIF-first untuk foto (fast-check)
    - **Property 23: GPS EXIF adalah sumber utama untuk foto dan mematikan OCR**
    - **Validates: Requirements 3.1**
    - `// Feature: pkl-detection-report, Property 23: ...` — untuk foto dengan status EXIF sembarang (ada+valid, ada+tidak valid, tidak ada) dan ketersediaan OCR sembarang: Resolver memilih `gps_exif` **iff** EXIF valid, dan pada kasus itu OCR tidak dijalankan; selain itu fallback OCR→manual sesuai urutan, `{ numRuns: 100 }`

- [ ] 5. (Node) Implementasi validasi & pembentukan poligon Zona Terlarang (turf.js, logika murni)
  - [ ] 5.1 Implementasi validasi poligon dan pembentukan zona
    - Tulis `validatePolygon(points) -> {valid, reason?}` menggunakan turf.js (`@turf/boolean-valid` + pengecekan perpotongan sisi via `@turf/line-intersect`); tolak jika < 3 titik atau self-intersecting
    - Tulis `buildZone(name, points) -> Zone` yang mempertahankan urutan simpul masukan sebagai poligon tertutup
    - _Requirements: 2.2, 2.3_
  - [ ]* 5.2 Property test poligon mempertahankan urutan titik (fast-check)
    - **Property 2: Poligon terbentuk mempertahankan titik berurutan**
    - **Validates: Requirements 2.2**
    - `// Feature: pkl-detection-report, Property 2: ...` — generate daftar >= 3 titik poligon sederhana; verifikasi urutan simpul identik masukan
  - [ ]* 5.3 Property test validasi poligon menolak yang tak sah (fast-check)
    - **Property 3: Validasi poligon menolak poligon tak sah**
    - **Validates: Requirements 2.3**
    - `// Feature: pkl-detection-report, Property 3: ...` — generate daftar titik valid, < 3 titik, dan self-intersecting; tidak-valid iff < 3 titik ATAU self-intersecting

- [ ] 6. (Node) Implementasi filter confidence deteksi (logika murni)
  - [ ] 6.1 Implementasi filter ambang confidence
    - Tulis `isValidDetection(detection, threshold=0.5) -> boolean` dengan ambang inklusif (`>= 0.5`)
    - Tulis `filterDetections(detections, threshold) -> Detection[]`
    - _Requirements: 4.3_
  - [ ]* 6.2 Property test ambang confidence inklusif (fast-check)
    - **Property 10: Ambang confidence inklusif**
    - **Validates: Requirements 4.3**
    - `// Feature: pkl-detection-report, Property 10: ...` — generate confidence pada [0,1] termasuk tepat 0.5; valid iff `>= 0.5`

- [ ] 7. (Node) Implementasi Zone Matcher point-in-polygon (turf.js, logika murni)
  - [ ] 7.1 Implementasi pencocokan Titik Deteksi terhadap zona
    - Tulis `match(point, zones) -> MatchResult{inside, zone_id?}` menggunakan `@turf/boolean-point-in-polygon`
    - Tulis `classifyDetection(detection, resolvedCoordinate, zones) -> location_status` yang menghasilkan `matched` / `no_violation` / `unknown_location`
    - Titik Deteksi berasal dari Coordinate Resolver (task 4) & sudah lolos Region Validator (task 3.3), apa pun `coordinate_source`-nya; deteksi valid + Titik Deteksi valid + di dalam zona → Pelanggaran; deteksi valid tanpa Titik Deteksi valid → `unknown_location`
    - _Requirements: 5.1, 5.2, 5.3_
  - [ ]* 7.2 Property test penentuan pelanggaran point-in-polygon (fast-check)
    - **Property 13: Penentuan pelanggaran sesuai point-in-polygon**
    - **Validates: Requirements 5.1, 5.2**
    - `// Feature: pkl-detection-report, Property 13: ...` — bandingkan hasil turf.js terhadap oracle ray-casting independen; Pelanggaran iff titik di dalam poligon, `zone_id` = zona pemuat
  - [ ]* 7.3 Property test deteksi tanpa lokasi valid bukan pelanggaran (fast-check)
    - **Property 14: Deteksi tanpa lokasi valid bukan pelanggaran**
    - **Validates: Requirements 5.3**
    - `// Feature: pkl-detection-report, Property 14: ...` — deteksi valid tanpa Titik Deteksi valid selalu `unknown_location`, tak pernah dihitung Pelanggaran

- [ ] 8. (Node) Implementasi pembentukan & kelengkapan data Pelanggaran (logika murni)
  - [ ] 8.1 Implementasi pembentukan record Pelanggaran
    - Tulis `buildViolation(detection, resolvedCoordinate, zone_id, timestamp?) -> Violation` yang menyimpan koordinat, `zone_id`, `confidence`, `bbox`, **`coordinate_source`**, dan (video) `frame_timestamp`
    - Foto: `start_time = end_time = null`
    - _Requirements: 5.4_
  - [ ]* 8.2 Property test kelengkapan data pelanggaran (fast-check)
    - **Property 15: Kelengkapan data pelanggaran**
    - **Validates: Requirements 5.4**
    - `// Feature: pkl-detection-report, Property 15: ...` — setiap Pelanggaran memuat koordinat, zone_id, confidence, bbox, coordinate_source; pelanggaran video juga memuat timestamp frame

- [ ] 9. Checkpoint - Pastikan seluruh test logika inti Node lulus
  - Pastikan semua test lulus, tanyakan pengguna bila muncul pertanyaan.

- [ ] 10. (Node) Implementasi pemformatan waktu HH:MM:SS (logika murni)
  - [ ] 10.1 Implementasi pemformat & parser waktu HH:MM:SS
    - Tulis `formatSecondsToHms(sec) -> string` dan `parseHmsToSeconds(str) -> number`
    - _Requirements: 7.2_
  - [ ]* 10.2 Property test pemformatan waktu round-trip (fast-check)
    - **Property 19: Pemformatan waktu video bersifat round-trip**
    - **Validates: Requirements 7.2**
    - `// Feature: pkl-detection-report, Property 19: ...` — untuk detik bulat tak negatif, format ke HH:MM:SS lalu parse balik = detik semula

- [ ] 11. (Node) Implementasi interpolasi koordinat OCR antar-frame video (logika murni)
  - [ ] 11.1 Implementasi interpolasi koordinat antar-frame yang wajar
    - Tulis `interpolateCoordinate(prev, next, gap)` yang mengembalikan titik antara HANYA JIKA pergerakan `<= interpolation_max_jump_meters` (via `@turf/distance`); jika tidak wajar → skip (tetap tanpa Titik Deteksi valid). Hasil interpolasi ber-`coordinate_source = ocr`
    - Tulis logika penggabungan hasil OCR per-frame (dari respons Python) yang melewati frame gagal tanpa membatalkan frame lain
    - _Requirements: 3.11, 3.5_
  - [ ]* 11.2 Property test interpolasi hanya untuk pergerakan wajar (fast-check)
    - **Property 7: Interpolasi hanya untuk pergerakan wajar**
    - **Validates: Requirements 3.11**
    - `// Feature: pkl-detection-report, Property 7: ...` — jika pergerakan wajar, titik interpolasi berada di antara dua titik dan valid; jika melebihi batas, frame di-skip

- [ ] 12. (Node) Implementasi Violation Aggregator penggabungan pelanggaran video (logika murni)
  - [ ] 12.1 Implementasi penggabungan pelanggaran beruntun
    - Tulis `mergeViolations(perFrameViolations, mergeGapSec=1.0) -> Violation[]` yang menggabungkan frame berurutan pada zona sama berjarak `<= 1.0` detik menjadi satu Pelanggaran dengan `start_time`/`end_time`
    - Foto: setiap pelanggaran berdiri sendiri
    - _Requirements: 5.5_
  - [ ]* 12.2 Property test penggabungan pelanggaran video (fast-check)
    - **Property 16: Penggabungan pelanggaran video benar**
    - **Validates: Requirements 5.5**
    - `// Feature: pkl-detection-report, Property 16: ...` — generate deret (timestamp, zone_id); klaster maksimal berisi frame berurutan zona sama gap `<= 1.0`s; `start_time <= end_time`

- [ ] 13. (Node) Implementasi validasi unggah Media (logika murni)
  - [ ] 13.1 Implementasi validasi format/ukuran/isi berkas
    - Tulis `validateUpload(fileMeta, bytes) -> UploadResult{ok, error_code?, media_file?}`
    - Validasi berurutan: berkas tidak kosong/terbaca (1.5), format JPG/PNG/MP4 via ekstensi + magic bytes (1.3), ukuran (foto 1KB–20MB, video 1MB–200MB) (1.4)
    - _Requirements: 1.3, 1.4, 1.5_
  - [ ]* 13.2 Property test validasi unggah menolak format & ukuran tak sah (fast-check)
    - **Property 1: Validasi unggah menolak format dan ukuran tak sah**
    - **Validates: Requirements 1.3, 1.4, 1.5**
    - `// Feature: pkl-detection-report, Property 1: ...` — generate format & ukuran sembarang; diterima iff format sah DAN ukuran dalam rentang DAN tidak kosong; jika ditolak, tak disimpan

- [ ] 14. Checkpoint - Pastikan seluruh logika keputusan murni Node lulus
  - Pastikan semua test lulus, tanyakan pengguna bila muncul pertanyaan.

- [ ] 15. (Node) Implementasi lapisan persistensi (better-sqlite3 + SQLite)
  - [ ] 15.1 Definisikan skema SQLite dan repository zona
    - Buat skema tabel (`ZONE`, `MEDIA_FILE`, `ANALYSIS`, `VIOLATION` (**termasuk kolom `coordinate_source`**), `ANNOTATED_FRAME`, `REPORT`) via `better-sqlite3`; kolom JSON (`points_latlon`, `bbox`) di-serialize/parse di Node
    - Implementasi repository zona: create/read/update/delete + enforce batas min 1 / maks 20 zona
    - _Requirements: 2.4, 2.5, 2.7_
  - [ ]* 15.2 Property test penyimpanan zona round-trip (fast-check)
    - **Property 4: Penyimpanan zona bersifat round-trip**
    - **Validates: Requirements 2.4**
    - `// Feature: pkl-detection-report, Property 4: ...` — simpan zona valid lalu muat; nama & koordinat identik dan berurutan sama
  - [ ] 15.3 Implementasi repository riwayat & pengurutan
    - Simpan `Report` + metadata (nama Media <=255 char, jenis, waktu presisi detik) saat analisis selesai; kegagalan simpan → tahan entri + pesan (8.2)
    - Implementasi listing riwayat terurut terbaru → terlama
    - _Requirements: 8.1, 8.2, 8.3_
  - [ ]* 15.4 Property test penyimpanan riwayat round-trip (fast-check)
    - **Property 21: Penyimpanan riwayat bersifat round-trip**
    - **Validates: Requirements 8.1**
    - `// Feature: pkl-detection-report, Property 21: ...` — simpan Report + metadata valid lalu muat; data setara aslinya
  - [ ]* 15.5 Property test riwayat terurut terbaru ke terlama (fast-check)
    - **Property 22: Riwayat terurut terbaru ke terlama**
    - **Validates: Requirements 8.3**
    - `// Feature: pkl-detection-report, Property 22: ...` — untuk waktu analisis sembarang, daftar tampil non-increasing dan permutasi seluruh entri tersimpan

- [ ] 16. (Python) Implementasi Frame Sampler mesin analisis (OpenCV)
  - [ ] 16.1 Implementasi penyamplan Media menjadi ProcessingUnit
    - Foto: 1 `ProcessingUnit` dengan `timestamp = null`
    - Video (OpenCV): 1 frame per detik dari detik ke-0; unit ke-`k` ber-`timestamp = k`
    - Lempar galat `media_unreadable` bila media rusak/tak terbaca (agar orkestrator Node menghentikan tanpa hasil parsial)
    - _Requirements: 4.2, 4.7_
  - [ ]* 16.2 Property test penyamplan video deterministik (hypothesis)
    - **Property 9: Penyamplan video deterministik**
    - **Validates: Requirements 4.2**
    - `# Feature: pkl-detection-report, Property 9: ...` — jumlah frame = `floor(D)+1`; timestamp `0..floor(D)` naik monoton berjenjang 1 detik, `@settings(max_examples=100)`

- [ ] 17. (Python) Implementasi Detektor YOLO (proxy & fine-tune) di belakang antarmuka tunggal
  - [ ] 17.1 Implementasi antarmuka detektor dan faktori mode
    - Tulis antarmuka `detect(image) -> List[Detection]`
    - Implementasi `ProxyDetector` (YOLO pretrained COCO, filter kelas `person`) dan `FineTuneDetector` (model PKL), keduanya kembalikan `List[Detection]` seragam (bbox + confidence, zone-agnostic)
    - Tulis faktori `build_detector(mode)` (`proxy`/`fine-tune`)
    - _Requirements: 4.1, 4.4, 4.5_
  - [ ]* 17.2 Property test mode detektor tidak mengubah normalisasi keluaran (hypothesis)
    - **Property 11: Mode detektor tidak mengubah alur hilir**
    - **Validates: Requirements 4.5**
    - `# Feature: pkl-detection-report, Property 11: ...` — dengan keluaran deteksi mentah identik ter-mock, normalisasi/serialisasi keluaran detektor sama terlepas dari mode (mode hanya memengaruhi sumber deteksi)
  - [ ]* 17.3 Integration test struktur keluaran detektor (Python)
    - Verifikasi bentuk keluaran detektor pada gambar sampel (proxy & fine-tune)
    - _Requirements: 4.1, 4.4_

- [ ] 18. (Python) Implementasi OCR Overlay Engine (EasyOCR) — koordinat mentah, koordinat-agnostic
  - [ ] 18.1 Implementasi pembacaan overlay menjadi koordinat mentah
    - Tulis `read_coordinates(image) -> OcrResult{latlon?, raw_text, valid}` dengan praproses (crop area overlay heuristik + fallback full-image, grayscale, threshold), lalu parsing teks menjadi lintang/bujur (konversi S/W negatif). Mesin Python hanya mengembalikan koordinat **mentah**; penentuan pemakaian/sumber & validasi region dilakukan Node (Coordinate Resolver + Region Validator)
    - OCR adalah sumber **UTAMA untuk video** dan **CADANGAN untuk foto**; frame video gagal OCR ditandai gagal agar orkestrator Node dapat melewatinya
    - _Requirements: 3.2, 3.4, 3.5_
  - [ ]* 18.2 Property test frame OCR gagal dilewati tanpa menggagalkan analisis (hypothesis)
    - **Property 8: Frame OCR gagal dilewati tanpa menggagalkan analisis**
    - **Validates: Requirements 3.5**
    - `# Feature: pkl-detection-report, Property 8: ...` — untuk deret frame dengan sebagian gagal OCR, keluaran per-frame hanya bergantung pada frame yang berhasil; frame gagal ditandai skip tanpa mengubah/membatalkan frame lain

- [ ] 19. (Python) Ekspos mesin analisis sebagai microservice lokal (FastAPI/Flask)
  - [ ] 19.1 Implementasi endpoint microservice + pemuatan model sekali
    - Muat model YOLO/EasyOCR **sekali** saat start; jalankan di `127.0.0.1`
    - `POST /analyze { media_path, config }` → jalankan Sampler → Detektor → OCR per unit, kembalikan daftar deteksi (bbox + confidence) + hasil OCR (koordinat **mentah**) per unit; media rusak → galat `media_unreadable`
    - `GET /jobs/{id}` → progres integer 0–100 (non-menurun) dan status job
    - _Requirements: 4.1, 4.2, 4.6, 4.7_
  - [ ]* 19.2 Unit test kontrak microservice & galat media (Python)
    - Test bentuk respons `POST /analyze` (foto & video) dan galat `media_unreadable` pada media rusak (4.7)
    - _Requirements: 4.1, 4.7_

- [ ] 20. Checkpoint - Pastikan mesin Python & logika Node siap diintegrasikan
  - Pastikan semua test lulus, tanyakan pengguna bila muncul pertanyaan.

- [ ] 21. (Node) Implementasi Orkestrator Analisis, klien Python & pelacak progres (jalur foto lebih dulu)
  - [ ] 21.1 Implementasi klien HTTP ke mesin Python & orkestrator jalur foto (jalur demo wajib)
    - Tulis klien HTTP Node → `POST /analyze` + poll `GET /jobs/{id}`; tangani worker tak tersedia/timeout sebagai kegagalan job tanpa hasil parsial (4.7)
    - Rangkai (foto, EXIF-first): baca GPS EXIF (task 3.1) → panggil Python untuk deteksi + OCR mentah → **Coordinate Resolver** (task 4) tentukan Titik Deteksi + `coordinate_source` → **Region Validator** (task 3.3) → filter confidence (task 6) → Zone Matcher (task 7) → pembentukan Pelanggaran (task 8)
    - Terapkan atomicity: tulis ke DB/FS hanya setelah pipeline sukses; tolak analisis tanpa zona (2.6)
    - _Requirements: 3.1, 3.2, 5.1, 5.2, 5.3, 5.4, 2.6, 4.7_
  - [ ] 21.2 Perluas orkestrator ke video + pelacak progres
    - Proses deret unit video (dari Python) melalui pipeline identik dengan **Coordinate Resolver OCR-first** (task 4), integrasikan interpolasi/skip OCR (task 11) lalu Violation Aggregator (task 12)
    - Implementasi `GET /api/analysis/{id}/progress`: progres integer 0–100 monoton non-menurun, diperbarui minimal tiap 1 detik (dipetakan dari progres Python)
    - _Requirements: 3.4, 3.5, 3.6, 4.2, 4.6, 5.5_
  - [ ]* 21.3 Property test progres analisis monoton dan terbatas (fast-check)
    - **Property 12: Progres analisis monoton dan terbatas**
    - **Validates: Requirements 4.6**
    - `// Feature: pkl-detection-report, Property 12: ...` — setiap nilai progres integer 0..100 dan tak pernah menurun dibanding sebelumnya
  - [ ]* 21.4 Unit test kegagalan worker Python & analisis tanpa zona (Node)
    - Test worker tak tersedia/timeout & galat `media_unreadable` menghentikan analisis tanpa hasil parsial (4.7)
    - Test analisis ditolak bila tidak ada zona tersimpan (2.6)
    - _Requirements: 4.7, 2.6_

- [ ] 22. (Node) Implementasi Generator ringkasan Laporan & data Dashboard Peta (logika murni)
  - [ ] 22.1 Implementasi agregasi ringkasan & data marker peta
    - Tulis penyusun ringkasan Laporan: total Pelanggaran (>= 0, integer), cakupan (jumlah foto atau durasi video detik); nol pelanggaran → nyatakan eksplisit total = 0 (7.1, 7.7)
    - Tulis pembentuk data marker Dashboard Peta yang hanya berisi Pelanggaran ber-Titik Deteksi valid pada koordinatnya (6.1); sertakan poligon zona (6.2)
    - _Requirements: 7.1, 7.7, 6.1, 6.2_
  - [ ]* 22.2 Property test konsistensi ringkasan laporan (fast-check)
    - **Property 18: Konsistensi ringkasan laporan**
    - **Validates: Requirements 7.1, 7.7**
    - `// Feature: pkl-detection-report, Property 18: ...` — total ringkasan = jumlah Pelanggaran tercatat, integer >= 0; nol pelanggaran → total 0 & pernyataan eksplisit
  - [ ]* 22.3 Property test marker peta hanya untuk pelanggaran berlokasi valid (fast-check)
    - **Property 17: Marker peta hanya untuk pelanggaran berlokasi valid**
    - **Validates: Requirements 6.1**
    - `// Feature: pkl-detection-report, Property 17: ...` — data marker = tepat Pelanggaran ber-Titik Deteksi valid, tiap-tiap pada koordinat geografisnya

- [ ] 23. (Node) Implementasi Frame Beranotasi & generasi PDF (Puppeteer)
  - [ ] 23.1 Implementasi render Frame Beranotasi per pelanggaran
    - Tulis fungsi menggambar Bounding Box PKL pada frame/foto (dari bbox yang dikembalikan Python) via `canvas`/`sharp` dan menyimpannya ke `storage/frames`; jamin minimal satu Frame Beranotasi per Pelanggaran
    - _Requirements: 7.3_
  - [ ]* 23.2 Property test setiap pelanggaran punya bukti visual (fast-check)
    - **Property 20: Setiap pelanggaran memiliki bukti visual**
    - **Validates: Requirements 7.3**
    - `// Feature: pkl-detection-report, Property 20: ...` — setiap Pelanggaran pada Laporan punya >= 1 Frame Beranotasi ber-bbox PKL terkait
  - [ ] 23.3 Implementasi laporan HTML & generasi PDF via Puppeteer
    - Render laporan HTML (ringkasan, daftar pelanggaran + koordinat/alamat/waktu/zone_id, waktu video HH:MM:SS, instansi tujuan Satpol PP/Dishub, Frame Beranotasi) lalu ekspor PDF dengan Puppeteer
    - Kegagalan PDF → pesan kegagalan unduh, laporan web tetap utuh
    - _Requirements: 7.2, 7.3, 7.4, 7.8_
  - [ ]* 23.4 Integration test generasi PDF (Node)
    - Verifikasi berkas PDF valid dihasilkan Puppeteer; simulasikan kegagalan PDF (7.8)
    - _Requirements: 7.6, 7.8_

- [ ] 24. Checkpoint - Pastikan pipeline analisis end-to-end (Node + mock Python) lulus
  - Pastikan semua test lulus, tanyakan pengguna bila muncul pertanyaan.

- [ ] 25. (Node) Implementasi REST API Express untuk seluruh endpoint
  - [ ] 25.1 Implementasi endpoint Media (multer) & Zona
    - `POST /api/media` (multipart via multer, panggil `validateUpload`, simpan ke `storage/media`)
    - `GET/POST/PUT/DELETE /api/zones` (panggil validasi turf.js & repository zona)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.4, 2.5, 2.7_
  - [ ] 25.2 Implementasi endpoint Analisis, Koordinat Manual, Progres, Laporan, Riwayat
    - `POST /api/analysis` (validasi minimal 1 zona), `GET /api/analysis/{id}/progress`, **`POST /api/analysis/{id}/manual-coordinate`** (koreksi Titik Deteksi via Input Manual/map-picker → Coordinate Resolver `coordinate_source='manual'` → Region Validator), `GET /api/reports/{id}`, `GET /api/reports/{id}/pdf`
    - `GET /api/history` (terurut) & `GET /api/history/{id}`; laporan tak ditemukan → pesan + daftar dipertahankan (8.6)
    - _Requirements: 4.6, 2.6, 3.3, 3.6, 3.7, 7.5, 7.6, 8.3, 8.5, 8.6_
  - [ ]* 25.3 Integration test endpoint API jalur foto (Node)
    - Test alur end-to-end unggah foto → buat zona → analisis → ambil laporan dengan mesin Python ter-mock (mock HTTP); termasuk skenario worker tak tersedia & jalur EXIF-first vs OCR-fallback
    - _Requirements: 1.1, 2.6, 3.1, 3.2, 7.5, 4.7_

- [ ] 26. (Node) Implementasi Frontend (Leaflet + leaflet-draw + Pemilih Koordinat Peta, disajikan Express)
  - [ ] 26.1 Implementasi halaman unggah Media & editor Zona
    - Halaman unggah dengan indikator progres 0–100% dan penanganan kegagalan jaringan + opsi unggah ulang (1.6, 1.7)
    - Editor zona: peta OSM Leaflet dapat digeser/zoom, gambar poligon dengan leaflet-draw, simpan/hapus/ubah zona (2.1, 2.7)
    - _Requirements: 1.6, 1.7, 2.1, 2.7_
  - [ ] 26.2 Implementasi Input Manual + Pemilih Koordinat Peta OSM
    - Kolom Input Manual untuk mengetik koordinat lintang/bujur langsung (3.10)
    - Pemilih Koordinat Peta: peta OSM Leaflet interaktif; klik titik → tampilkan koordinat lintang/bujur (3.8, 3.9) → aksi pilih/salin mengisi kolom Input Manual; kirim ke `POST /api/analysis/{id}/manual-coordinate` (divalidasi region seperti sumber lain, `coordinate_source='manual'`)
    - Sediakan alur Input Manual saat EXIF+OCR gagal (foto, 3.3) dan sebagai cadangan terakhir video (3.6)
    - _Requirements: 3.3, 3.6, 3.8, 3.9, 3.10_
  - [ ] 26.3 Implementasi Dashboard Peta, tampilan Laporan & Riwayat
    - Dashboard: pin pelanggaran + poligon zona pada peta yang sama; klik pin → detail; empty-state bila tak ada pelanggaran berlokasi (6.1–6.4)
    - Tampilan Laporan di web + tombol unduh PDF; empty-state riwayat; pilih entri → tampil laporan (6.3, 7.5, 7.6, 8.4, 8.5)
    - _Requirements: 6.2, 6.3, 6.4, 7.5, 7.6, 8.4, 8.5_

- [ ] 27. Wiring akhir & smoke test integrasi hybrid
  - [ ] 27.1 Rangkai seluruh komponen lintas-runtime & konfigurasi
    - Hubungkan Express API ↔ Orkestrator ↔ Coordinate Resolver ↔ klien HTTP ↔ mesin Python ↔ Store; muat konfigurasi (`detector_mode`, `region_bounds`, `interpolation_max_jump_meters`, `python_engine_url`, dsb.); pastikan mode detektor dapat ditukar tanpa mengubah alur lain
    - _Requirements: 4.4, 4.5_
  - [ ]* 27.2 Smoke test jalur foto batch (jalur demo wajib) & timing
    - Smoke test alur foto lengkap unggah→analisis→laporan→dashboard dengan mesin Python lokal aktif; verifikasi tampil laporan <=5s (7.5) dan ambil riwayat <=3s (8.5) dengan 1–3 contoh representatif
    - _Requirements: 7.5, 8.5_

- [ ] 28. Checkpoint akhir - Pastikan seluruh test lulus
  - Pastikan semua test lulus, tanyakan pengguna bila muncul pertanyaan.

## Notes

- Arsitektur **hybrid**: logika keputusan murni + API + persistensi + PDF + **GPS EXIF (exifr)** + **Coordinate Resolver** + **Region Validator** di **Node/Express** (`fast-check`); CV/OCR/sampling di **microservice Python** (`hypothesis`).
- **Perolehan koordinat berjenjang**: foto = EXIF-first (EXIF valid mematikan OCR) → OCR → Manual; video = OCR-first (skip + interpolasi wajar) → Manual. Validasi region berlaku SERAGAM untuk semua `coordinate_source` (gps_exif/ocr/manual).
- Mesin Python bersifat **zone-agnostic & koordinat-agnostic**: hanya mengembalikan deteksi + koordinat OCR mentah; Node menentukan urutan fallback, `coordinate_source`, dan Titik Deteksi.
- Tugas berpostfix `*` bersifat opsional (test) dan dapat dilewati untuk MVP lebih cepat; tugas inti tidak pernah ditandai opsional.
- Setiap tugas mereferensikan sub-persyaratan spesifik untuk keterlacakan.
- Property 1–23 masing-masing dipetakan ke tepat satu property-based test (min. 100 iterasi): Node/`fast-check` untuk P1–P7, P10, P12–P23; Python/`hypothesis` untuk P8, P9, P11.
- **Property 23** (GPS-EXIF-first) adalah test Node/`fast-check` pada Coordinate Resolver, memvalidasi Requirement 3.1.
- Logika inti murni Node dibangun & diuji-properti dahulu; mesin Python dibangun & diekspos sebagai microservice, lalu diintegrasikan dengan orkestrator Node.
- Jalur foto batch (jalur demo wajib) diprioritaskan sebelum video; deteksi realtime di luar cakupan.
- Kriteria UI/timing/eksternal (2.1, 6.2–6.4, 1.6, 7.5, 7.6, 8.4, 8.5, 4.1, 3.1-ekstraksi EXIF, 3.8/3.9/3.10 map-picker) diuji via unit/integration/smoke/interaction test, bukan PBT — sesuai Testing Strategy desain.
- Batas integrasi Node ↔ Python diuji lewat integration test (mock HTTP + worker lokal), termasuk skenario worker tak tersedia/timeout.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "3.1", "3.3", "5.1", "6.1", "10.1", "13.1", "16.1", "17.1", "18.1"] },
    { "id": 2, "tasks": ["2.2", "3.2", "3.4", "4.1", "5.2", "5.3", "6.2", "10.2", "13.2", "16.2", "17.2", "17.3", "18.2"] },
    { "id": 3, "tasks": ["4.2", "7.1", "8.1", "11.1", "12.1", "15.1", "19.1"] },
    { "id": 4, "tasks": ["7.2", "7.3", "8.2", "11.2", "12.2", "15.2", "15.3", "19.2"] },
    { "id": 5, "tasks": ["15.4", "15.5", "21.1"] },
    { "id": 6, "tasks": ["21.2", "22.1", "23.1"] },
    { "id": 7, "tasks": ["21.3", "21.4", "22.2", "22.3", "23.2", "23.3"] },
    { "id": 8, "tasks": ["23.4", "25.1"] },
    { "id": 9, "tasks": ["25.2", "26.1", "26.2"] },
    { "id": 10, "tasks": ["25.3", "26.3"] },
    { "id": 11, "tasks": ["27.1"] },
    { "id": 12, "tasks": ["27.2"] }
  ]
}
```
