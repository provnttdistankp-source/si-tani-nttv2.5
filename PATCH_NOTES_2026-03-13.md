# Patch Notes 2026-03-13

Perubahan utama:
- Tab Komoditas diubah menjadi modul analisis komoditas.
- Ditambahkan peta analitik kabupaten/kota NTT pada dashboard utama.
- Chart dan ranking utama sekarang dapat diklik untuk drilldown ke modul Komoditas.
- Modul Peta Interaktif tetap mempertahankan peta satelit marker lapangan.
- Pusat impor ditambah panel analisis struktur data untuk dasar impor berikutnya.
- Script frontend diperbarui agar dev/build tidak bergantung pada binary `.bin/vite` yang sempat bermasalah.

Catatan:
- Batas kabupaten/kota NTT memakai subset GeoJSON publik yang tersedia untuk 21 area dan belum memuat polygon Malaka.
- Data nilai komoditas tetap diambil dari data resmi yang sudah dikurasi di aplikasi.
