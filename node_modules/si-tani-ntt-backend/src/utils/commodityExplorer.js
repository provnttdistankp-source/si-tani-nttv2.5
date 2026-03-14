function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatNumber(value, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits }).format(Number(value || 0));
}

function regencyNameFromCode(db, code) {
  const regency = db.regencies.find((item) => item.code === code);
  return regency?.fullName || regency?.name || code || "-";
}

function commodityById(db, id) {
  return db.commodities.find((item) => item.id === id);
}

function commodityByName(db, name) {
  const normalized = normalizeText(name);
  return db.commodities.find((item) => normalizeText(item.name) === normalized);
}

function majorCategoryFromDataset(datasetType, categoryGroup, commodityCategory) {
  if (commodityCategory) return commodityCategory;
  const token = `${datasetType || ""} ${categoryGroup || ""}`.toLowerCase();
  if (token.includes("tanaman pangan")) return "Tanaman Pangan";
  if (token.includes("perkebunan")) return "Perkebunan";
  if (["bst", "sbs", "tbf", "th"].includes(String(datasetType || "").toLowerCase())) return "Hortikultura";
  if (token.includes("buah") || token.includes("sayuran") || token.includes("horti") || token.includes("biofarmaka") || token.includes("florikultura")) return "Hortikultura";
  return "Lainnya";
}

function datasetLabel(datasetType, categoryGroup) {
  const token = String(datasetType || "").toUpperCase();
  if (token === "BST") return "Buah Sayuran Tahunan";
  if (token === "SBS") return "Sayuran Buah Semusim";
  if (token === "TBF") return "Tanaman Biofarmaka";
  if (token === "TH") return "Florikultura";
  return categoryGroup || datasetType || "Lainnya";
}


function inferSubcategoryFromSource(sourceDataset, category) {
  const source = String(sourceDataset || "").toLowerCase();
  if (source.includes("bst")) return "Buah Sayuran Tahunan";
  if (source.includes("atap buah") || source.includes("buah 2022")) return "Buah Tahunan";
  if (source.includes("sbs")) return "Sayuran Buah Semusim";
  if (source.includes("tbf")) return "Tanaman Biofarmaka";
  if (source.includes("th")) return "Florikultura";
  if (source.includes("tanaman pangan") || source.includes("padi") || source.includes("jagung") || source.includes("ubi") || source.includes("kacang") || source.includes("sorgum")) return "Tanaman Pangan";
  return category || "Lainnya";
}

