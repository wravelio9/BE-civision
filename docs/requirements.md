# Requirements Document

## Introduction

Sistem pemantauan ketertiban ruang publik berbasis zona untuk mendeteksi Pedagang Kaki Lima (PKL) dan menentukan apakah mereka berjualan di lokasi yang seharusnya atau tidak. Fokus produk bukan sekadar mendeteksi keberadaan PKL, melainkan mengubah deteksi mentah menjadi laporan pelanggaran yang tervalidasi lokasi dan siap ditindaklanjuti oleh instansi berwenang (Satpol PP/Dishub).

Alur inti: Pengguna mengunggah foto atau video hasil pemantauan lapangan. Sistem memperoleh koordinat lokasi menggunakan strategi berjenjang (tiered fallback) sesuai jenis Media — untuk foto, metadata GPS EXIF menjadi sumber utama, dengan OCR pada overlay koordinat sebagai cadangan bila GPS EXIF tidak tersedia/tidak valid, dan input manual sebagai cadangan terakhir; untuk video, GPS EXIF tidak tersedia per-frame sehingga OCR pada overlay tiap frame menjadi sumber utama, dengan input manual sebagai cadangan terakhir. Selanjutnya sistem mendeteksi PKL menggunakan computer vision (YOLO), mencocokkan koordinat dengan Zona Terlarang geografis yang telah ditentukan di peta, lalu menghasilkan laporan pelanggaran beserta bukti visual dan lokasi.

Proyek ini merupakan proyek lomba software development bertema smart city dengan batasan waktu 4 minggu (deadline 19 Oktober), menuju submit proposal dan demo produk 75%. Scope dijaga tetap realistis:

- **Pemrosesan batch** (bukan realtime streaming) untuk demo. Deteksi realtime dari kamera kendaraan diperlakukan sebagai visi/roadmap dan **stretch goal bersyarat** — baru dikerjakan bila di akhir minggu ke-2 seluruh alur batch (deteksi + peta + laporan + dashboard) sudah berfungsi dan teruji.
- **Foto** menjadi jalur input yang paling matang dan wajib berfungsi untuk demo (1 foto = 1 koordinat). **Video** didukung dengan menyampel frame per detik, di mana tiap frame diperlakukan seperti foto.
- **Zona Terlarang** ditentukan sebagai poligon geografis pada peta kota (bukan poligon pada piksel frame).
- **Deteksi hybrid**: Lapis 1 (proxy) menggunakan YOLO pretrained untuk mendeteksi orang yang menetap di dalam zona sebagai kandidat PKL guna menjamin demo berjalan; Lapis 2 (fine-tune) melatih YOLO dengan dataset PKL yang dikumpulkan sendiri untuk akurasi lebih tinggi.

### Catatan Operasional (non-fungsional, untuk tim)

- Data lapangan (foto/video) TIDAK boleh ditransfer melalui WhatsApp atau kanal yang mengompres media dan menghapus metadata. Gunakan Google Drive, kabel USB, atau kirim "sebagai dokumen/file". Kompresi WhatsApp terbukti menghapus metadata (termasuk GPS EXIF) dan menurunkan kualitas gambar yang dibutuhkan OCR dan deteksi.
- Metadata GPS (EXIF) kini menjadi sumber koordinat UTAMA untuk FOTO. Oleh karena itu pengumpulan data lapangan wajib menjaga keutuhan EXIF: jangan mengirim melalui WhatsApp atau kanal yang mengompres/menghapus metadata; transfer sebagai berkas/dokumen (Google Drive, kabel USB, "sebagai dokumen/file") agar GPS EXIF tetap tersedia.
- OCR pada overlay koordinat menjadi sumber koordinat UTAMA untuk VIDEO (karena GPS EXIF tidak tersedia per-frame) sekaligus sumber CADANGAN untuk foto apabila GPS EXIF hilang/tidak valid. Input manual oleh Operator menjadi cadangan TERAKHIR untuk kedua jenis Media.

## Glossary

