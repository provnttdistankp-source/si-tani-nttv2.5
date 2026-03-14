import express from "express";
import { readDb } from "../utils/db.js";
import { buildCommodityExplorer } from "../utils/commodityExplorer.js";

const router = express.Router();

const agencyInfo = {
  province: "PEMERINTAH PROVINSI NUSA TENGGARA TIMUR",
  office: "DINAS PERTANIAN DAN KETAHANAN PANGAN",
  address: "Jl. Polisi Militer No. 7 Oebobo - Kupang",
  email: "distankptprov.go.id",
  website: "www.distankptnttprov.go.id"
};

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatNumber(value, digits = 2) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: digits }).format(Number(value || 0));
}

function regencyByCode(db, code) {
  return db.regencies.find((item) => item.code === code) || null;
}

function regencyName(db, code) {
  const item = regencyByCode(db, code);
  return item?.fullName || item?.name || code || "Semua wilayah";
}

function districtName(db, code) {
  return db.districts.find((item) => item.code === code)?.name || code || "Semua kecamatan";
}

function commodityById(db, id) {
  return db.commodities.find((item) => item.id === id) || null;
}

function inferAreaMetric(item = {}) {
  const metricPairs = [
    [item.metric1Label, item.metric1Value, item.metric1Unit],
    [item.metric2Label, item.metric2Value, item.metric2Unit],
    [item.metric3Label, item.metric3Value, item.metric3Unit],
    [item.metric4Label, item.metric4Value, item.metric4Unit]
  ];
  const candidates = metricPairs
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([label, value, unit]) => ({
      label,
      value: Number(value || 0),
      unit,
      score: (() => {
        const text = normalizeText(label);
        let score = 0;
        if (text.includes("luas") || text.includes("areal")) score += 5;
        if (text.includes("tanam") || text.includes("panen") || text.includes("produktif") || text.includes("tbm") || text.includes("tm") || text.includes("tt tr")) score += 3;
        if (text.includes("jumlah")) score += 1;
        return score;
      })()
    }))
    .sort((a, b) => b.score - a.score);
  return candidates[0] || { label: "", value: 0, unit: "" };
}

function officialRows(db = {}) {
  return (db.officialStats || []).map((item) => {
    const matchedCommodity = db.commodities.find((commodity) => normalizeText(commodity.name) === normalizeText(item.commodityName));
    const areaMetric = inferAreaMetric(item);
    return {
      source: "officialStats",
      id: item.id,
      commodityId: matchedCommodity?.id || null,
      commodityName: item.commodityName,
      category: matchedCommodity?.category || item.categoryGroup || item.datasetType || "Lainnya",
      regencyCode: item.regencyCode || null,
      regencyName: item.regencyCode ? regencyName(db, item.regencyCode) : (item.regencyName || "Nusa Tenggara Timur"),
      districtCode: null,
      year: Number(item.year || 0),
      productionValue: Number(item.productionValue || 0),
      productionUnit: item.productionUnit || "",
      areaValue: Number(areaMetric.value || 0),
      areaUnit: areaMetric.unit || "",
      productivityValue: Number(item.productivityValue || 0),
      productivityUnit: item.productivityUnit || "",
      sourceLabel: item.sourceDataset || item.datasetType || "Rilis resmi",
      scope: item.scope || (item.regencyCode ? "regency" : "province")
    };
  });
}

function commodityStatRows(db = {}) {
  return (db.commodityStats || []).map((item) => {
    const commodity = commodityById(db, item.commodityId);
    return {
      source: "commodityStats",
      id: item.id,
      commodityId: item.commodityId,
      commodityName: commodity?.name || item.commodityId,
      category: commodity?.category || "Lainnya",
      regencyCode: item.regencyCode,
      regencyName: regencyName(db, item.regencyCode),
      districtCode: null,
      year: Number(item.year || 0),
      productionValue: Number(item.productionTon || 0),
      productionUnit: "ton",
      areaValue: Number(item.areaValue || 0),
      areaUnit: item.areaUnit || "Ha",
      productivityValue: Number(item.productivityValue || 0),
      productivityUnit: item.productivityUnit || "",
      sourceLabel: item.sourceDataset || "Statistik komoditas",
      scope: "regency"
    };
  });
}