function inferAreaFromOfficial(item) {
  const candidates = [
    [item.metric4Label, item.metric4Value, item.metric4Unit],
    [item.metric3Label, item.metric3Value, item.metric3Unit],
    [item.metric2Label, item.metric2Value, item.metric2Unit],
    [item.metric1Label, item.metric1Value, item.metric1Unit]
  ];
  const scored = candidates
    .filter((candidate) => candidate[1] !== null && candidate[1] !== undefined && candidate[1] !== "")
    .map(([label, value, unit]) => {
      const text = normalizeText(label);
      let score = 0;
      if (text.includes("luas") || text.includes("areal") || text.includes("jumlah")) score += 3;
      if (text.includes("tanam") || text.includes("panen") || text.includes("produktif") || text.includes("tbm") || text.includes("tm") || text.includes("tt tr")) score += 2;
      return { label, value: Number(value || 0), unit, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0] || { label: null, value: null, unit: null };
}

function mapCommodityStatsToRows(db) {
  return (db.commodityStats || []).map((item) => {
    const commodity = commodityById(db, item.commodityId);
    return {
      id: `cst:${item.id}`,
      sourceKind: "commodityStats",
      sourceLabel: item.sourceDataset || "Statistik komoditas terintegrasi",
      sourceInstitution: item.sourceInstitution || "-",
      datasetType: commodity?.category || "Statistik Komoditas",
      datasetLabel: commodity?.category || "Statistik Komoditas",
      category: commodity?.category || "Lainnya",
      subcategory: inferSubcategoryFromSource(item.sourceDataset, commodity?.category || "Lainnya"),
      commodityId: item.commodityId,
      commodityName: commodity?.name || item.commodityId,
      regencyCode: item.regencyCode,
      regencyName: regencyNameFromCode(db, item.regencyCode),
      year: Number(item.year || 0),
      productionValue: Number(item.productionTon || 0),
      productionUnit: "ton",
      areaValue: Number(item.areaValue || 0),
      areaUnit: item.areaUnit || "Ha",
      productivityValue: Number(item.productivityValue || 0),
      productivityUnit: item.productivityUnit || "",
      scope: "regency",
      isOfficial: true,
      qualityLabel: item.sourceDataset ? "Resmi terkurasi" : "Perlu verifikasi"
    };
  });
}

function mapOfficialStatsToRows(db) {
  return (db.officialStats || []).map((item) => {
    const commodity = commodityByName(db, item.commodityName);
    const inferredArea = inferAreaFromOfficial(item);
    return {
      id: `ofs:${item.id}`,
      sourceKind: "officialStats",
      sourceLabel: item.sourceDataset || item.datasetType || "Statistik resmi",
      sourceInstitution: item.sourceInstitution || "-",
      datasetType: item.datasetType,
      datasetLabel: datasetLabel(item.datasetType, item.categoryGroup),
      category: majorCategoryFromDataset(item.datasetType, item.categoryGroup, commodity?.category),
      subcategory: datasetLabel(item.datasetType, item.categoryGroup),
      commodityId: commodity?.id || null,
      commodityName: item.commodityName,
      regencyCode: item.regencyCode || null,
      regencyName: item.regencyCode ? regencyNameFromCode(db, item.regencyCode) : (item.regencyName || "Nusa Tenggara Timur"),
      year: Number(item.year || 0),
      productionValue: Number(item.productionValue || 0),
      productionUnit: item.productionUnit || "",
      areaValue: inferredArea.value,
      areaUnit: inferredArea.unit || "",
      areaLabel: inferredArea.label || "",
      productivityValue: Number(item.productivityValue || 0),
      productivityUnit: item.productivityUnit || "",
      scope: item.scope || (item.regencyCode ? "regency" : "province"),
      isOfficial: item.isOfficial !== false,
      qualityLabel: item.isOfficial === false ? "Impor manual" : "Rilis resmi"
    };
  });
}

function metricValue(row, metric) {
  if (metric === "area") return Number(row.areaValue || 0);
  if (metric === "productivity") return Number(row.productivityValue || 0);
  return Number(row.productionValue || 0);
}

function metricUnit(row, metric) {
  if (metric === "area") return row.areaUnit || "";
  if (metric === "productivity") return row.productivityUnit || "";
  return row.productionUnit || "";
}

function metricLabel(metric) {
  if (metric === "area") return "Luas / Areal";
  if (metric === "productivity") return "Produktivitas";
  return "Produksi";
}

function unitConsistency(rows, metric) {
  const units = Array.from(new Set(rows.map((row) => metricUnit(row, metric)).filter(Boolean)));
  return {
    units,
    isMixed: units.length > 1,
    label: units.length === 1 ? units[0] : units.length ? "unit campuran" : "-"
  };
}

function aggregateBy(rows, key, metric) {
  const map = new Map();
  for (const row of rows) {
    const current = map.get(key(row)) || { total: 0, rows: [] };
    current.total += metricValue(row, metric);
    current.rows.push(row);
    map.set(key(row), current);
  }
  return map;
}

export function buildCommodityExplorer(db, filters = {}) {
  const {
    category = "",
    subcategory = "",
    year = "",
    regencyCode = "",
    metric = "production",
    search = "",
    commodityId = "",
    sortBy = "value"
  } = filters;

  const sourceRows = [...mapCommodityStatsToRows(db), ...mapOfficialStatsToRows(db)];
  const years = Array.from(new Set(sourceRows.map((item) => item.year).filter(Boolean))).sort((a, b) => b - a);
  const datasetTypes = Array.from(new Set(sourceRows.map((item) => item.subcategory).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const categories = ["Tanaman Pangan", "Hortikultura", "Perkebunan"];

  const normalizedSearch = normalizeText(search);
  const selectedCommodityName = commodityId ? commodityById(db, commodityId)?.name : "";

  let rows = sourceRows.filter((row) => {
    if (category && row.category !== category) return false;
    if (subcategory && row.subcategory !== subcategory) return false;
    if (year && Number(row.year) !== Number(year)) return false;
    if (regencyCode && row.regencyCode !== regencyCode) return false;
    if (commodityId && normalizeText(row.commodityName) !== normalizeText(selectedCommodityName)) return false;
    if (normalizedSearch && !normalizeText(`${row.commodityName} ${row.regencyName} ${row.sourceLabel}`).includes(normalizedSearch)) return false;
    if (row.scope !== "regency") return false;
    return true;
  });

  if (!rows.length && !year && years.length) {
    const latestYear = years[0];
    rows = sourceRows.filter((row) => {
      if (category && row.category !== category) return false;
      if (subcategory && row.subcategory !== subcategory) return false;
      if (regencyCode && row.regencyCode !== regencyCode) return false;
      if (commodityId && normalizeText(row.commodityName) !== normalizeText(selectedCommodityName)) return false;
      if (normalizedSearch && !normalizeText(`${row.commodityName} ${row.regencyName} ${row.sourceLabel}`).includes(normalizedSearch)) return false;
      return row.scope === "regency" && Number(row.year) === Number(latestYear);
    });
  }

  const consistency = unitConsistency(rows, metric);
  const totalValue = rows.reduce((sum, row) => sum + metricValue(row, metric), 0);

  const byCommodity = aggregateBy(rows, (row) => row.commodityName, metric);
  const commodityRanking = [...byCommodity.entries()]
    .map(([name, bundle]) => ({
      name,
      value: Number(bundle.total.toFixed(2)),
      category: bundle.rows[0]?.category || "-",
      subcategory: bundle.rows[0]?.subcategory || "-",
      unit: consistency.label,
      records: bundle.rows.length,
      sourceLabel: bundle.rows[0]?.sourceLabel || "-"
    }))
    .sort((a, b) => b.value - a.value);

  const byRegency = aggregateBy(rows, (row) => row.regencyCode, metric);
  const regencyRanking = [...byRegency.entries()]
    .map(([code, bundle]) => {
      const topCommodity = bundle.rows.slice().sort((a, b) => metricValue(b, metric) - metricValue(a, metric))[0];
      return {
        regencyCode: code,
        regencyName: regencyNameFromCode(db, code),
        value: Number(bundle.total.toFixed(2)),
        unit: consistency.label,
        topCommodity: topCommodity?.commodityName || "-",
        coverage: bundle.rows.length,
        datasets: Array.from(new Set(bundle.rows.map((row) => row.subcategory).filter(Boolean))),
        rows: bundle.rows
      };
    })
    .sort((a, b) => b.value - a.value);

  const regencyMap = db.regencies.map((regency) => {
    const existing = regencyRanking.find((item) => item.regencyCode === regency.code);
    return {
      regencyCode: regency.code,
      regencyName: regency.name,
      regencyFullName: regency.fullName || regency.name,
      latitude: regency.latitude,
      longitude: regency.longitude,
      value: existing?.value || 0,
      unit: consistency.label,
      hasData: Boolean(existing),
      topCommodity: existing?.topCommodity || "-",
      coverage: existing?.coverage || 0,
      datasets: existing?.datasets || []
    };
  });

  const selectedRegency = regencyCode ? regencyRanking.find((item) => item.regencyCode === regencyCode) : regencyRanking[0] || null;
  const regionDetailRows = selectedRegency ? selectedRegency.rows.slice().sort((a, b) => metricValue(b, metric) - metricValue(a, metric)).slice(0, 8) : [];

  const subcategoryBreakdown = Array.from(rows.reduce((map, row) => {
    const key = row.subcategory || row.category;
    map.set(key, (map.get(key) || 0) + metricValue(row, metric));
    return map;
  }, new Map()).entries()).map(([name, value]) => ({ name, value: Number(value.toFixed(2)) })).sort((a, b) => b.value - a.value);

  const yearTrend = Array.from(sourceRows.filter((row) => {
    if (category && row.category !== category) return false;
    if (subcategory && row.subcategory !== subcategory) return false;
    if (regencyCode && row.regencyCode !== regencyCode) return false;
    if (commodityId && normalizeText(row.commodityName) !== normalizeText(selectedCommodityName)) return false;
    return row.scope === "regency";
  }).reduce((map, row) => {
    map.set(row.year, (map.get(row.year) || 0) + metricValue(row, metric));
    return map;
  }, new Map()).entries()).map(([yearValue, value]) => ({ year: Number(yearValue), value: Number(value.toFixed(2)) })).sort((a, b) => a.year - b.year);

  const tableRows = rows.slice().sort((a, b) => {
    if (sortBy === "commodity") return a.commodityName.localeCompare(b.commodityName);
    if (sortBy === "regency") return a.regencyName.localeCompare(b.regencyName);
    if (sortBy === "year") return b.year - a.year;
    return metricValue(b, metric) - metricValue(a, metric);
  }).map((row) => ({
    id: row.id,
    commodityName: row.commodityName,
    category: row.category,
    subcategory: row.subcategory,
    regencyCode: row.regencyCode,
    regencyName: row.regencyName,
    year: row.year,
    productionValue: row.productionValue,
    productionUnit: row.productionUnit,
    areaValue: row.areaValue,
    areaUnit: row.areaUnit,
    productivityValue: row.productivityValue,
    productivityUnit: row.productivityUnit,
    sourceLabel: row.sourceLabel,
    sourceInstitution: row.sourceInstitution,
    qualityLabel: row.qualityLabel,
    selectedMetricValue: metricValue(row, metric),
    selectedMetricUnit: metricUnit(row, metric),
    isOfficial: row.isOfficial
  }));

  const topCommodity = commodityRanking[0] || null;
  const topRegency = regencyRanking[0] || null;
  const totalDatasets = new Set(rows.map((row) => row.subcategory)).size;

  const availableRegencyCodes = new Set(regencyMap.filter((item) => item.hasData).map((item) => item.regencyCode));
  const missingPolygons = db.regencies
    .filter((item) => !["53.21"].includes(item.code))
    .filter((item) => !availableRegencyCodes.has(item.code) && rows.some((row) => row.regencyCode === item.code))
    .map((item) => item.name);

  return {
    filters: {
      categories,
      subcategories: datasetTypes,
      years,
      metrics: [
        { value: "production", label: "Produksi" },
        { value: "area", label: "Luas / Areal" },
        { value: "productivity", label: "Produktivitas" }
      ],
      selected: {
        category: category || "",
        subcategory: subcategory || "",
        year: year || (rows[0]?.year || years[0] || ""),
        regencyCode: regencyCode || "",
        metric,
        search,
        commodityId: commodityId || ""
      }
    },
    summary: {
      totalRows: rows.length,
      commodityCount: new Set(rows.map((row) => row.commodityName)).size,
      regencyCount: new Set(rows.map((row) => row.regencyCode).filter(Boolean)).size,
      datasetCount: totalDatasets,
      metricLabel: metricLabel(metric),
      metricUnit: consistency.label,
      isMixedUnit: consistency.isMixed,
      totalValue: Number(totalValue.toFixed(2)),
      totalValueDisplay: `${formatNumber(totalValue, 2)} ${consistency.label}`.trim(),
      topCommodityName: topCommodity?.name || "-",
      topCommodityValue: topCommodity?.value || 0,
      topRegencyName: topRegency?.regencyName || "-",
      topRegencyValue: topRegency?.value || 0,
      coverageNote: category === "Perkebunan" ? "Cakupan perkebunan saat ini masih parsial dan paling kuat pada dataset resmi kabupaten yang sudah tersedia." : "Peta dan statistik memakai data resmi yang sudah terkurasi ke level kabupaten/kota.",
      missingPolygonNames: missingPolygons
    },
    charts: {
      commodityRanking: commodityRanking.slice(0, 12),
      regencyRanking: regencyRanking.slice(0, 12),
      subcategoryBreakdown: subcategoryBreakdown.slice(0, 8),
      yearTrend
    },
    map: {
      metric,
      metricLabel: metricLabel(metric),
      unitLabel: consistency.label,
      regencies: regencyMap,
      maxValue: Math.max(...regencyMap.map((item) => item.value), 0),
      selectedRegencyCode: selectedRegency?.regencyCode || null
    },
    regionDetail: selectedRegency ? {
      regencyCode: selectedRegency.regencyCode,
      regencyName: selectedRegency.regencyName,
      totalValue: selectedRegency.value,
      unitLabel: consistency.label,
      topCommodity: selectedRegency.topCommodity,
      coverage: selectedRegency.coverage,
      datasets: selectedRegency.datasets,
      rows: regionDetailRows.map((row) => ({
        commodityName: row.commodityName,
        subcategory: row.subcategory,
        year: row.year,
        value: metricValue(row, metric),
        unit: metricUnit(row, metric) || consistency.label,
        sourceLabel: row.sourceLabel
      }))
    } : null,
    table: tableRows,
    sourceNotes: {
      officialOnly: "Nilai yang ditampilkan berasal dari data resmi yang sudah dikurasi ke aplikasi. Template XLSX hanya dipakai sebagai acuan struktur impor.",
      importReadiness: "Struktur impor berikutnya sebaiknya mengikuti pola dataset resmi: komoditas, wilayah, tahun, indikator, nilai, satuan, dan sumber dokumen."
    }
  };
}