- **Sistem**: Aplikasi web pemantauan ketertiban ruang publik secara keseluruhan, mencakup antarmuka web, layanan deteksi, layanan OCR, pencocokan zona, dan generator laporan.
- **Pengguna / Operator**: Petugas yang mengunggah foto/video pemantauan, menentukan Zona Terlarang, dan meninjau hasil deteksi.
- **PKL (Pedagang Kaki Lima)**: Objek/orang yang teridentifikasi sebagai pedagang kaki lima dalam media, diwakili oleh Bounding Box hasil deteksi.
- **Media**: Berkas masukan berupa foto (gambar tunggal) atau video yang diunggah Pengguna untuk dianalisis.
- **Overlay Koordinat**: Teks lokasi yang "dibakar" (burned-in) ke dalam gambar oleh aplikasi perekam, memuat koordinat geografis (contoh: `6.160208°S, 106.755835°E`), tanggal/waktu, dan alamat.
- **OCR (Optical Character Recognition)**: Komponen yang membaca Overlay Koordinat pada gambar dan mengubahnya menjadi koordinat numerik (lintang/bujur). Menjadi sumber koordinat utama untuk video dan sumber cadangan untuk foto.
- **GPS EXIF**: Metadata koordinat geografis (lintang/bujur) yang tersimpan dalam header EXIF sebuah berkas foto. Menjadi sumber koordinat utama untuk foto bila tersedia dan valid. Tidak tersedia per-frame pada video sehingga tidak digunakan untuk video.
- **Input Manual**: Mekanisme bagi Operator untuk memasukkan atau mengoreksi koordinat secara langsung, sebagai sumber koordinat cadangan terakhir. Mencakup pengetikan teks koordinat maupun pemilihan titik melalui Pemilih Koordinat Peta.
- **Pemilih Koordinat Peta**: Peta interaktif berbasis OpenStreetMap yang memungkinkan Operator mengklik sebuah titik untuk melihat koordinatnya lalu memilih/menyalin koordinat tersebut guna mengisi kolom Input Manual.
- **Detektor**: Komponen computer vision (YOLO) yang menganalisis gambar untuk menemukan PKL.
- **Deteksi Hybrid**: Strategi deteksi dua lapis — Lapis 1 proxy (YOLO pretrained + aturan menetap di dalam zona) dan Lapis 2 fine-tune (YOLO dilatih dengan dataset PKL sendiri).
- **Zona Terlarang**: Poligon geografis pada peta kota yang ditandai Pengguna sebagai area yang tidak boleh ditempati PKL. Didefinisikan dengan koordinat lintang/bujur, bukan piksel.
- **Titik Deteksi**: Koordinat geografis (lintang/bujur) yang dikaitkan dengan sebuah deteksi PKL. Dapat berasal dari GPS EXIF (foto), OCR pada gambar/frame terkait, atau Input Manual, sesuai strategi perolehan koordinat berjenjang.
- **Pencocokan Zona**: Proses geometri (point-in-polygon) yang menentukan apakah Titik Deteksi berada di dalam Zona Terlarang. Bersifat deterministik, bukan berbasis AI.
- **Pelanggaran**: Kejadian ketika PKL terdeteksi DAN Titik Deteksi-nya berada di dalam Zona Terlarang.
- **Status Validasi**: Keadaan verifikasi sebuah Pelanggaran oleh Operator, bernilai salah satu dari: `pending_review` (hasil deteksi, belum diverifikasi — status awal), `valid` (dikonfirmasi Operator sebagai pelanggaran nyata), atau `rejected` (ditandai Operator sebagai tidak valid/salah deteksi).
- **Soft-delete**: Mekanisme "membuang" Pelanggaran dengan cara menandainya berstatus `rejected` dan menyembunyikannya dari tampilan aktif (daftar dan Dashboard Peta), TANPA menghapus barisnya dari basis data, sehingga tetap dapat ditelusuri dan dijadikan bahan koreksi.
- **Status Tindak Lanjut**: Penanda pada Pelanggaran berstatus `valid` yang menyatakan apakah pelanggaran tersebut sudah ditindak oleh instansi, bernilai `belum` (default) atau `sudah`.
- **Analisis**: Proses batch yang membaca Media, menjalankan Detektor dan OCR, melakukan Pencocokan Zona, dan menentukan Pelanggaran.
- **Frame Disampel**: Frame video yang diambil pada interval 1 detik, mulai detik ke-0 hingga akhir video, sebagai unit pemrosesan untuk Media video.
- **Generator Laporan**: Komponen yang menyusun hasil Analisis menjadi Laporan.
- **Laporan**: Dokumen hasil deteksi berisi ringkasan, daftar Pelanggaran, bukti visual (Frame Beranotasi), lokasi, dan instansi tujuan.
- **Frame Beranotasi**: Gambar frame/foto yang diberi Bounding Box PKL dan penanda lokasi.
- **Dashboard Peta**: Antarmuka peta yang menampilkan Pelanggaran sebagai penanda (pin) pada lokasi geografisnya.
- **Confidence Score**: Nilai keyakinan Detektor terhadap deteksi PKL, dalam rentang 0.0 sampai 1.0.
- **Bounding Box**: Kotak pembatas berkoordinat piksel yang menandai posisi satu deteksi PKL pada suatu gambar.
- **Proporsi Overlap**: Rasio luas irisan antara Bounding Box PKL dan area acuan terhadap total luas Bounding Box PKL, bernilai 0.0 sampai 1.0.

