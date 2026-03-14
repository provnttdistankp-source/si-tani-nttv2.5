import express from "express";
import { readDb } from "../utils/db.js";
import { monthLabel } from "../utils/helpers.js";
import { buildCommodityExplorer } from "../utils/commodityExplorer.js";

const router = express.Router();

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatNumber(value, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits }).format(Number(value || 0));
}

function titleCaseMonthLabel(month) {
  const label = monthLabel(month);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function sum(items, key) {
  return items.reduce((acc, item) => acc + Number(item?.[key] || 0), 0);
}

function buildMapIndex(items, keyFn, valueFn = () => 1) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    map.set(key, (map.get(key) || 0) + Number(valueFn(item) || 0));
  }
  return map;
}

function latestTimestamp(db) {
  const timestamps = [
    ...(db.auditLogs || []).map((item) => item.timestamp),
    ...(db.users || []).map((item) => item.lastLoginAt),
    ...(db.activities || []).map((item) => item.updatedAt || item.createdAt || item.date),
    ...(db.programSummaries || []).map((item) => item.updatedAt || item.createdAt)
  ].filter(Boolean);
  if (!timestamps.length) return null;
  return timestamps.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
}

function commodityNameFromId(db, commodityId) {
  return db.commodities.find((item) => item.id === commodityId)?.name || commodityId || "-";
}

function commodityCategoryFromId(db, commodityId) {
  return db.commodities.find((item) => item.id === commodityId)?.category || "Lainnya";
}

function regencyNameFromCode(db, code) {
  return db.regencies.find((item) => item.code === code)?.name || code || "-";
}

function districtNameFromCode(db, code) {
  return db.districts.find((item) => item.code === code)?.name || code || "-";
}

function uniqueCount(items, selector) {
  return new Set(items.map(selector).filter(Boolean)).size;
}

function categoryTone(category) {
  return {
    "Tanaman Pangan": "emerald",
    Hortikultura: "amber",
    Perkebunan: "teal",
    "Buah Sayuran Tahunan": "amber",
    "Sayuran Buah Semusim": "emerald",
    "Tanaman Biofarmaka": "violet",
    Florikultura: "rose"
  }[category] || "slate";
}