function metricConfig(metric = "production") {
  if (metric === "area") return { key: "areaValue", label: "Luas / Areal", unitKey: "areaUnit" };
  if (metric === "productivity") return { key: "productivityValue", label: "Produktivitas", unitKey: "productivityUnit" };
  return { key: "productionValue", label: "Produksi", unitKey: "productionUnit" };
}

function commodityRecords(db, filters = {}) {
  const metric = filters.metric || "production";
  const sourceRows = [...commodityStatRows(db), ...officialRows(db)].filter((row) => row.scope === "regency");
  const selectedCommodity = commodityById(db, filters.commodityId)?.name;

  const rows = sourceRows.filter((row) => {
    if (filters.category && row.category !== filters.category) return false;
    if (filters.regencyCode && row.regencyCode !== filters.regencyCode) return false;
    if (filters.year && Number(row.year) !== Number(filters.year)) return false;
    if (selectedCommodity && normalizeText(row.commodityName) !== normalizeText(selectedCommodity)) return false;
    if (filters.search && !normalizeText(`${row.commodityName} ${row.regencyName} ${row.sourceLabel}`).includes(normalizeText(filters.search))) return false;
    return true;
  });

  const config = metricConfig(metric);
  const units = Array.from(new Set(rows.map((row) => row[config.unitKey]).filter(Boolean)));
  const unitLabel = units.length === 1 ? units[0] : units.length ? "unit campuran" : "";

  return {
    metric,
    metricLabel: config.label,
    metricUnit: unitLabel,
    rows,
    rowsMapped: rows.map((row) => ({
      ...row,
      selectedMetricValue: Number(row[config.key] || 0),
      selectedMetricUnit: row[config.unitKey] || unitLabel || ""
    }))
  };
}

function aggregate(rows, keySelector) {
  const map = new Map();
  for (const row of rows) {
    const key = keySelector(row);
    const current = map.get(key) || [];
    current.push(row);
    map.set(key, current);
  }
  return map;
}