## Requirements

### Requirement 1: Unggah Media (Foto dan Video)

**User Story:** Sebagai Operator, saya ingin mengunggah foto atau video hasil pemantauan lapangan ke aplikasi web, sehingga media dapat dianalisis untuk mendeteksi PKL dan pelanggaran zona.

#### Acceptance Criteria

1. WHEN Operator memilih berkas foto berformat JPG atau PNG dengan ukuran 1 KB sampai 20 MB dan menekan tombol unggah, THE Sistem SHALL menyimpan berkas dan menampilkan status unggahan berhasil dalam waktu maksimum 5 detik setelah unggahan selesai.
2. WHEN Operator memilih berkas video berformat MP4 dengan ukuran 1 MB sampai 200 MB dan menekan tombol unggah, THE Sistem SHALL menyimpan berkas dan menampilkan status unggahan berhasil dalam waktu maksimum 5 detik setelah unggahan selesai.
3. IF berkas yang diunggah memiliki format selain JPG, PNG (untuk foto) atau MP4 (untuk video), THEN THE Sistem SHALL menolak berkas, tidak menyimpannya, dan menampilkan pesan bahwa hanya format foto (JPG/PNG) dan video (MP4) yang didukung.
4. IF ukuran berkas video melebihi 200 MB atau berkas foto melebihi 20 MB, THEN THE Sistem SHALL menolak unggahan, tidak menyimpan berkas, dan menampilkan pesan batas ukuran maksimum yang berlaku.
5. IF berkas kosong (0 byte) atau tidak dapat dibaca, THEN THE Sistem SHALL menolak unggahan dan menampilkan pesan bahwa berkas tidak valid.
6. WHILE proses unggah berlangsung, THE Sistem SHALL menampilkan indikator progres unggahan berupa persentase dari 0% sampai 100%.
7. IF proses unggah gagal karena gangguan jaringan, THEN THE Sistem SHALL menghentikan unggahan, tidak menyimpan berkas parsial, menampilkan pesan kegagalan jaringan, dan menyediakan opsi mengunggah ulang.

### Requirement 2: Penentuan Zona Terlarang Geografis

**User Story:** Sebagai Operator, saya ingin menandai Zona Terlarang sebagai poligon geografis di atas peta kota, sehingga sistem tahu area geografis mana yang tidak boleh ditempati PKL.

#### Acceptance Criteria

