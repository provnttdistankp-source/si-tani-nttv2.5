export const moduleConfig = {
  users: {
    title: "Data Pengguna",
    endpoint: "users",
    columns: [
      { key: "name", label: "Nama" },
      { key: "email", label: "Email" },
      { key: "role", label: "Peran" },
      { key: "lastLoginAt", label: "Login Terakhir", render: (row) => row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleString("id-ID") : "-" },
      { key: "status", label: "Status" }
    ],
    fields: [
      { name: "name", label: "Nama" },
      { name: "email", label: "Email", type: "email" },
      { name: "role", label: "Peran", type: "select", options: (lookups) => lookups.roles },
      { name: "phone", label: "Telepon" },
      { name: "status", label: "Status", type: "select", options: [{ value: "active", label: "active" }, { value: "inactive", label: "inactive" }] }
    ]
  },
  petani: {
    title: "Data Petani",
    endpoint: "farmers",
    enableLocationPreview: true,
    locationCategory: "Petani",
    columns: [
      { key: "name", label: "Nama" },
      { key: "nik", label: "NIK" },
      { key: "farmerGroupName", label: "Kelompok Tani" },
      { key: "districtName", label: "Kecamatan" },
      { key: "sourceLabel", label: "Sumber", sortable: false, render: (row) => row.sourceLabel || "-" },
      { key: "nearestWaterSummary", label: "Air Terdekat", sortable: false, render: (row) => row.nearestWaterSourceName ? `${row.nearestWaterSourceName} (${row.nearestWaterDistanceKm} km)` : "-" }
    ],
    fields: [
      { name: "nik", label: "NIK", placeholder: "16 digit NIK" },
      { name: "name", label: "Nama" },
      { name: "gender", label: "Jenis Kelamin", type: "select", options: [{ value: "L", label: "Laki-laki" }, { value: "P", label: "Perempuan" }] },
      { name: "age", label: "Usia", type: "number" },
      { name: "phone", label: "Telepon" },
      { name: "education", label: "Pendidikan" },
      { name: "regencyCode", label: "Kabupaten/Kota", type: "select", options: (lookups) => lookups.regencies },
      { name: "districtCode", label: "Kecamatan", type: "select", options: (lookups, values) => lookups.districts.filter((x) => !values.regencyCode || x.regencyCode === values.regencyCode) },
      { name: "farmerGroupId", label: "Kelompok Tani", type: "select", options: (lookups, values) => lookups.farmerGroups.filter((x) => !values.regencyCode || x.regencyCode === values.regencyCode) },
      { name: "address", label: "Alamat", type: "textarea", full: true },
      { name: "latitude", label: "Latitude", type: "number" },
      { name: "longitude", label: "Longitude", type: "number" },
      { name: "mapLocation", label: "Pilih Titik Lokasi Petani di Peta", type: "map-picker", full: true, latField: "latitude", lngField: "longitude", regencyField: "regencyCode", districtField: "districtCode", height: 340 }
    ]
  },
  "kelompok-tani": {
    title: "Data Kelompok Tani",
    endpoint: "farmerGroups",
    enableLocationPreview: true,
    locationCategory: "Kelompok Tani",
    columns: [
      { key: "name", label: "Nama Kelompok" },
      { key: "chairman", label: "Ketua" },
      { key: "districtName", label: "Kecamatan" },
      { key: "membersCount", label: "Anggota" },
      { key: "sourceLabel", label: "Sumber", sortable: false, render: (row) => row.sourceLabel || "-" },
      { key: "nearestWaterSummary", label: "Air Terdekat", sortable: false, render: (row) => row.nearestWaterSourceName ? `${row.nearestWaterSourceName} (${row.nearestWaterDistanceKm} km)` : "-" }
    ],
    fields: [
      { name: "name", label: "Nama Kelompok" },
      { name: "chairman", label: "Ketua" },
      { name: "chairmanNik", label: "NIK Ketua", placeholder: "16 digit NIK" },
      { name: "membersCount", label: "Jumlah Anggota", type: "number" },
      { name: "regencyCode", label: "Kabupaten/Kota", type: "select", options: (lookups) => lookups.regencies },
      { name: "districtCode", label: "Kecamatan", type: "select", options: (lookups, values) => lookups.districts.filter((x) => !values.regencyCode || x.regencyCode === values.regencyCode) },
      { name: "fieldOfficerId", label: "Petugas/Penyuluh", type: "select", options: (lookups, values) => lookups.fieldOfficers.filter((x) => !values.regencyCode || x.regencyCode === values.regencyCode) },
      { name: "mainCommodityId", label: "Komoditas Utama", type: "select", options: (lookups) => lookups.commodities },
      { name: "village", label: "Desa/Kelurahan" },
      { name: "latitude", label: "Latitude", type: "number" },
      { name: "longitude", label: "Longitude", type: "number" },
      { name: "mapLocation", label: "Pilih Titik Lokasi di Peta NTT", type: "map-picker", full: true, latField: "latitude", lngField: "longitude", regencyField: "regencyCode", districtField: "districtCode", height: 340 },
      { name: "status", label: "Status", type: "select", options: [{ value: "aktif", label: "aktif" }, { value: "pendampingan", label: "pendampingan" }] }
    ]
  },
  lahan: {
    title: "Data Lahan",
    endpoint: "lands",
    enableLocationPreview: true,
    locationCategory: "Lahan",
    columns: [
      { key: "name", label: "Nama Lahan" },
      { key: "farmerName", label: "Petani" },
      { key: "commodityName", label: "Komoditas" },
      { key: "areaHa", label: "Luas (Ha)" },
      { key: "status", label: "Status" }
    ],
    fields: [
      { name: "name", label: "Nama Lahan" },
      { name: "farmerId", label: "Petani", type: "select", options: (lookups, values) => lookups.farmers.filter((x) => !values.regencyCode || x.regencyCode === values.regencyCode) },
      { name: "regencyCode", label: "Kabupaten/Kota", type: "select", options: (lookups) => lookups.regencies },
      { name: "districtCode", label: "Kecamatan", type: "select", options: (lookups, values) => lookups.districts.filter((x) => !values.regencyCode || x.regencyCode === values.regencyCode) },
      { name: "commodityId", label: "Komoditas", type: "select", options: (lookups) => lookups.commodities },
      { name: "areaHa", label: "Luas (Ha)", type: "number" },
      { name: "irrigationType", label: "Jenis Irigasi", type: "select", options: (lookups) => lookups.irrigationTypes.map((x) => ({ value: x, label: x })) },
      { name: "status", label: "Status", type: "select", options: (lookups) => lookups.landStatuses.map((x) => ({ value: x, label: x })) },
      { name: "latitude", label: "Latitude", type: "number" },
      { name: "longitude", label: "Longitude", type: "number" },
      { name: "mapLocation", label: "Pilih Titik Lokasi Lahan di Peta", type: "map-picker", full: true, latField: "latitude", lngField: "longitude", regencyField: "regencyCode", districtField: "districtCode", height: 340 }
    ]
  },
  komoditas: {
    title: "Data Komoditas",
    endpoint: "commodities",
    columns: [
      { key: "name", label: "Nama Komoditas" },
      { key: "category", label: "Kategori" },
      { key: "latestYear", label: "Tahun Data", sortable: false, render: (row) => row.latestYear || row.sourceYear || "-" },
      { key: "totalProductionDisplay", label: "Total Produksi", sortable: false, render: (row) => row.totalProductionDisplay || "-" },
      { key: "coverageDisplay", label: "Sebaran", sortable: false, render: (row) => row.coverageDisplay || "-" },
      { key: "topRegencyName", label: "Kabupaten Tertinggi", sortable: false, render: (row) => row.topRegencyName || "-" }
    ],
    fields: [
      { name: "name", label: "Nama Komoditas" },
      { name: "category", label: "Kategori", type: "select", options: [
        { value: "Tanaman Pangan", label: "Tanaman Pangan" },
        { value: "Hortikultura", label: "Hortikultura" },
        { value: "Perkebunan", label: "Perkebunan" }
      ] },
      { name: "unit", label: "Satuan" },
      { name: "status", label: "Status", type: "select", options: [{ value: "active", label: "active" }, { value: "inactive", label: "inactive" }] },
      { name: "description", label: "Deskripsi", type: "textarea", full: true }
    ]
  },
  kegiatan: {
    title: "Data Kegiatan Pertanian",
    endpoint: "activities",
    enableLocationPreview: true,
    locationCategory: "Kegiatan",
    columns: [
      { key: "name", label: "Nama Kegiatan" },
      { key: "type", label: "Jenis" },
      { key: "regencyName", label: "Kabupaten/Kota" },
      { key: "date", label: "Tanggal" },
      { key: "status", label: "Status" }
    ],
    fields: [
      { name: "name", label: "Nama Kegiatan" },
      { name: "type", label: "Jenis Kegiatan", type: "select", options: (lookups) => lookups.activityTypes.map((x) => ({ value: x, label: x })) },
      { name: "regencyCode", label: "Kabupaten/Kota", type: "select", options: (lookups) => lookups.regencies },
      { name: "districtCode", label: "Kecamatan", type: "select", options: (lookups, values) => lookups.districts.filter((x) => !values.regencyCode || x.regencyCode === values.regencyCode) },
      { name: "date", label: "Tanggal", type: "date" },
      { name: "responsibleOfficerId", label: "Penanggung Jawab", type: "select", options: (lookups, values) => lookups.fieldOfficers.filter((x) => !values.regencyCode || x.regencyCode === values.regencyCode) },
      { name: "farmerGroupId", label: "Kelompok Tani", type: "select", options: (lookups, values) => lookups.farmerGroups.filter((x) => !values.regencyCode || x.regencyCode === values.regencyCode) },
      { name: "commodityId", label: "Komoditas", type: "select", options: (lookups) => lookups.commodities },
      { name: "status", label: "Status", type: "select", options: (lookups) => lookups.activityStatuses.map((x) => ({ value: x, label: x })) },
      { name: "description", label: "Deskripsi", type: "textarea", full: true },
      { name: "latitude", label: "Latitude", type: "number" },
      { name: "longitude", label: "Longitude", type: "number" },
      { name: "mapLocation", label: "Pilih Titik Lokasi Kegiatan di Peta", type: "map-picker", full: true, latField: "latitude", lngField: "longitude", regencyField: "regencyCode", districtField: "districtCode", height: 340 }
    ]
  },
  penyuluh: {
    title: "Data Penyuluh dan Petugas",
    endpoint: "fieldOfficers",
    columns: [
      { key: "name", label: "Nama" },
      { key: "role", label: "Peran" },
      { key: "specialty", label: "Spesialisasi" },
      { key: "regencyName", label: "Kabupaten/Kota" },
      { key: "status", label: "Status" }
    ],
    fields: [
      { name: "name", label: "Nama" },
      { name: "email", label: "Email", type: "email" },
      { name: "phone", label: "Telepon" },
      { name: "role", label: "Peran", type: "select", options: [{ value: "PPL", label: "PPL" }, { value: "Petugas Lapangan", label: "Petugas Lapangan" }] },
      { name: "specialty", label: "Spesialisasi" },
      { name: "regencyCode", label: "Kabupaten/Kota", type: "select", options: (lookups) => lookups.regencies },
      { name: "districtCode", label: "Kecamatan", type: "select", options: (lookups, values) => lookups.districts.filter((x) => !values.regencyCode || x.regencyCode === values.regencyCode) },
      { name: "status", label: "Status", type: "select", options: [{ value: "active", label: "active" }, { value: "inactive", label: "inactive" }] }
    ]
  },
  wilayah: {
    title: "Referensi Wilayah NTT",
    endpoint: "districts",
    readOnly: true,
    columns: [
      { key: "name", label: "Kecamatan" },
      { key: "regencyName", label: "Kabupaten/Kota" },
      { key: "code", label: "Kode Wilayah" },
      { key: "latitude", label: "Latitude" },
      { key: "longitude", label: "Longitude" }
    ],
    fields: []
  },
  "data-utama": {
    title: "Data Utama Pertanian",
    endpoint: "agriSummaries",
    readOnly: true,
    columns: [
      { key: "regencyName", label: "Kabupaten/Kota" },
      { key: "farmersCount", label: "Petani" },
      { key: "groupsCount", label: "Poktan" },
      { key: "totalAreaHa", label: "Total Area (Ha)" },
      { key: "topCommodity", label: "Komoditas Utama" }
    ],
    fields: []
  }
};
