# GIMA Analytics — Tahap 13: Audit Keamanan (Preview)

Status: pemeriksaan awal kode; **belum** audit penetrasi atau verifikasi konfigurasi Supabase aktif.

## Kontrol yang sudah ada
- Akses dashboard memerlukan sesi Supabase Auth; izin database ditentukan RLS dan RPC.
- Fungsi tambah anggota memeriksa role owner di server; ID anggota harus terdaftar di Auth.
- Hasil agregat menyembunyikan skor dengan kurang dari lima respons valid per pertanyaan.
- Browser diberi header anti-sniffing, anti-framing, kebijakan referrer, dan batas izin perangkat pada Vercel.

## Uji manual wajib sebelum produksi
1. Login sebagai owner, admin, analyst, dan tanpa login; pastikan izin baca/tulis sesuai role.
2. Coba RPC `gima_add_organization_member` sebagai analyst/admin; harus ditolak.
3. Coba akses survei dan laporan organisasi lain menggunakan UUID valid; harus ditolak.
4. Periksa Supabase Database → Policies dan function grants; pastikan anon tidak bisa memanggil RPC privat.
5. Periksa response headers pada Preview; pastikan konfigurasi Vercel terpasang.
6. Uji logout dan akses ulang halaman admin; halaman tidak boleh memperlihatkan data lama tanpa autentikasi.
7. Periksa semua environment variables dan Git history untuk service_role key, JWT secret, atau kredensial privat; jangan pernah letakkan di JS publik.
8. Uji pengiriman survei berulang dan ambang agregasi; rate limit tidak menggantikan proteksi abuse berbasis identitas.
9. Uji browser dan fitur print PDF; data hasil cetak berada di perangkat pengguna dan harus diperlakukan sebagai dokumen sensitif.
10. Tinjau kebijakan retensi data, consent responden, serta backup dan pemulihan.

## Pekerjaan lanjutan
- Review kebijakan Content-Security-Policy setelah seluruh sumber script, font, dan gambar didata.
- Tambahkan audit trail perubahan hak akses yang dilakukan melalui RPC setelah desain retensi disetujui.
- Lakukan pemeriksaan integrasi Supabase dan pengujian RLS pada lingkungan staging.

Catatan: konfigurasi header ini tidak menjamin keamanan penuh. Jangan merge sebelum pengujian selesai dan ada persetujuan eksplisit.