1. WHEN Operator membuka halaman penentuan zona, THE Sistem SHALL menampilkan peta interaktif berbasis OpenStreetMap yang dapat digeser dan diperbesar/diperkecil.
2. WHEN Operator menambahkan minimal 3 titik pada peta, THE Sistem SHALL membentuk poligon Zona Terlarang tertutup dengan koordinat geografis (lintang/bujur) dari titik-titik tersebut secara berurutan.
3. IF Operator mencoba menyelesaikan sebuah Zona Terlarang dengan kurang dari 3 titik atau dengan poligon yang sisi-sisinya saling berpotongan, THEN THE Sistem SHALL menolak pembentukan poligon tersebut dan menampilkan pesan bahwa poligon harus memiliki minimal 3 titik dan tidak boleh saling berpotongan.
4. THE Sistem SHALL menyimpan setiap Zona Terlarang beserta nama/label dan koordinat geografisnya sehingga dapat digunakan kembali untuk analisis Media yang berbeda.
5. THE Sistem SHALL mengizinkan Operator menentukan minimal 1 dan maksimal 20 Zona Terlarang.
6. IF Operator memulai analisis tanpa ada Zona Terlarang yang tersimpan, THEN THE Sistem SHALL menolak permintaan dan menampilkan pesan bahwa minimal 1 Zona Terlarang wajib ditentukan.
7. THE Sistem SHALL mengizinkan Operator menghapus atau mengubah Zona Terlarang yang telah dibuat.

### Requirement 3: Perolehan Koordinat Lokasi (GPS EXIF, OCR, Manual)

**User Story:** Sebagai Operator, saya ingin sistem memperoleh koordinat lokasi secara otomatis dengan strategi berjenjang sesuai jenis Media (GPS EXIF untuk foto, OCR untuk video, dan input manual sebagai cadangan), sehingga saya tidak perlu memasukkan lokasi setiap deteksi secara manual kecuali bila sumber otomatis gagal.

#### Acceptance Criteria

1. WHEN sebuah foto dianalisis DAN foto tersebut memuat metadata GPS EXIF yang valid, THE Sistem SHALL menggunakan koordinat GPS EXIF tersebut secara langsung sebagai Titik Deteksi foto itu dan TIDAK menjalankan OCR untuk foto tersebut.
2. IF sebuah foto tidak memuat metadata GPS EXIF atau metadata GPS EXIF-nya tidak valid, THEN THE Sistem SHALL menjalankan OCR pada area Overlay Koordinat untuk mengekstrak koordinat geografis (lintang dan bujur) sebagai Titik Deteksi foto tersebut.
3. IF baik GPS EXIF maupun OCR gagal memperoleh koordinat valid untuk sebuah foto, THEN THE Sistem SHALL menyediakan Input Manual bagi Operator untuk memasukkan atau mengoreksi koordinat foto tersebut sebagai cadangan terakhir.
4. WHEN sebuah video dianalisis, FOR setiap Frame Disampel, THE Sistem SHALL menjalankan OCR pada Overlay Koordinat sebagai sumber koordinat utama untuk mengekstrak koordinat geografis frame tersebut sebagai Titik Deteksi frame itu, TANPA menggunakan GPS EXIF.
5. IF OCR gagal membaca koordinat pada sebagian Frame Disampel dari video, THEN THE Sistem SHALL melewati (skip) frame yang gagal tersebut dan tetap melanjutkan analisis menggunakan frame yang berhasil dibaca.
6. THE Sistem SHALL menyediakan Input Manual sebagai cadangan terakhir bagi Operator untuk memasukkan atau mengoreksi koordinat pada Media video.
7. THE Sistem SHALL memvalidasi kewajaran setiap koordinat yang diperoleh dari sumber mana pun (GPS EXIF, OCR, maupun Input Manual), dan IF koordinat berada di luar batas wilayah target yang dikonfigurasi (region_bounds), THEN THE Sistem SHALL menandai koordinat tersebut sebagai tidak valid dan tidak menggunakannya untuk Pencocokan Zona, terlepas dari sumbernya.
8. WHERE Operator perlu memasukkan atau mengoreksi koordinat melalui Input Manual, THE Sistem SHALL menyediakan Pemilih Koordinat Peta interaktif berbasis OpenStreetMap tempat Operator dapat mengklik sebuah titik pada peta.
9. WHEN Operator mengklik sebuah titik pada Pemilih Koordinat Peta, THE Sistem SHALL menampilkan koordinat geografis (lintang/bujur) titik tersebut dan menyediakan aksi untuk memilih/menyalin koordinat tersebut guna mengisi kolom Input Manual.
10. THE Sistem SHALL tetap mengizinkan Operator mengetikkan koordinat secara manual pada kolom Input Manual selain melalui Pemilih Koordinat Peta.
11. WHERE dua Frame Disampel video yang berdekatan berhasil dibaca melalui OCR dan terpisah gap yang wajar, THE Sistem MAY memperkirakan (interpolasi) koordinat berbasis OCR untuk frame di antaranya yang gagal dibaca, HANYA JIKA pergerakan antar-titik masih dalam batas kewajaran yang dikonfigurasi; jika tidak wajar, THE Sistem SHALL melewati frame tersebut alih-alih menebak.