router.get("/stats", async (req, res, next) => {
  try {
    const db = await readDb();
    const { year = "", category = "", regencyCode = "", districtCode = "", commodityId = "", activityStatus = "" } = req.query;

    const production = (db.productionData || []).filter((item) => {
      if (year && String(item.year) !== String(year)) return false;
      if (regencyCode && item.regencyCode !== regencyCode) return false;
      if (districtCode && item.districtCode !== districtCode) return false;
      if (commodityId && item.commodityId !== commodityId) return false;
      if (category && commodityCategoryFromId(db, item.commodityId) !== category) return false;
      return true;
    });

    const farmers = (db.farmers || []).filter((item) => {
      if (regencyCode && item.regencyCode !== regencyCode) return false;
      if (districtCode && item.districtCode !== districtCode) return false;
      if (commodityId) {
        const relatedLand = (db.lands || []).find((land) => land.farmerId === item.id && land.commodityId === commodityId);
        if (!relatedLand) return false;
      }
      return true;
    });

    const farmerGroups = (db.farmerGroups || []).filter((item) => {
      if (regencyCode && item.regencyCode !== regencyCode) return false;
      if (districtCode && item.districtCode !== districtCode) return false;
      if (commodityId && item.mainCommodityId !== commodityId) return false;
      return true;
    });

    const lands = (db.lands || []).filter((item) => {
      if (regencyCode && item.regencyCode !== regencyCode) return false;
      if (districtCode && item.districtCode !== districtCode) return false;
      if (commodityId && item.commodityId !== commodityId) return false;
      return true;
    });

    const activities = (db.activities || []).filter((item) => {
      if (regencyCode && item.regencyCode !== regencyCode) return false;
      if (districtCode && item.districtCode !== districtCode) return false;
      if (commodityId && item.commodityId !== commodityId) return false;
      if (activityStatus && item.status !== activityStatus) return false;
      return true;
    });

    const programSummaries = (db.programSummaries || []).filter((item) => {
      if (year && String(item.year) !== String(year)) return false;
      if (regencyCode && item.regencyCode !== regencyCode) return false;
      if (districtCode && item.districtCode !== districtCode) return false;
      return true;
    });

    const officialStats = (db.officialStats || []).filter((item) => {
      if (year && String(item.year) !== String(year)) return false;
      if (category && item.categoryGroup !== category && item.datasetType !== category) return false;
      if (regencyCode && item.scope === "regency" && item.regencyCode !== regencyCode) return false;
      if (commodityId) {
        const commodityName = commodityNameFromId(db, commodityId);
        if (normalizeText(item.commodityName) !== normalizeText(commodityName)) return false;
      }
      return true;
    });

    const productionTotal = sum(production, "productionTon");
    const totalArea = sum(production, "areaHa");
    const avgProductivity = totalArea ? productionTotal / totalArea : 0;

    const commodityTonMap = buildMapIndex(production, (item) => item.commodityId, (item) => item.productionTon);
    const regencyTonMap = buildMapIndex(production, (item) => item.regencyCode, (item) => item.productionTon);
    const districtGroupMap = buildMapIndex(farmerGroups, (item) => item.districtCode);
    const regencyActivityMap = buildMapIndex(programSummaries, (item) => item.regencyCode);

    const topCommodityEntry = [...commodityTonMap.entries()].sort((a, b) => b[1] - a[1])[0];
    const topRegencyEntry = [...regencyTonMap.entries()].sort((a, b) => b[1] - a[1])[0];
    const topDistrictEntry = [...districtGroupMap.entries()].sort((a, b) => b[1] - a[1])[0];
    const topProgramRegency = [...regencyActivityMap.entries()].sort((a, b) => b[1] - a[1])[0];

    const highlights = [
      {
        id: "hero-production",
        label: "Total produksi terukur",
        value: `${formatNumber(productionTotal, 2)} ton`,
        detail: totalArea ? `${formatNumber(totalArea, 2)} ha area tercatat` : "Berbasis data produksi terintegrasi"
      },
      {
        id: "hero-top-commodity",
        label: "Komoditas dominan",
        value: topCommodityEntry ? commodityNameFromId(db, topCommodityEntry[0]) : "-",
        detail: topCommodityEntry ? `${formatNumber(topCommodityEntry[1], 2)} ton` : "Belum ada catatan"
      },
      {
        id: "hero-top-regency",
        label: "Kabupaten tertinggi",
        value: topRegencyEntry ? regencyNameFromCode(db, topRegencyEntry[0]) : "-",
        detail: topRegencyEntry ? `${formatNumber(topRegencyEntry[1], 2)} ton` : "Belum ada catatan"
      },
      {
        id: "hero-programs",
        label: "Dokumen program resmi",
        value: `${formatNumber(programSummaries.length)} baris`,
        detail: `${formatNumber((db.officialDatasets || []).filter((item) => item.authoritative).length)} file resmi aktif`
      }
    ];

    const kpis = [
      { id: "kpi-farmers", label: "Total Petani", value: farmers.length, hint: "Petani yang cocok dengan filter" },
      { id: "kpi-groups", label: "Kelompok Tani", value: farmerGroups.length, hint: "Poktan aktif pada cakupan terpilih" },
      { id: "kpi-lands", label: "Total Lahan", value: lands.length, hint: "Lahan terhubung dengan petani" },
      { id: "kpi-commodities", label: "Komoditas Resmi", value: uniqueCount(officialStats, (item) => `${item.datasetType}:${item.commodityName}`), hint: "Baris komoditas resmi yang terkurasi" },
      { id: "kpi-activities", label: "Kegiatan Lapangan", value: activities.length, hint: "Aktivitas operasional di aplikasi" },
      { id: "kpi-program-summary", label: "Program 2025", value: programSummaries.length, hint: "Rangkuman dokumen sebaran kegiatan" },
      { id: "kpi-productivity", label: "Rata-rata Produktivitas", value: `${formatNumber(avgProductivity, 2)} ton/ha`, hint: "Dihitung dari produksi terfilter" },
      { id: "kpi-regencies", label: "Wilayah Aktif", value: uniqueCount([...farmers, ...farmerGroups, ...lands, ...activities], (item) => item.regencyCode), hint: "Kabupaten/kota yang memiliki data aktif" }
    ];

    const productionTrend = Object.entries(Object.fromEntries(buildMapIndex(production, (item) => item.month, (item) => item.productionTon)))
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, total]) => ({ month, label: titleCaseMonthLabel(month), total: Number(total.toFixed(2)) }));

    const activityTrend = Object.entries(Object.fromEntries(buildMapIndex(activities, (item) => item.date.slice(0, 7))))
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, total]) => ({ month, label: titleCaseMonthLabel(month), total }));

    const regencyRanking = [...regencyTonMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([code, total]) => ({ regencyCode: code, name: regencyNameFromCode(db, code), total: Number(total.toFixed(2)) }));

    const commodityRanking = [...commodityTonMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, total]) => ({ commodityId: id, name: commodityNameFromId(db, id), total: Number(total.toFixed(2)), category: commodityCategoryFromId(db, id) }));

    const officialTonRanking = officialStats
      .filter((item) => item.scope === "province" && String(item.productionUnit).toLowerCase() === "ton")
      .sort((a, b) => Number(b.productionValue || 0) - Number(a.productionValue || 0))
      .slice(0, 12)
      .map((item) => ({
        id: item.id,
        name: item.commodityName,
        datasetType: item.datasetType,
        categoryGroup: item.categoryGroup,
        value: Number(item.productionValue || 0),
        unit: item.productionUnit
      }));

    const categoryDistribution = Object.entries(Object.fromEntries(buildMapIndex(db.commodities || [], (item) => item.category)))
      .map(([name, total]) => ({ name, total }));

    const officialPanels = Array.from(new Map((officialStats || []).map((item) => [item.datasetId, item.datasetId])).keys())
      .map((datasetId) => {
        const rows = officialStats.filter((item) => item.datasetId === datasetId);
        const dataset = (db.officialDatasets || []).find((item) => item.id === datasetId);
        const topItem = rows
          .filter((item) => Number(item.productionValue || 0) > 0)
          .sort((a, b) => Number(b.productionValue || 0) - Number(a.productionValue || 0))[0];
        return {
          id: datasetId,
          title: dataset?.title || datasetId,
          year: dataset?.year || rows[0]?.year || null,
          categoryGroup: rows[0]?.categoryGroup || dataset?.datasetType || "Statistik Resmi",
          count: rows.length,
          topCommodity: topItem?.commodityName || "-",
          topValue: topItem?.productionValue ?? 0,
          topUnit: topItem?.productionUnit || "",
          description: dataset?.note || "",
          tone: categoryTone(rows[0]?.categoryGroup || dataset?.datasetType)
        };
      })
      .sort((a, b) => a.title.localeCompare(b.title));

    const districtRanking = [...districtGroupMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([code, total]) => ({ districtCode: code, name: districtNameFromCode(db, code), total }));

    const programRanking = [...regencyActivityMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([code, total]) => ({ regencyCode: code, name: regencyNameFromCode(db, code), total }));

    const latestPrograms = programSummaries.slice().sort((a, b) => {
      if (Number(b.year) !== Number(a.year)) return Number(b.year) - Number(a.year);
      return String(a.activityName).localeCompare(String(b.activityName));
    }).slice(0, 8);

    const recentAudit = (db.auditLogs || []).slice().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 6);

    const regencyTable = (db.regencies || []).map((regency) => {
      const prodTotal = regencyTonMap.get(regency.code) || 0;
      const groupCount = farmerGroups.filter((item) => item.regencyCode === regency.code).length;
      const farmerCount = farmers.filter((item) => item.regencyCode === regency.code).length;
      const activityCount = activities.filter((item) => item.regencyCode === regency.code).length;
      const programCount = programSummaries.filter((item) => item.regencyCode === regency.code).length;
      const topCommodityRow = commodityRanking.find((item) => production.some((prod) => prod.regencyCode === regency.code && prod.commodityId === item.commodityId));
      return {
        regencyCode: regency.code,
        regencyName: regency.name,
        mainCommodity: topCommodityRow?.name || "-",
        productionTon: Number(prodTotal.toFixed(2)),
        farmerGroups: groupCount,
        farmers: farmerCount,
        activities: activityCount + programCount,
        statusNote: programCount ? `${programCount} program resmi` : activityCount ? `${activityCount} aktivitas aplikasi` : "Belum ada pembaruan"
      };
    }).sort((a, b) => b.productionTon - a.productionTon).slice(0, 12);

    const insights = [
      {
        id: "insight-regency",
        title: "Wilayah sentra produksi",
        value: topRegencyEntry ? regencyNameFromCode(db, topRegencyEntry[0]) : "-",
        detail: topRegencyEntry ? `${formatNumber(topRegencyEntry[1], 2)} ton pada data produksi terintegrasi` : "Belum ada data"
      },
      {
        id: "insight-commodity",
        title: "Komoditas tonase tertinggi",
        value: officialTonRanking[0]?.name || "-",
        detail: officialTonRanking[0] ? `${formatNumber(officialTonRanking[0].value, 2)} ${officialTonRanking[0].unit} dari ${officialTonRanking[0].datasetType}` : "Belum ada data"
      },
      {
        id: "insight-district",
        title: "Kecamatan dengan poktan terbanyak",
        value: topDistrictEntry ? districtNameFromCode(db, topDistrictEntry[0]) : "-",
        detail: topDistrictEntry ? `${topDistrictEntry[1]} kelompok tani` : "Belum ada data"
      },
      {
        id: "insight-program",
        title: "Wilayah dokumen program terbanyak",
        value: topProgramRegency ? regencyNameFromCode(db, topProgramRegency[0]) : "-",
        detail: topProgramRegency ? `${topProgramRegency[1]} baris program resmi` : "Belum ada dokumen"
      },
      {
        id: "insight-source",
        title: "Sumber data aktif",
        value: `${(db.officialDatasets || []).filter((item) => item.authoritative).length} file resmi`,
        detail: `${(db.templateCatalog || []).length} template impor tersedia` 
      },
      {
        id: "insight-quality",
        title: "Dasar impor berikutnya",
        value: "PDF resmi + template XLSX",
        detail: "PDF diperlakukan sebagai sumber rilis resmi, sedangkan Tabel.xlsx hanya acuan struktur impor."
      }
    ];

    const dataFreshness = {
      lastUpdatedAt: latestTimestamp(db),
      recentAudit,
      latestPrograms,
      latestLogins: (db.users || [])
        .filter((item) => item.lastLoginAt)
        .sort((a, b) => new Date(b.lastLoginAt).getTime() - new Date(a.lastLoginAt).getTime())
        .slice(0, 5)
        .map((item) => ({ name: item.name, email: item.email, role: item.role, lastLoginAt: item.lastLoginAt }))
    };

    return res.json({
      filters: {
        year: year || null,
        category: category || null,
        regencyCode: regencyCode || null,
        districtCode: districtCode || null,
        commodityId: commodityId || null,
        activityStatus: activityStatus || null,
        years: Array.from(new Set([...(db.productionData || []).map((item) => String(item.year)), ...(db.officialStats || []).map((item) => String(item.year)), ...(db.programSummaries || []).map((item) => String(item.year))])).filter(Boolean).sort((a, b) => b.localeCompare(a))
      },
      hero: {
        title: "Dashboard Analitik Pertanian NTT",
        subtitle: "Visualisasi gabungan data produksi, poktan, lahan, program resmi, dan katalog sumber data resmi Nusa Tenggara Timur.",
        lastUpdatedAt: dataFreshness.lastUpdatedAt,
        highlights
      },
      kpis,
      charts: {
        productionTrend,
        activityTrend,
        regencyRanking,
        commodityRanking,
        officialTonRanking,
        categoryDistribution,
        districtRanking,
        programRanking
      },
      officialPanels,
      insights,
      regencyTable,
      dataFreshness,
      sourceCatalog: {
        officialDatasets: (db.officialDatasets || []).slice().sort((a, b) => Number(b.authoritative) - Number(a.authoritative)),
        templateCatalog: db.templateCatalog || []
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get("/commodity-explorer", async (req, res, next) => {
  try {
    const db = await readDb();
    const payload = buildCommodityExplorer(db, req.query || {});
    return res.json(payload);
  } catch (error) {
    next(error);
  }
});

export default router;
