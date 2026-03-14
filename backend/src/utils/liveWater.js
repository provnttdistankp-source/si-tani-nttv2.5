import { haversineDistanceMeters } from "./geospatial.js";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter"
];

const WATER_POLYGON_TYPES = new Set(["Perairan", "Danau", "Laguna", "Reservoir"]);
const bboxCache = new Map();
const nearbyCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function abbreviateCoordinates(geom = []) {
  if (!Array.isArray(geom) || geom.length <= 80) return geom;
  const step = Math.max(1, Math.ceil(geom.length / 60));
  return geom.filter((_, index) => index % step === 0 || index === geom.length - 1);
}

function normalizeWaterType(tags = {}) {
  if (tags.natural === "spring") return "Mata Air";
  if (tags.natural === "hot_spring") return "Mata Air Panas";
  if (tags.amenity === "drinking_water") return "Air Minum";
  if (tags.man_made === "water_well") return "Sumur";
  if (tags.waterway === "river") return "Sungai";
  if (tags.waterway === "stream") return "Aliran";
  if (tags.waterway === "canal") return "Kanal";
  if (tags.waterway === "drain") return "Drainase";
  if (tags.waterway === "dam" || tags.waterway === "weir") return "Bendung";
  if (tags.water === "reservoir") return "Reservoir";
  if (tags.water === "lake") return "Danau";
  if (tags.water === "lagoon") return "Laguna";
  if (tags.natural === "water") return "Perairan";
  return "Sumber Air";
}

function inferGeometryType(element, type) {
  if (element.type === "node") return "Point";
  const geom = element.geometry || [];
  const closed = geom.length > 3 && geom[0]?.lat === geom.at(-1)?.lat && geom[0]?.lon === geom.at(-1)?.lon;
  if (closed && WATER_POLYGON_TYPES.has(type)) return "Polygon";
  return "LineString";
}

function getFeatureName(element, type) {
  const tags = element.tags || {};
  return tags.name || tags["name:id"] || tags["name:en"] || `${type} ${element.id}`;
}

function getCenter(element) {
  if (element.type === "node") return { latitude: number(element.lat), longitude: number(element.lon) };
  if (element.center) return { latitude: number(element.center.lat), longitude: number(element.center.lon) };
  const geom = element.geometry || [];
  if (!geom.length) return { latitude: null, longitude: null };
  const middle = geom[Math.floor(geom.length / 2)];
  return { latitude: number(middle.lat), longitude: number(middle.lon) };
}

function elementToFeature(element) {
  const tags = element.tags || {};
  const waterType = normalizeWaterType(tags);
  const geometryType = inferGeometryType(element, waterType);
  const center = getCenter(element);
  const geometry = abbreviateCoordinates(element.geometry || []).map((point) => [number(point.lat), number(point.lon)]);

  return {
    id: `${element.type}-${element.id}`,
    elementType: element.type,
    elementId: element.id,
    name: getFeatureName(element, waterType),
    waterType,
    geometryType,
    latitude: center.latitude,
    longitude: center.longitude,
    geometry,
    tags,
    source: "OpenStreetMap Live"
  };
}

async function fetchOverpass(query) {
  let lastError;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: query,
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`Overpass merespons ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Gagal mengambil data air internet.");
}

function buildBboxQuery({ west, south, east, north }) {
  return `
[out:json][timeout:12];
(
  node["natural"~"spring|hot_spring"](${south},${west},${north},${east});
  node["amenity"="drinking_water"](${south},${west},${north},${east});
  node["man_made"="water_well"](${south},${west},${north},${east});
  node["waterway"~"dam|weir"](${south},${west},${north},${east});
  way["waterway"~"river|stream|canal|drain"](${south},${west},${north},${east});
  way["natural"="water"](${south},${west},${north},${east});
  way["water"~"reservoir|lake|lagoon"](${south},${west},${north},${east});
);
out tags center geom;
`.trim();
}

function buildNearbyQuery({ latitude, longitude, radiusMeters }) {
  return `
[out:json][timeout:12];
(
  node(around:${radiusMeters},${latitude},${longitude})["natural"~"spring|hot_spring"];
  node(around:${radiusMeters},${latitude},${longitude})["amenity"="drinking_water"];
  node(around:${radiusMeters},${latitude},${longitude})["man_made"="water_well"];
  node(around:${radiusMeters},${latitude},${longitude})["waterway"~"dam|weir"];
  way(around:${radiusMeters},${latitude},${longitude})["waterway"~"river|stream|canal|drain"];
  way(around:${radiusMeters},${latitude},${longitude})["natural"="water"];
  way(around:${radiusMeters},${latitude},${longitude})["water"~"reservoir|lake|lagoon"];
);
out tags center geom;
`.trim();
}

function summarize(features) {
  return features.reduce((acc, item) => {
    acc[item.waterType] = (acc[item.waterType] || 0) + 1;
    return acc;
  }, {});
}

function getCached(map, key) {
  const cached = map.get(key);
  if (!cached) return null;
  if (Date.now() - cached.savedAt > CACHE_TTL_MS) {
    map.delete(key);
    return null;
  }
  return cached.value;
}

function setCached(map, key, value) {
  map.set(key, { savedAt: Date.now(), value });
  return value;
}

export async function getLiveWaterByBbox({ west, south, east, north }) {
  const key = [west, south, east, north].map((value) => Number(value).toFixed(3)).join(":");
  const cached = getCached(bboxCache, key);
  if (cached) return cached;

  const payload = await fetchOverpass(buildBboxQuery({ west, south, east, north }));
  const features = (payload.elements || [])
    .map(elementToFeature)
    .filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude))
    .slice(0, 80);

  return setCached(bboxCache, key, {
    source: "OpenStreetMap Live",
    fetchedAt: new Date().toISOString(),
    features,
    stats: {
      total: features.length,
      byType: summarize(features)
    }
  });
}

export async function getNearbyLiveWater({ latitude, longitude, radiusMeters = 4000 }) {
  const key = [latitude, longitude, radiusMeters].map((value) => Number(value).toFixed(3)).join(":");
  const cached = getCached(nearbyCache, key);
  if (cached) return cached;

  const payload = await fetchOverpass(buildNearbyQuery({ latitude, longitude, radiusMeters }));
  const features = (payload.elements || [])
    .map(elementToFeature)
    .filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude))
    .map((item) => {
      const distanceMeters = haversineDistanceMeters(latitude, longitude, item.latitude, item.longitude);
      return {
        ...item,
        distanceMeters,
        distanceKm: Number((distanceMeters / 1000).toFixed(2))
      };
    })
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, 20);

  return setCached(nearbyCache, key, {
    source: "OpenStreetMap Live",
    fetchedAt: new Date().toISOString(),
    radiusMeters,
    nearest: features[0] || null,
    features,
    stats: {
      total: features.length,
      byType: summarize(features)
    }
  });
}
