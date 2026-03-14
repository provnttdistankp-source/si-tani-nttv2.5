import express from "express";
import { readDb } from "../utils/db.js";
import { analyzeNearestWaterAccess, getRegionCenter } from "../utils/geospatial.js";
import { getLiveWaterByBbox, getNearbyLiveWater } from "../utils/liveWater.js";

const router = express.Router();

function withRegionNames(db, marker) {
  return {
    ...marker,
    regencyName: db.regencies.find((x) => x.code === marker.regencyCode)?.name,
    districtName: db.districts.find((x) => x.code === marker.districtCode)?.name
  };
}

function validMarker(marker) {
  return Number.isFinite(Number(marker.latitude)) && Number.isFinite(Number(marker.longitude));
}

function withWaterAnalysis(db, item) {
  const waterAccess = analyzeNearestWaterAccess(item, db, { radiusMeters: 7000, nearestLimit: 3 });
  return {
    nearestWaterSource: waterAccess?.nearest || null,
    nearestWaterDistanceKm: waterAccess?.nearest?.distanceKm ?? null,
    nearbyWaterSources: waterAccess?.nearby || [],
    waterSupportLevel: waterAccess?.supportLevel || null
  };
}

router.get("/live-water", async (req, res) => {
  try {
    const { bbox = "", zoom = 0 } = req.query;
    const parsedZoom = Number(zoom);
    if (parsedZoom < 12) {
      return res.json({
        source: "OpenStreetMap Live",
        features: [],
        stats: { total: 0, byType: {} },
        message: "Perbesar peta sampai minimal zoom 12 untuk memuat jaringan air nyata dari internet."
      });
    }

    const [west, south, east, north] = String(bbox).split(",").map(Number);
    if (![west, south, east, north].every(Number.isFinite)) {
      return res.status(400).json({ message: "Parameter bbox tidak valid." });
    }

    const payload = await getLiveWaterByBbox({ west, south, east, north });
    return res.json(payload);
  } catch (error) {
    return res.json({
      source: "OpenStreetMap Live",
      features: [],
      stats: { total: 0, byType: {} },
      message: error.message || "Gagal memuat data air internet."
    });
  }
});

router.get("/nearby-water", async (req, res) => {
  try {
    const latitude = Number(req.query.lat);
    const longitude = Number(req.query.lng);
    const radiusMeters = Number(req.query.radiusMeters || 4000);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({ message: "Parameter koordinat tidak valid." });
    }

    const payload = await getNearbyLiveWater({ latitude, longitude, radiusMeters });
    return res.json(payload);
  } catch (error) {
    return res.json({
      source: "OpenStreetMap Live",
      nearest: null,
      features: [],
      stats: { total: 0, byType: {} },
      message: error.message || "Gagal memuat analisis air internet."
    });
  }
});

