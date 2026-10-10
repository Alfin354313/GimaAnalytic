# Phase 5 — Supabase foundation (PREVIEW, belum merge)

## Tujuan
Menyiapkan struktur organisasi, anggota, survei, dan pertanyaan untuk GIMA Analytics. Ini **bukan** sistem produksi dan belum mengumpulkan jawaban karyawan.

## Struktur
- `supabase/migrations/20261010_001_foundation.sql`: schema PostgreSQL dan Row Level Security (RLS)
- `docs/SUPABASE_SETUP.md`: panduan integrasi dan pemeriksaan

## Langkah instalasi
1. Buat proyek Supabase khusus **development**, terpisah dari proyek lain.
2. Buka SQL Editor dan **review** isi migrasi sebelum menjalankannya.
3. Jalankan skrip satu kali pada proyek development. Simpan cadangan bila database tidak kosong.
4. Di Authentication, aktifkan email/password dan verifikasi email. Batasi pendaftaran sesuai kebutuhan bisnis.
5. Buat organisasi dan penetapan owner melalui backend tepercaya setelah alur provisioning disiapkan.
6. Uji dengan minimal dua akun organisasi berbeda. Pastikan akun A tidak dapat melihat organisasi, survei, atau pertanyaan milik B.

## Kebijakan keamanan saat ini
- RLS aktif pada seluruh tabel.
- Pengguna terautentikasi hanya dapat membaca organisasi tempat ia menjadi anggota, survei terkait, dan pertanyaannya.
- Pengguna hanya dapat membaca **keanggotaan dirinya sendiri**.
- Tidak ada policy penulisan (INSERT, UPDATE, DELETE). Ini sengaja: frontend belum boleh menulis langsung.
- Tidak ada tabel respons atau responden, demi menghindari penyimpanan data sensitif sebelum desain privasi siap.
- Jangan pernah memasukkan `service_role`, `secret`, password, atau token admin ke GitHub / browser / Vercel client.
- Supabase URL dan publishable/anon key bukan kredensial administrator; akses tetap harus dibatasi dengan RLS.
- Kebijakan RLS **tidak menggantikan** pengujian authorization, audit, dan perlindungan API.

## Tahap berikutnya
- Bangun halaman login dengan Supabase Auth dan penanganan sesi yang benar.
- Buat server-side provisioning organisasi, penetapan role, dan manajemen anggota.
- Tambahkan API pembuatan survei dengan validasi tenant dan hak akses.
- Baru kemudian desain respons anonim, consent, rate limiting, retention, dan batas agregasi.

**Penting:** Migrasi ini hanya disimpan sebagai kode di branch preview. Belum dieksekusi di database apa pun.

## Portal login admin (ditambahkan pada branch preview)
- `/login`: formulir email/password Supabase Auth.
- `/admin`: memeriksa user login dan hanya menampilkan organisasi yang terdaftar pada `organization_members`.
- `assets/js/supabase-config.js`: isi `url` dan `publishableKey` proyek **GIMA Analytics**, bukan proyek lain. **Jangan pernah memasukkan service_role / secret key**.
- `assets/js/auth-client.js`: wrapper klien Supabase browser.
- `assets/js/login.js`, `assets/js/admin.js`: logika halaman terpisah.
- `assets/css/auth.css`: styling portal admin.

### Hal penting sebelum uji login
1. Pastikan email/password Supabase Auth diaktifkan, dan buat pengguna melalui Supabase Dashboard. Pastikan email terverifikasi sesuai konfigurasi.
2. Setelah login, akun yang belum punya baris keanggotaan hanya mendapat pesan 'belum menjadi anggota organisasi'. Ini disengaja.
3. **Jangan menambahkan kebijakan INSERT ke tabel organisasi/anggota langsung dari browser.** Provisioning owner dan organisasi perlu backend tepercaya dan audit.
4. File `admin.html` bersifat statis: UI disembunyikan sampai sesi dan membership diverifikasi. Pengamanan data **harus tetap pada RLS**, bukan hanya menyembunyikan UI.
5. Uji halaman `/login` dan `/admin` di Vercel Preview. Belum ada koneksi Supabase yang aktif sampai konfigurasi publik diisi.
6. Versi library Supabase dari CDN perlu ditinjau saat pengujian deploy; produksi sebaiknya menggunakan dependensi yang dipin dan kebijakan CSP yang sesuai.
