# SI Tani NTT

Aplikasi fullstack web untuk pengelolaan data pertanian Nusa Tenggara Timur. Project ini memuat frontend React + Vite + Tailwind dan backend Node.js + Express + JWT. Seluruh halaman utama dapat diklik, berpindah route, membaca data resmi komoditas, menampilkan grafik, dan menampilkan peta interaktif.

## Fitur

- Login, register, forgot password
- Role access: admin, petugas, penyuluh, user
- Landing page informatif
- Dashboard statistik dan chart
- CRUD data pengguna, petani, kelompok tani, lahan, komoditas, kegiatan, penyuluh
- Referensi wilayah NTT hingga kecamatan
- Data utama pertanian per kabupaten/kota
- Peta interaktif dengan filter
- Basemap satelit citra nyata
- Overlay air internet live dari OpenStreetMap saat zoom diperbesar
- Analisis sumber air sekitar lokasi pada modal detail
- Laporan dan ekspor Excel / PDF / cetak
- Integrasi data resmi tanaman pangan 2023, kelapa 2020, buah tahunan 2022, dan poktan Sumba Timur 2025
- Menu impor data CSV/XLSX/JSON untuk pembaruan data berikutnya

## Akun demo

- admin.ntt@sitani.local / demo12345
- petugas.kupang@sitani.local / demo12345
- penyuluh.flores@sitani.local / demo12345
- user.demo@sitani.local / demo12345

## Cara menjalankan

### Opsi 1: jalankan dari root workspace

```bash
npm install
npm run dev
```

Frontend berjalan di `http://localhost:5173`  
Backend berjalan di `http://localhost:4000`

### Opsi 2: jalankan manual per folder

```bash
cd backend
npm install
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

## Build production

```bash
npm install
npm run build
npm run start
```

## Struktur singkat

```text
si-tani-ntt/
  backend/
    src/
      data/
      middleware/
      routes/
      utils/
  frontend/
    src/
      components/
      context/
      dashboard/
      layouts/
      lib/
      pages/
```

## Catatan data

Versi ini memadukan data referensi wilayah NTT dengan data resmi komoditas dan sebaran kegiatan yang Anda unggah. Nama poktan dan nama ketua poktan sudah berasal dari dokumen resmi. Field yang belum tersedia pada dokumen sumber, seperti NIK individu dan koordinat GPS presisi, masih memakai placeholder sistem atau centroid kecamatan dan harus diverifikasi lapangan sebelum dipakai operasional penuh.

## Catatan peta dan sumber air

- Basemap default memakai citra satelit sehingga hamparan lahan, pohon, jalan, dan pola area asli terlihat.
- Overlay "Air internet nyata" mengambil sungai, aliran, mata air, sumur, bendung, dan badan air dari internet memakai layanan OpenStreetMap live.
- Jika komputer tidak tersambung internet, aplikasi tetap berjalan dengan data kurasi lokal yang sudah disediakan sebagai fallback.
- Overlay air internet baru dimuat saat zoom peta minimal 10 agar query tetap ringan dan relevan.