router.get("/location-preview", async (req, res, next) => {
  try {
    const db = await readDb();
    const latitude = Number(req.query.lat);
    const longitude = Number(req.query.lng);
    const regencyCode = req.query.regencyCode || "";
    const districtCode = req.query.districtCode || "";
    const waterAccess = analyzeNearestWaterAccess({ latitude, longitude, regencyCode, districtCode }, db, { radiusMeters: 7000, nearestLimit: 3 });
    return res.json({
      nearestWaterSource: waterAccess?.nearest || null,
      nearbyWaterSources: waterAccess?.nearby || [],
      waterSupportLevel: waterAccess?.supportLevel || null
    });
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const db = await readDb();
    const { category, regencyCode, districtCode, status, commodityId, search, waterSourceType } = req.query;

    const regionMarkers = (db.mapLocations || [])
      .filter((item) => item.category === "Wilayah")
      .map((item) => withRegionNames(db, item));

    const farmerMarkers = (db.farmers || []).map((item) => {
      const center = getRegionCenter(db, item.regencyCode, item.districtCode);
      return withRegionNames(db, {
        id: `map-${item.id}`,
        entityType: "farmer",
        entityId: item.id,
        name: item.name,
        regencyCode: item.regencyCode,
        districtCode: item.districtCode,
        latitude: Number(item.latitude ?? center.latitude),
        longitude: Number(item.longitude ?? center.longitude),
        status: item.status || "aktif",
        category: "Petani",
        farmerGroupId: item.farmerGroupId || null,
        commodityId: item.commodityId || null,
        village: item.village,
        nik: item.nik,
        source: item.latitude && item.longitude ? "exact" : "region-center",
        ...withWaterAnalysis(db, item)
      });
    });

    const groupMarkers = (db.farmerGroups || []).map((item) => {
      const center = getRegionCenter(db, item.regencyCode, item.districtCode);
      return withRegionNames(db, {
        id: `map-${item.id}`,
        entityType: "farmer_group",
        entityId: item.id,
        name: item.name,
        regencyCode: item.regencyCode,
        districtCode: item.districtCode,
        latitude: Number(item.latitude ?? center.latitude),
        longitude: Number(item.longitude ?? center.longitude),
        status: item.status,
        category: "Kelompok Tani",
        commodityId: item.mainCommodityId || null,
        village: item.village,
        chairman: item.chairman,
        chairmanNik: item.chairmanNik,
        source: item.latitude && item.longitude ? "exact" : "region-center",
        ...withWaterAnalysis(db, item)
      });
    });

    const landMarkers = (db.lands || []).map((item) => {
      const center = getRegionCenter(db, item.regencyCode, item.districtCode);
      return withRegionNames(db, {
        id: `map-${item.id}`,
        entityType: "land",
        entityId: item.id,
        name: item.name,
        regencyCode: item.regencyCode,
        districtCode: item.districtCode,
        latitude: Number(item.latitude ?? center.latitude),
        longitude: Number(item.longitude ?? center.longitude),
        status: item.status,
        category: "Lahan",
        commodityId: item.commodityId || null,
        areaHa: item.areaHa,
        irrigationType: item.irrigationType,
        source: item.latitude && item.longitude ? "exact" : "region-center",
        ...withWaterAnalysis(db, item)
      });
    });

    const activityMarkers = (db.activities || []).map((item) => {
      const center = getRegionCenter(db, item.regencyCode, item.districtCode);
      return withRegionNames(db, {
        id: `map-${item.id}`,
        entityType: "activity",
        entityId: item.id,
        name: item.name,
        regencyCode: item.regencyCode,
        districtCode: item.districtCode,
        latitude: Number(item.latitude ?? center.latitude),
        longitude: Number(item.longitude ?? center.longitude),
        status: item.status,
        category: "Kegiatan",
        activityType: item.type,
        commodityId: item.commodityId || null,
        date: item.date,
        location: item.locationName || item.location,
        source: item.latitude && item.longitude ? "exact" : "region-center",
        ...withWaterAnalysis(db, item)
      });
    });

    const waterSources = (db.waterSources || [])
      .map((item) => withRegionNames(db, { ...item, category: "Sumber Air" }))
      .filter((item) => {
        if (regencyCode && item.regencyCode !== regencyCode) return false;
        if (districtCode && item.districtCode !== districtCode) return false;
        if (status && String(item.status || "").toLowerCase() !== String(status).toLowerCase()) return false;
        if (waterSourceType && item.type !== waterSourceType) return false;
        if (search && !`${item.name} ${item.type} ${item.regencyName || ""} ${item.districtName || ""}`.toLowerCase().includes(String(search).toLowerCase())) return false;
        return validMarker(item);
      });

    let markers = [...regionMarkers, ...farmerMarkers, ...groupMarkers, ...landMarkers, ...activityMarkers].filter(validMarker);

    markers = markers.filter((item) => {
      if (category && item.category !== category) return false;
      if (regencyCode && item.regencyCode !== regencyCode) return false;
      if (districtCode && item.districtCode !== districtCode) return false;
      if (status && String(item.status || "").toLowerCase() !== String(status).toLowerCase()) return false;
      if (commodityId && item.commodityId !== commodityId) return false;
      if (search && !`${item.name} ${item.regencyName || ""} ${item.districtName || ""}`.toLowerCase().includes(String(search).toLowerCase())) return false;
      return true;
    });

    const counts = markers.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {});

    const waterCounts = waterSources.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {});

    return res.json({
      markers,
      waterSources,
      stats: {
        total: markers.length,
        totalWaterSources: waterSources.length,
        categories: counts,
        waterSourceTypes: waterCounts
      },
      legends: [
        { label: "Petani", category: "Petani" },
        { label: "Kegiatan", category: "Kegiatan" },
        { label: "Kelompok Tani", category: "Kelompok Tani" },
        { label: "Lahan", category: "Lahan" },
        { label: "Wilayah", category: "Wilayah" },
        { label: "Sumber Air", category: "Sumber Air" }
      ]
    });
  } catch (error) {
    next(error);
  }
});

export default router;
