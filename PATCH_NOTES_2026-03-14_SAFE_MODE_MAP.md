# Patch Notes - Safe Mode Peta Komoditas (2026-03-14)

Perubahan utama:
- Menonaktifkan penggunaan polygon boundary lokal lama pada peta komoditas.
- Mengganti peta komoditas menjadi mode aman berbasis titik centroid kabupaten/kota.
- Memperbarui teks dashboard dan tab Komoditas agar konsisten memakai istilah titik wilayah, bukan area polygon.
- Menjaga drilldown wilayah tetap aktif tanpa risiko salah pasangan area pada Pulau Timor.

Alasan patch:
- Boundary lokal lama memakai kode wilayah yang tidak lagi sinkron dengan kode BPS yang dipakai data aplikasi.
- Hal ini membuat sejumlah wilayah, terutama di Pulau Timor, tertukar saat divisualkan sebagai area polygon.
- Sampai boundary resmi terbaru dibundel offline ke aplikasi, mode centroid adalah opsi paling aman dan paling jujur terhadap data.
