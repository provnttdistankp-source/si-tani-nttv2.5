import { analyzeNearestWaterAccess } from "./geospatial.js";

function formatNumber(value, digits = 2) {
  const number = Number(value || 0);
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: digits }).format(number);
}

function uniqueCount(values = []) {
  return new Set(values.filter(Boolean)).size;
}

function buildCommodityInsights(item, db) {
  const stats = (db.commodityStats || []).filter((row) => row.commodityId === item.id);
  if (!stats.length) {
    return {
      latestYear: item.sourceYear || null,
      coverageCount: 0,
      totalProductionTon: 0,
      totalProductionDisplay: "0 ton",
      coverageDisplay: "0 kabupaten/kota",
      topRegencyName: "-",
      sourceSummary: item.sourceDataset || "-",
      regionalSpread: []
    };
  }

  const latestYear = Math.max(...stats.map((row) => Number(row.year || 0)));
  const latestStats = stats.filter((row) => Number(row.year || 0) === latestYear);
  const totalProductionTon = latestStats.reduce((sum, row) => sum + Number(row.productionTon || 0), 0);
  const coverageCount = uniqueCount(latestStats.map((row) => row.regencyCode));
  const topRow = latestStats.slice().sort((a, b) => Number(b.productionTon || 0) - Number(a.productionTon || 0))[0];
  const topRegencyName = db.regencies.find((row) => row.code === topRow?.regencyCode)?.name || "-";

  const regionalSpread = latestStats
    .slice()
    .sort((a, b) => Number(b.productionTon || 0) - Number(a.productionTon || 0))
    .slice(0, 12)
    .map((row) => ({
      regencyCode: row.regencyCode,
      regencyName: db.regencies.find((reg) => reg.code === row.regencyCode)?.name || row.regencyCode,
      year: row.year,
      areaValue: row.areaValue,
      areaUnit: row.areaUnit,
      productionTon: row.productionTon,
      productivityValue: row.productivityValue,
      productivityUnit: row.productivityUnit,
      sourceDataset: row.sourceDataset
    }));

  return {
    latestYear,
    coverageCount,
    totalProductionTon: Number(totalProductionTon.toFixed(2)),
    totalProductionDisplay: `${formatNumber(totalProductionTon)} ton`,
    coverageDisplay: `${coverageCount} kabupaten/kota`,
    topRegencyName,
    sourceSummary: latestStats[0]?.sourceDataset || item.sourceDataset || "-",
    regionalSpread
  };
}

export function getLookups(db) {
  const regencies = db.regencies.map((item) => ({ value: item.code, label: item.name, latitude: item.latitude, longitude: item.longitude }));
  const districts = db.districts.map((item) => ({ value: item.code, label: item.name, regencyCode: item.regencyCode, latitude: item.latitude, longitude: item.longitude }));
  const farmerGroups = db.farmerGroups.map((item) => ({ value: item.id, label: item.name, regencyCode: item.regencyCode }));
  const fieldOfficers = db.fieldOfficers.map((item) => ({ value: item.id, label: item.name, regencyCode: item.regencyCode }));
  const commodities = db.commodities.map((item) => ({ value: item.id, label: item.name, category: item.category }));
  const users = db.users.map((item) => ({ value: item.id, label: `${item.name} (${item.role})` }));
  const farmers = db.farmers.map((item) => ({ value: item.id, label: item.name, regencyCode: item.regencyCode }));
  const roles = db.roles.map((item) => ({ value: item.name, label: item.label }));
  const waterSources = (db.waterSources || []).map((item) => ({
    value: item.id,
    label: item.name,
    type: item.type,
    regencyCode: item.regencyCode,
    districtCode: item.districtCode,
    latitude: item.latitude,
    longitude: item.longitude,
    status: item.status
  }));

  return {
    regencies,
    districts,
    farmerGroups,
    fieldOfficers,
    commodities,
    users,
    farmers,
    roles,
    waterSources,
    waterSourceTypes: ["Mata Air", "Mata Air Panas", "Embung", "Irigasi", "Sumur Bor", "Bendung", "Sungai", "Danau", "Laguna", "Reservoir"],
    landStatuses: ["Produktif", "Perlu Pendampingan", "Siap Tanam", "Panen"],
    activityStatuses: ["Terjadwal", "Berlangsung", "Selesai", "Ditunda"],
    activityTypes: ["Sekolah Lapang", "Bimtek", "Panen Raya", "Monitoring Lahan", "Distribusi Benih", "Pengendalian OPT", "Pemetaan Irigasi", "Pendampingan Kelompok"],
    irrigationTypes: ["Teknis", "Setengah Teknis", "Tadah Hujan", "Ladang Kering"],
    commodityCategories: ["Tanaman Pangan", "Hortikultura", "Perkebunan"]
  };
}