### Requirement 4: Deteksi PKL (Hybrid)

**User Story:** Sebagai Operator, saya ingin sistem mendeteksi PKL pada foto/video, sehingga saya tahu di mana PKL muncul.

#### Acceptance Criteria

1. WHEN sebuah foto dianalisis, THE Detektor SHALL menghasilkan daftar deteksi PKL berisi Bounding Box dan Confidence Score untuk foto tersebut.
2. WHEN sebuah video dianalisis, THE Sistem SHALL menyampel satu frame pada setiap interval 1 detik durasi video mulai detik ke-0 hingga akhir video, dan FOR setiap Frame Disampel THE Detektor SHALL menghasilkan daftar deteksi PKL berisi Bounding Box dan Confidence Score.
3. THE Sistem SHALL hanya menganggap deteksi valid WHERE Confidence Score bernilai lebih besar atau sama dengan 0.5.
4. THE Sistem SHALL mendukung dua mode Detektor: (a) mode proxy menggunakan YOLO pretrained yang menganggap orang (person) yang berada dalam Zona Terlarang sebagai kandidat PKL, dan (b) mode fine-tune menggunakan model YOLO yang dilatih dengan dataset PKL untuk mengenali PKL secara langsung.
5. THE Sistem SHALL dapat dikonfigurasi untuk memilih mode Detektor (proxy atau fine-tune) tanpa mengubah alur analisis lainnya.
6. WHILE Analisis berlangsung untuk video, THE Sistem SHALL menampilkan indikator progres bernilai bilangan bulat 0 sampai 100 persen yang tidak pernah menurun dan diperbarui setidaknya sekali setiap 1 detik.
7. IF Media tidak dapat dibaca atau rusak, THEN THE Sistem SHALL menghentikan analisis, tidak menyimpan hasil parsial, dan menampilkan pesan bahwa Media tidak dapat diproses.

### Requirement 5: Penentuan Pelanggaran Berbasis Zona Geografis

**User Story:** Sebagai Operator, saya ingin sistem menentukan apakah PKL yang terdeteksi berada di zona terlarang secara geografis, sehingga hanya pelanggaran nyata yang dilaporkan dan laporan tidak salah kirim.

#### Acceptance Criteria

1. WHEN sebuah deteksi PKL valid dihasilkan pada suatu foto atau Frame Disampel yang memiliki Titik Deteksi valid, THE Sistem SHALL melakukan Pencocokan Zona untuk menentukan apakah Titik Deteksi berada di dalam salah satu Zona Terlarang.
2. IF Titik Deteksi berada di dalam sebuah Zona Terlarang, THEN THE Sistem SHALL mencatat kejadian tersebut sebagai Pelanggaran.
3. IF sebuah deteksi PKL valid tidak memiliki Titik Deteksi yang valid (koordinat tidak terbaca dan tidak dikoreksi), THEN THE Sistem SHALL menandai deteksi tersebut sebagai "lokasi tidak diketahui" dan tidak menghitungnya sebagai Pelanggaran.
4. WHEN sebuah Pelanggaran dicatat, THE Sistem SHALL menyimpan koordinat Titik Deteksi, identifier Zona Terlarang, Confidence Score, koordinat Bounding Box, dan (untuk video) timestamp frame.
5. WHEN dua atau lebih Frame Disampel berurutan pada video mengandung Pelanggaran di Zona Terlarang yang sama dan terpisah tidak lebih dari 1.0 detik, THE Sistem SHALL menggabungkannya menjadi satu Pelanggaran dengan waktu mulai dan waktu selesai sesuai frame pertama dan terakhir dalam rangkaian tersebut.

