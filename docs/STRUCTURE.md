# GIMA Analytics — Struktur Proyek

Website statis HTML/CSS/JavaScript, tanpa framework dan tanpa backend. Semua perubahan Tahap 2 berada pada branch `preview/gima-phase2-services` sampai disetujui untuk merge.

```text
GimaAnalytic/
├── index.html                  # Landing page, layanan, formulir konsultasi
├── dashboard.html              # Dashboard DEMO, data sintetis
├── assets/
│   ├── giandra-maheswara-logo.svg
│   ├── css/
│   │   ├── base.css            # Variabel warna, layout, header, komponen umum
│   │   ├── sections.css        # Tahapan konsultasi dan paket layanan
│   │   ├── contact.css         # Formulir konsultasi dan teaser dashboard
│   │   └── dashboard.css       # Layout dashboard dan grafik
│   └── js/
│       ├── navigation.js       # Menu mobile dan tahun footer
│       ├── consultation.js     # Validasi dan ringkasan formulir (lokal)
│       ├── demo-data.js        # Data sintetis demo
│       └── dashboard.js        # Filter dan render dashboard
├── vercel.json
├── README.md
└── docs/
    └── STRUCTURE.md
```

## Panduan mencari masalah
- Navigasi / menu HP: `assets/js/navigation.js` dan `assets/css/base.css`
- Tampilan beranda: `index.html` dan `assets/css/base.css`
- Paket layanan / alur kerja: `index.html` dan `assets/css/sections.css`
- Form konsultasi: `index.html`, `assets/js/consultation.js`, `assets/css/contact.css`
- Data dashboard: `assets/js/demo-data.js`
- Grafik / filter dashboard: `assets/js/dashboard.js` dan `assets/css/dashboard.css`
- Konfigurasi deployment: `vercel.json`

## Keamanan dan batasan
- Form konsultasi hanya membuat ringkasan **di browser**. Belum mengirim ke server, email, atau database.
- Dashboard menggunakan data **sintetis**, bukan data klien.
- Tidak ada login, autentikasi, atau pemisahan tenant. Jangan mengumpulkan data karyawan nyata.
- File logo SVG dibuat dari penelusuran gambar; ganti dengan aset asli bila sudah tersedia.
- Domain, nama merek, dan email bisnis masih perlu diverifikasi.

## Menjalankan lokal
```sh
python3 -m http.server 3000
```
Buka `http://localhost:3000` dan `http://localhost:3000/dashboard.html`.

## Pengujian sebelum merge
1. Pastikan kedua halaman terbuka tanpa 404.
2. Uji menu mobile dan seluruh tautan navigasi.
3. Uji formulir: validasi, ringkasan, dan tombol salin.
4. Uji filter dashboard untuk semua departemen dan periode.
5. Periksa console browser untuk error JavaScript.
6. Pastikan branch `main` tidak berubah sampai ada persetujuan merge.

## Konvensi selanjutnya
- Satu fitur = file JavaScript dan CSS terpisah bila cukup kompleks.
- Hindari JavaScript inline dan CSS inline kecuali nilai grafik yang dinamis.
- Gunakan nama file deskriptif dan dokumentasikan perubahan.
- Kerjakan fitur pada branch preview; merge hanya setelah disetujui.
