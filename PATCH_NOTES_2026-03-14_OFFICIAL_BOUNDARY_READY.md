# Patch Notes 2026-03-14 - Official Boundary Ready

Perubahan utama:
- Peta komoditas sekarang mencoba memuat boundary resmi BIG dari layer `BATAS_WILAYAH` kabupaten/kota.
- Boundary hanya dipakai bila lolos validasi ketat:
  - harus ada 22 fitur kabupaten/kota NTT
  - seluruh kode BPS kabupaten/kota harus cocok dengan database aplikasi
  - nama wilayah harus cocok dengan daftar wilayah aplikasi
- Bila boundary resmi belum tersedia atau gagal diakses, aplikasi otomatis kembali ke mode aman berbasis centroid agar tidak menukar wilayah.
- Ditambahkan endpoint backend untuk boundary komoditas dan script cache boundary resmi untuk dipakai saat internet tersedia.

Script baru:
- `npm run cache-official-boundary -w backend`

Catatan:
- Pada mode offline tanpa cache boundary lokal, peta akan tetap aman dengan titik wilayah.
- Saat sudah online, jalankan script cache sekali untuk menyimpan boundary resmi lokal.