### Requirement 6: Dashboard Peta Pelanggaran

**User Story:** Sebagai Operator/petugas Dishub, saya ingin melihat Pelanggaran pada peta, sehingga saya dapat memahami sebaran lokasi pelanggaran secara cepat.

#### Acceptance Criteria

1. WHEN Analisis selesai dan terdapat Pelanggaran dengan Titik Deteksi valid, THE Dashboard Peta SHALL menampilkan setiap Pelanggaran sebagai penanda (pin) pada koordinat geografisnya di atas peta.
2. THE Dashboard Peta SHALL menampilkan poligon Zona Terlarang bersama penanda Pelanggaran pada peta yang sama.
3. WHEN Operator memilih sebuah penanda Pelanggaran, THE Sistem SHALL menampilkan detail Pelanggaran tersebut (koordinat, Zona Terlarang terkait, waktu, bukti visual, dan Status Validasi).
4. WHILE tidak ada Pelanggaran dengan lokasi valid, THE Dashboard Peta SHALL menampilkan pesan bahwa tidak ada pelanggaran berlokasi untuk ditampilkan.
5. THE Dashboard Peta SHALL membedakan warna penanda Pelanggaran berdasarkan Status Validasi: penanda oranye untuk `pending_review` dan penanda merah untuk `valid`.
6. THE Dashboard Peta SHALL TIDAK menampilkan penanda untuk Pelanggaran berstatus `rejected`.
7. WHEN Status Validasi sebuah Pelanggaran berubah, THE Dashboard Peta SHALL memperbarui penanda terkait sesuai aturan warna dan penyembunyian tanpa memerlukan Operator memuat ulang halaman secara manual.

### Requirement 7: Pembuatan Laporan

**User Story:** Sebagai Operator, saya ingin sistem menghasilkan laporan hasil deteksi, sehingga saya memiliki dokumentasi pelanggaran yang siap ditindaklanjuti oleh instansi berwenang.

#### Acceptance Criteria

1. WHEN Analisis selesai, THE Generator Laporan SHALL membuat Laporan berisi ringkasan jumlah total Pelanggaran (bilangan bulat, minimal 0) dan cakupan Media yang dianalisis (jumlah foto atau durasi video dalam detik).
2. THE Laporan SHALL memuat daftar setiap Pelanggaran beserta koordinat lokasi, alamat (bila tersedia dari Overlay Koordinat), waktu, dan identifier Zona Terlarang; untuk video, waktu dinyatakan sebagai timestamp mulai dan selesai dalam format HH:MM:SS relatif terhadap awal video.
3. FOR setiap Pelanggaran, THE Generator Laporan SHALL menyertakan minimal satu Frame Beranotasi yang menampilkan Bounding Box PKL yang terkait dengan Pelanggaran tersebut.
4. THE Laporan SHALL menyertakan instansi tujuan (Satpol PP/Dishub) sebagai bagian dari dokumen tindak lanjut.
5. WHEN Laporan selesai dibuat, THE Sistem SHALL menampilkan Laporan di antarmuka web dalam waktu maksimal 5 detik setelah proses pembuatan selesai.
6. WHILE Laporan ditampilkan di antarmuka web, THE Sistem SHALL menyediakan opsi bagi Operator untuk mengunduh Laporan dalam format PDF.
7. IF Analisis tidak menemukan Pelanggaran, THEN THE Generator Laporan SHALL membuat Laporan yang secara eksplisit menyatakan tidak ada Pelanggaran terdeteksi dengan jumlah total Pelanggaran bernilai 0.
8. IF pembuatan berkas PDF gagal, THEN THE Sistem SHALL menampilkan pesan kegagalan pengunduhan dan mempertahankan Laporan yang ditampilkan di antarmuka web tanpa perubahan.