function withWaterAccess(collection, item, db) {
  if (!["farmers", "farmerGroups", "lands", "activities"].includes(collection)) return {};
  const waterAccess = analyzeNearestWaterAccess(item, db, { radiusMeters: 7000, nearestLimit: 3 });
  if (!waterAccess?.nearest) return {};

  return {
    nearestWaterSource: waterAccess.nearest,
    nearestWaterSourceId: waterAccess.nearest.id,
    nearestWaterSourceName: waterAccess.nearest.name,
    nearestWaterSourceType: waterAccess.nearest.type,
    nearestWaterDistanceKm: waterAccess.nearest.distanceKm,
    nearestWaterDistanceMeters: Math.round(waterAccess.nearest.distanceMeters),
    nearbyWaterSources: waterAccess.nearby,
    waterSupportLevel: waterAccess.supportLevel,
    locationSource: waterAccess.source
  };
}

export function hydrateRecord(collection, item, db) {
  if (!item) return item;

  if (collection === "users") {
    const { password, ...safeUser } = item;
    return safeUser;
  }

  const regency = db.regencies.find((x) => x.code === item.regencyCode);
  const district = db.districts.find((x) => x.code === item.districtCode);
  const commodity = db.commodities.find((x) => x.id === item.commodityId || x.id === item.mainCommodityId);
  const farmerGroup = db.farmerGroups.find((x) => x.id === item.farmerGroupId);
  const farmer = db.farmers.find((x) => x.id === item.farmerId);
  const officer = db.fieldOfficers.find((x) => x.id === item.fieldOfficerId || x.id === item.responsibleOfficerId);
  const responsibleOfficer = db.fieldOfficers.find((x) => x.id === item.responsibleOfficerId);
  const user = db.users.find((x) => x.id === item.userId || x.id === item.updatedBy || x.id === item.createdBy);
  const landsCount = (db.lands || []).filter((x) => x.farmerId === item.id).length;

  const commodityInsights = collection === "commodities" ? buildCommodityInsights(item, db) : {};

  return {
    ...item,
    regencyName: regency?.name,
    districtName: district?.name,
    commodityName: commodity?.name,
    commodityCategory: commodity?.category,
    farmerGroupName: farmerGroup?.name,
    farmerName: farmer?.name,
    officerName: officer?.name,
    responsibleOfficerName: responsibleOfficer?.name,
    userName: user?.name,
    landsCount,
    groupDetail: farmerGroup,
    farmerDetail: farmer,
    commodityDetail: commodity,
    regencyDetail: regency,
    districtDetail: district,
    createdByName: db.users.find((x) => x.id === item.createdBy)?.name,
    updatedByName: db.users.find((x) => x.id === item.updatedBy)?.name,
    ...commodityInsights,
    ...withWaterAccess(collection, item, db)
  };
}

export function collectionConfig(name) {
  return {
    users: { collection: "users", primaryKey: "id" },
    farmers: { collection: "farmers", primaryKey: "id" },
    farmerGroups: { collection: "farmerGroups", primaryKey: "id" },
    fieldOfficers: { collection: "fieldOfficers", primaryKey: "id" },
    commodities: { collection: "commodities", primaryKey: "id" },
    commodityStats: { collection: "commodityStats", primaryKey: "id" },
    lands: { collection: "lands", primaryKey: "id" },
    activities: { collection: "activities", primaryKey: "id" },
    agriSummaries: { collection: "agriSummaries", primaryKey: "id" },
    reports: { collection: "reports", primaryKey: "id" },
    productionData: { collection: "productionData", primaryKey: "id" },
    regencies: { collection: "regencies", primaryKey: "id" },
    districts: { collection: "districts", primaryKey: "id" },
    waterSources: { collection: "waterSources", primaryKey: "id" },
    auditLogs: { collection: "auditLogs", primaryKey: "id" }
  }[name];
}