function buildDocumentNumber(type = "UMUM") {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `LAP-SITANI/${type}/${y}${m}${d}/${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
}

function card(label, value, detail = "") {
  return { label, value: String(value ?? "-"), detail };
}

function commodityReport(db, filters, req) {
  const explorer = buildCommodityExplorer(db, {
    category: filters.category || "",
    subcategory: filters.subcategory || "",
    year: filters.year || "",
    regencyCode: filters.regencyCode || "",
    metric: filters.metric || "production",
    search: filters.search || "",
    commodityId: filters.commodityId || ""
  });

  const selectedCommodity = commodityById(db, filters.commodityId);
  const title = selectedCommodity
    ? `Laporan Analisis Komoditas ${selectedCommodity.name}`
    : filters.category
      ? `Laporan Analisis Komoditas ${filters.category}`
      : "Laporan Analisis Komoditas Pertanian";

  const topCommodities = explorer.charts.commodityRanking.slice(0, 10).map((item, index) => ({
    peringkat: index + 1,
    komoditas: item.name,
    kategori: item.category,
    nilai: item.value,
    satuan: explorer.summary.metricUnit
  }));

  const topRegencies = explorer.charts.regencyRanking.slice(0, 10).map((item, index) => ({
    peringkat: index + 1,
    wilayah: item.regencyName,
    nilai: item.value,
    satuan: explorer.summary.metricUnit,
    komoditasUtama: item.topCommodity
  }));

  const executiveSummary = [
    `Laporan ini menyajikan ${explorer.summary.metricLabel.toLowerCase()} komoditas pertanian berdasarkan data resmi yang telah dikurasi ke aplikasi SI Tani NTT.`,
    explorer.summary.topCommodityName !== "-"
      ? `Komoditas dengan nilai tertinggi pada filter aktif adalah ${explorer.summary.topCommodityName} dengan nilai ${formatNumber(explorer.summary.topCommodityValue, 2)} ${explorer.summary.metricUnit}.`
      : "Belum ada komoditas dominan yang dapat disimpulkan pada filter ini.",
    explorer.summary.topRegencyName !== "-"
      ? `Wilayah dengan nilai tertinggi adalah ${explorer.summary.topRegencyName} dengan nilai ${formatNumber(explorer.summary.topRegencyValue, 2)} ${explorer.summary.metricUnit}.`
      : "Belum ada wilayah dominan yang dapat disimpulkan pada filter ini.",
    explorer.sourceNotes.officialOnly
  ];

  return {
    meta: {
      type: "commodity",
      typeLabel: "Laporan Komoditas",
      title,
      documentNumber: buildDocumentNumber("KOM"),
      generatedAt: new Date().toISOString(),
      generatedBy: req.user?.name || "Pengguna",
      generatedByEmail: req.user?.email || "-",
      agency: agencyInfo
    },
    filters: {
      wilayah: filters.regencyCode ? regencyName(db, filters.regencyCode) : "Semua kabupaten/kota",
      tahun: filters.year || "Semua tahun",
      kategori: filters.category || "Semua kategori",
      komoditas: selectedCommodity?.name || "Semua komoditas",
      indikator: explorer.summary.metricLabel
    },
    summaryCards: [
      card("Jumlah komoditas", explorer.summary.commodityCount, "Komoditas yang masuk pada filter aktif"),
      card(`Total ${explorer.summary.metricLabel.toLowerCase()}`, explorer.summary.totalValueDisplay, "Akumulasi nilai indikator yang dipilih"),
      card("Wilayah terdata", explorer.summary.regencyCount, "Kabupaten/kota yang memiliki data"),
      card("Dataset aktif", explorer.summary.datasetCount, "Subkategori atau jenis rilis resmi yang aktif")
    ],
    executiveSummary,
    tables: [
      {
        title: "Tabel utama komoditas",
        columns: [
          { key: "komoditas", label: "Komoditas" },
          { key: "kategori", label: "Kategori" },
          { key: "wilayah", label: "Kabupaten/Kota" },
          { key: "tahun", label: "Tahun" },
          { key: "indikator", label: explorer.summary.metricLabel },
          { key: "satuan", label: "Satuan" },
          { key: "sumber", label: "Sumber Data" }
        ],
        rows: explorer.table.slice(0, 120).map((row) => ({
          komoditas: row.commodityName,
          kategori: row.category,
          wilayah: row.regencyName,
          tahun: row.year,
          indikator: formatNumber(row.selectedMetricValue, 2),
          satuan: row.selectedMetricUnit,
          sumber: row.sourceLabel
        }))
      },
      {
        title: "Peringkat komoditas",
        columns: [
          { key: "peringkat", label: "No" },
          { key: "komoditas", label: "Komoditas" },
          { key: "kategori", label: "Kategori" },
          { key: "nilai", label: explorer.summary.metricLabel },
          { key: "satuan", label: "Satuan" }
        ],
        rows: topCommodities
      },
      {
        title: "Peringkat wilayah",
        columns: [
          { key: "peringkat", label: "No" },
          { key: "wilayah", label: "Kabupaten/Kota" },
          { key: "nilai", label: explorer.summary.metricLabel },
          { key: "satuan", label: "Satuan" },
          { key: "komoditasUtama", label: "Komoditas Utama" }
        ],
        rows: topRegencies
      }
    ],
    notes: [
      "Seluruh nilai pada laporan ini berasal dari data resmi yang telah diintegrasikan ke aplikasi. Template spreadsheet hanya digunakan sebagai acuan struktur impor, bukan sebagai sumber angka.",
      `Indikator aktif pada laporan ini adalah ${explorer.summary.metricLabel.toLowerCase()} dengan satuan ${explorer.summary.metricUnit || "mengikuti sumber data"}.`,
      explorer.summary.coverageNote
    ]
  };
}

function regionReport(db, filters, req) {
  const regencyCode = filters.regencyCode || db.regencies[0]?.code;
  const explorer = buildCommodityExplorer(db, {
    category: filters.category || "",
    year: filters.year || "",
    regencyCode: regencyCode || "",
    metric: filters.metric || "production",
    commodityId: filters.commodityId || ""
  });

  const groups = (db.farmerGroups || []).filter((item) => item.regencyCode === regencyCode);
  const farmers = (db.farmers || []).filter((item) => item.regencyCode === regencyCode);
  const lands = (db.lands || []).filter((item) => item.regencyCode === regencyCode);
  const activities = (db.activities || []).filter((item) => item.regencyCode === regencyCode && (!filters.activityStatus || item.status === filters.activityStatus));
  const agriSummary = (db.agriSummaries || []).find((item) => item.regencyCode === regencyCode);

  const groupsByCommodity = aggregate(groups, (item) => commodityById(db, item.mainCommodityId)?.name || "Belum diisi");
  const groupCommodityRows = [...groupsByCommodity.entries()].map(([name, rows]) => ({ komoditas: name, kelompokTani: rows.length, anggota: rows.reduce((sum, row) => sum + Number(row.membersCount || 0), 0) })).sort((a, b) => b.kelompokTani - a.kelompokTani);

  const executiveSummary = [
    `Laporan wilayah ini memotret kondisi pertanian pada ${regencyName(db, regencyCode)} dengan memadukan statistik komoditas, kelompok tani, petani, lahan, dan kegiatan lapangan.`,
    explorer.summary.topCommodityName !== "-" ? `Komoditas dominan pada filter aktif adalah ${explorer.summary.topCommodityName}.` : "Belum ada komoditas dominan yang dapat dibaca dari filter aktif.",
    agriSummary?.topCommodity ? `Ringkasan wilayah aplikasi juga menunjukkan komoditas utama daerah adalah ${agriSummary.topCommodity}.` : "Ringkasan komoditas utama wilayah belum tersedia pada profil wilayah.",
    activities.length ? `Terdapat ${activities.length} kegiatan pertanian yang tercatat pada wilayah ini.` : "Belum ada kegiatan pertanian yang tercatat pada wilayah ini untuk filter aktif."
  ];

  return {
    meta: {
      type: "region",
      typeLabel: "Laporan Wilayah",
      title: `Laporan Wilayah ${regencyName(db, regencyCode)}`,
      documentNumber: buildDocumentNumber("WIL"),
      generatedAt: new Date().toISOString(),
      generatedBy: req.user?.name || "Pengguna",
      generatedByEmail: req.user?.email || "-",
      agency: agencyInfo
    },
    filters: {
      wilayah: regencyName(db, regencyCode),
      tahun: filters.year || "Semua tahun",
      kategori: filters.category || "Semua kategori",
      komoditas: commodityById(db, filters.commodityId)?.name || "Semua komoditas",
      indikator: explorer.summary.metricLabel
    },
    summaryCards: [
      card("Total petani", farmers.length, "Petani terdaftar pada wilayah ini"),
      card("Total kelompok tani", groups.length, "Kelompok tani terdata"),
      card("Total lahan", lands.length, "Unit lahan yang telah tercatat"),
      card("Total kegiatan", activities.length, "Kegiatan lapangan yang relevan"),
      card("Komoditas aktif", explorer.summary.commodityCount, "Komoditas dengan data pada filter aktif"),
      card(`Total ${explorer.summary.metricLabel.toLowerCase()}`, explorer.summary.totalValueDisplay, "Akumulasi indikator pada wilayah ini")
    ],
    executiveSummary,
    tables: [
      {
        title: "Profil komoditas wilayah",
        columns: [
          { key: "komoditas", label: "Komoditas" },
          { key: "kategori", label: "Kategori" },
          { key: "tahun", label: "Tahun" },
          { key: "nilai", label: explorer.summary.metricLabel },
          { key: "satuan", label: "Satuan" },
          { key: "sumber", label: "Sumber" }
        ],
        rows: explorer.table.slice(0, 80).map((row) => ({
          komoditas: row.commodityName,
          kategori: row.category,
          tahun: row.year,
          nilai: formatNumber(row.selectedMetricValue, 2),
          satuan: row.selectedMetricUnit,
          sumber: row.sourceLabel
        }))
      },
      {
        title: "Komoditas dominan pada kelompok tani",
        columns: [
          { key: "komoditas", label: "Komoditas" },
          { key: "kelompokTani", label: "Jumlah Poktan" },
          { key: "anggota", label: "Perkiraan Anggota" }
        ],
        rows: groupCommodityRows.slice(0, 20)
      },
      {
        title: "Kegiatan pertanian wilayah",
        columns: [
          { key: "tanggal", label: "Tanggal" },
          { key: "kegiatan", label: "Kegiatan" },
          { key: "jenis", label: "Jenis" },
          { key: "poktan", label: "Kelompok Tani" },
          { key: "status", label: "Status" }
        ],
        rows: activities.slice(0, 40).map((item) => ({
          tanggal: item.date,
          kegiatan: item.name,
          jenis: item.type,
          poktan: db.farmerGroups.find((row) => row.id === item.farmerGroupId)?.name || "-",
          status: item.status
        }))
      }
    ],
    notes: [
      agriSummary ? `Profil wilayah aplikasi mencatat total area ${formatNumber(agriSummary.totalAreaHa, 2)} ha dengan area irigasi ${formatNumber(agriSummary.irrigatedAreaHa, 2)} ha dan area lahan kering ${formatNumber(agriSummary.drylandAreaHa, 2)} ha.` : "Profil wilayah detail belum tersedia pada basis ringkasan pertanian daerah.",
      "Nama wilayah pada laporan ini menggunakan label penuh kabupaten/kota agar tidak tertukar, termasuk untuk Kabupaten Kupang dan Kota Kupang.",
      "Output laporan wilayah dapat digunakan sebagai dasar monitoring daerah, bahan rapat pimpinan, dan dokumen evaluasi program."
    ]
  };
}

function groupReport(db, filters, req) {
  let groups = (db.farmerGroups || []).slice();
  if (filters.regencyCode) groups = groups.filter((item) => item.regencyCode === filters.regencyCode);
  if (filters.districtCode) groups = groups.filter((item) => item.districtCode === filters.districtCode);
  if (filters.farmerGroupId) groups = groups.filter((item) => item.id === filters.farmerGroupId);
  if (filters.commodityId) groups = groups.filter((item) => item.mainCommodityId === filters.commodityId);

  const farmerCount = groups.reduce((sum, group) => sum + (db.farmers || []).filter((item) => item.farmerGroupId === group.id).length, 0);
  const activityCount = groups.reduce((sum, group) => sum + (db.activities || []).filter((item) => item.farmerGroupId === group.id).length, 0);
  const totalMembers = groups.reduce((sum, item) => sum + Number(item.membersCount || 0), 0);
  const commodityAgg = aggregate(groups, (item) => commodityById(db, item.mainCommodityId)?.name || "Belum diisi");
  const topCommodityEntry = [...commodityAgg.entries()].sort((a, b) => b[1].length - a[1].length)[0];

  return {
    meta: {
      type: "group",
      typeLabel: "Laporan Kelompok Tani",
      title: filters.farmerGroupId ? `Laporan Kelompok Tani ${groups[0]?.name || "-"}` : "Laporan Kelompok Tani",
      documentNumber: buildDocumentNumber("PKT"),
      generatedAt: new Date().toISOString(),
      generatedBy: req.user?.name || "Pengguna",
      generatedByEmail: req.user?.email || "-",
      agency: agencyInfo
    },
    filters: {
      wilayah: filters.regencyCode ? regencyName(db, filters.regencyCode) : "Semua kabupaten/kota",
      kecamatan: filters.districtCode ? districtName(db, filters.districtCode) : "Semua kecamatan",
      kelompokTani: filters.farmerGroupId ? groups[0]?.name || "-" : "Semua kelompok tani",
      komoditas: commodityById(db, filters.commodityId)?.name || "Semua komoditas"
    },
    summaryCards: [
      card("Kelompok tani", groups.length, "Poktan yang masuk pada filter aktif"),
      card("Total anggota", totalMembers, "Akumulasi anggota yang tercatat"),
      card("Petani terkait", farmerCount, "Petani yang terhubung ke poktan"),
      card("Kegiatan terkait", activityCount, "Kegiatan yang melibatkan poktan aktif")
    ],
    executiveSummary: [
      `Laporan ini menampilkan profil kelompok tani berdasarkan wilayah, komoditas utama, ketua, anggota, dan keterkaitannya dengan petani serta kegiatan pertanian.`,
      topCommodityEntry ? `Komoditas utama yang paling banyak muncul pada poktan terfilter adalah ${topCommodityEntry[0]}.` : "Belum ada komoditas dominan yang dapat dibaca dari data kelompok tani.",
      "NIK Ketua Poktan diperlakukan sebagai identitas unik agar tidak terjadi duplikasi pada pendataan bantuan dan verifikasi administrasi."
    ],
    tables: [
      {
        title: "Daftar kelompok tani",
        columns: [
          { key: "nama", label: "Kelompok Tani" },
          { key: "ketua", label: "Ketua" },
          { key: "nikKetua", label: "NIK Ketua" },
          { key: "wilayah", label: "Wilayah" },
          { key: "komoditas", label: "Komoditas Utama" },
          { key: "anggota", label: "Anggota" },
          { key: "status", label: "Status" }
        ],
        rows: groups.map((item) => ({
          nama: item.name,
          ketua: item.chairman,
          nikKetua: item.chairmanNik,
          wilayah: `${regencyName(db, item.regencyCode)} / ${districtName(db, item.districtCode)}`,
          komoditas: commodityById(db, item.mainCommodityId)?.name || "-",
          anggota: item.membersCount,
          status: item.status
        }))
      }
    ],
    notes: [
      "Apabila laporan ini dipakai untuk verifikasi bantuan, pastikan NIK Ketua Poktan, wilayah, dan komoditas utama telah diverifikasi dengan dokumen lapangan.",
      "Lokasi koordinat kelompok tani dapat dilihat lebih lanjut pada modul peta interaktif aplikasi."
    ]
  };
}

function activityReport(db, filters, req) {
  let activities = (db.activities || []).slice();
  if (filters.regencyCode) activities = activities.filter((item) => item.regencyCode === filters.regencyCode);
  if (filters.districtCode) activities = activities.filter((item) => item.districtCode === filters.districtCode);
  if (filters.commodityId) activities = activities.filter((item) => item.commodityId === filters.commodityId);
  if (filters.activityStatus) activities = activities.filter((item) => item.status === filters.activityStatus);
  if (filters.year) activities = activities.filter((item) => String(item.date || "").startsWith(String(filters.year)));
  if (filters.farmerGroupId) activities = activities.filter((item) => item.farmerGroupId === filters.farmerGroupId);

  const byType = aggregate(activities, (item) => item.type);
  const byStatus = aggregate(activities, (item) => item.status);
  const byTypeRows = [...byType.entries()].map(([jenis, rows]) => ({ jenis, jumlah: rows.length })).sort((a, b) => b.jumlah - a.jumlah);
  const byStatusRows = [...byStatus.entries()].map(([status, rows]) => ({ status, jumlah: rows.length })).sort((a, b) => b.jumlah - a.jumlah);

  return {
    meta: {
      type: "activity",
      typeLabel: "Laporan Kegiatan Pertanian",
      title: "Laporan Kegiatan Pertanian",
      documentNumber: buildDocumentNumber("KGT"),
      generatedAt: new Date().toISOString(),
      generatedBy: req.user?.name || "Pengguna",
      generatedByEmail: req.user?.email || "-",
      agency: agencyInfo
    },
    filters: {
      wilayah: filters.regencyCode ? regencyName(db, filters.regencyCode) : "Semua kabupaten/kota",
      kecamatan: filters.districtCode ? districtName(db, filters.districtCode) : "Semua kecamatan",
      komoditas: commodityById(db, filters.commodityId)?.name || "Semua komoditas",
      status: filters.activityStatus || "Semua status",
      tahun: filters.year || "Semua tahun"
    },
    summaryCards: [
      card("Total kegiatan", activities.length, "Kegiatan yang sesuai filter aktif"),
      card("Jenis kegiatan", byTypeRows.length, "Ragam jenis kegiatan yang muncul"),
      card("Status dominan", byStatusRows[0]?.status || "-", byStatusRows[0] ? `${byStatusRows[0].jumlah} kegiatan` : "Belum ada data"),
      card("Poktan terlibat", new Set(activities.map((item) => item.farmerGroupId).filter(Boolean)).size, "Kelompok tani yang terlibat")
    ],
    executiveSummary: [
      "Laporan ini menampilkan pelaksanaan kegiatan pertanian beserta sebaran jenis, wilayah, kelompok tani terkait, komoditas, dan status pelaksanaan.",
      byTypeRows[0] ? `Jenis kegiatan yang paling sering muncul adalah ${byTypeRows[0].jenis}.` : "Belum ada jenis kegiatan dominan yang dapat disimpulkan.",
      byStatusRows[0] ? `Status kegiatan yang paling banyak adalah ${byStatusRows[0].status}.` : "Belum ada status kegiatan dominan yang dapat disimpulkan."
    ],
    tables: [
      {
        title: "Daftar kegiatan pertanian",
        columns: [
          { key: "tanggal", label: "Tanggal" },
          { key: "nama", label: "Kegiatan" },
          { key: "jenis", label: "Jenis" },
          { key: "wilayah", label: "Wilayah" },
          { key: "poktan", label: "Kelompok Tani" },
          { key: "komoditas", label: "Komoditas" },
          { key: "status", label: "Status" }
        ],
        rows: activities.map((item) => ({
          tanggal: item.date,
          nama: item.name,
          jenis: item.type,
          wilayah: `${regencyName(db, item.regencyCode)} / ${districtName(db, item.districtCode)}`,
          poktan: db.farmerGroups.find((row) => row.id === item.farmerGroupId)?.name || "-",
          komoditas: commodityById(db, item.commodityId)?.name || "-",
          status: item.status
        }))
      },
      {
        title: "Rekap jenis kegiatan",
        columns: [
          { key: "jenis", label: "Jenis Kegiatan" },
          { key: "jumlah", label: "Jumlah" }
        ],
        rows: byTypeRows
      }
    ],
    notes: [
      "Status kegiatan dan penanggung jawab pada laporan ini mengikuti data operasional aplikasi saat dokumen dihasilkan.",
      "Dokumentasi lapangan dan detail lokasi dapat ditelusuri lebih lanjut melalui modul peta interaktif."
    ]
  };
}

router.get("/summary", async (req, res, next) => {
  try {
    const db = await readDb();
    const reportType = String(req.query.reportType || "commodity");
    const filters = {
      reportType,
      regencyCode: req.query.regencyCode || "",
      districtCode: req.query.districtCode || "",
      commodityId: req.query.commodityId || "",
      year: req.query.year || "",
      category: req.query.category || "",
      subcategory: req.query.subcategory || "",
      metric: req.query.metric || "production",
      activityStatus: req.query.activityStatus || "",
      farmerGroupId: req.query.farmerGroupId || "",
      search: req.query.search || ""
    };

    let payload;
    if (reportType === "region") payload = regionReport(db, filters, req);
    else if (reportType === "group") payload = groupReport(db, filters, req);
    else if (reportType === "activity") payload = activityReport(db, filters, req);
    else payload = commodityReport(db, filters, req);

    return res.json(payload);
  } catch (error) {
    next(error);
  }
});

export default router;