### Requirement 8: Peninjauan Riwayat Analisis

**User Story:** Sebagai Operator, saya ingin melihat riwayat analisis yang telah dilakukan, sehingga saya dapat mengakses kembali laporan sebelumnya.

#### Acceptance Criteria

1. WHEN sebuah Analisis selesai, THE Sistem SHALL menyimpan Laporan beserta metadata berupa nama Media (maksimum 255 karakter), jenis Media (foto/video), dan waktu analisis (dengan presisi hingga detik).
2. IF penyimpanan Laporan atau metadata gagal, THEN THE Sistem SHALL menahan penambahan entri ke riwayat dan menampilkan pesan kesalahan bahwa penyimpanan gagal.
3. WHEN Operator membuka halaman riwayat analisis, THE Sistem SHALL menampilkan daftar entri riwayat yang diurutkan berdasarkan waktu analisis dari yang terbaru ke yang terlama.
4. WHILE daftar riwayat analisis kosong, THE Sistem SHALL menampilkan pesan bahwa belum ada riwayat analisis.
5. WHEN Operator memilih satu entri riwayat, THE Sistem SHALL menampilkan Laporan lengkap yang terkait dengan entri tersebut dalam waktu maksimum 3 detik.
6. IF Laporan yang terkait dengan entri riwayat yang dipilih tidak dapat ditemukan atau diambil, THEN THE Sistem SHALL menampilkan pesan bahwa Laporan tidak tersedia dan mempertahankan tampilan daftar riwayat.

### Requirement 9: Validasi dan Tindak Lanjut Pelanggaran

**User Story:** Sebagai Operator, saya ingin meninjau setiap Pelanggaran hasil deteksi lalu menandainya valid atau tidak valid, dan untuk yang valid mencatat apakah sudah ditindak, sehingga hanya pelanggaran nyata yang dilaporkan ke instansi dan koreksi saya tersimpan sebagai bahan peningkatan sistem.

#### Acceptance Criteria

1. WHEN sebuah Pelanggaran dicatat oleh Analisis, THE Sistem SHALL memberi Pelanggaran tersebut Status Validasi awal `pending_review` dan menyimpannya di basis data.
2. THE Sistem SHALL menyediakan aksi bagi Operator untuk mengubah Status Validasi sebuah Pelanggaran menjadi `valid` atau `rejected`.
3. WHEN Operator menandai sebuah Pelanggaran sebagai `valid`, THE Sistem SHALL menyimpan perubahan Status Validasi tersebut dan menyediakan Status Tindak Lanjut untuk Pelanggaran itu dengan nilai awal `belum`.
4. WHEN Operator menandai sebuah Pelanggaran sebagai `rejected`, THE Sistem SHALL menerapkan Soft-delete: menyimpan perubahan Status Validasi menjadi `rejected`, mempertahankan barisnya di basis data, dan menyembunyikannya dari daftar Pelanggaran aktif dan Dashboard Peta.
5. THE Sistem SHALL TIDAK menghapus secara permanen (hard-delete) baris Pelanggaran mana pun akibat aksi validasi Operator.
6. WHERE sebuah Pelanggaran berstatus `valid`, THE Sistem SHALL menyediakan kontrol (checkbox) bagi Operator untuk menetapkan Status Tindak Lanjut menjadi `sudah` atau mengembalikannya menjadi `belum`, dan menyimpan perubahan tersebut.
7. THE Sistem SHALL mempertahankan Status Validasi dan Status Tindak Lanjut setiap Pelanggaran secara persisten sehingga nilainya tetap sama ketika Operator meninjau kembali Laporan dari riwayat.
8. WHERE Operator meninjau daftar Pelanggaran, THE Sistem SHALL menampilkan Status Validasi setiap Pelanggaran, dan untuk Pelanggaran berstatus `valid` juga menampilkan Status Tindak Lanjut.
