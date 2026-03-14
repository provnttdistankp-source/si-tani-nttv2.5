export function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(Number(lat2) - Number(lat1));
  const dLon = toRad(Number(lon2) - Number(lon1));
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(Number(lat1))) * Math.cos(toRad(Number(lat2))) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function getRegionCenter(db, regencyCode, districtCode) {
  const district = db.districts.find((item) => item.code === districtCode);
  const regency = db.regencies.find((item) => item.code === (regencyCode || district?.regencyCode));

  return {
    latitude: Number(district?.latitude ?? regency?.latitude ?? db.province?.latitude ?? -8.657),
    longitude: Number(district?.longitude ?? regency?.longitude ?? db.province?.longitude ?? 121.079),
    district,
    regency
  };
}

export function resolveCoordinates(item, db) {
  const fallback = getRegionCenter(db, item?.regencyCode, item?.districtCode);
  const latitude = Number(item?.latitude ?? fallback.latitude);
  const longitude = Number(item?.longitude ?? fallback.longitude);

  return {
    latitude,
    longitude,
    source: item?.latitude !== undefined && item?.latitude !== "" && item?.longitude !== undefined && item?.longitude !== "" ? "exact" : "region-center",
    district: fallback.district,
    regency: fallback.regency
  };
}

function waterSupportLabel(distanceMeters) {
  if (!Number.isFinite(distanceMeters)) return "Belum dihitung";
  if (distanceMeters <= 1000) return "Sangat dekat";
  if (distanceMeters <= 3000) return "Dekat";
  if (distanceMeters <= 7000) return "Menengah";
  return "Jauh";
}

export function analyzeNearestWaterAccess(item, db, options = {}) {
  const radiusMeters = Number(options.radiusMeters ?? 5000);
  const nearestLimit = Number(options.nearestLimit ?? 3);
  const sources = db.waterSources || [];
  if (!sources.length) return null;

  const resolved = resolveCoordinates(item, db);
  const sameRegencySources = sources.filter((source) => !item?.regencyCode || source.regencyCode === item.regencyCode);
  const curatedSameRegencySources = sameRegencySources.filter((source) => source.dataOrigin === "internet-curated");
  const curatedSources = sources.filter((source) => source.dataOrigin === "internet-curated");
  const candidateSources = curatedSameRegencySources.length
    ? curatedSameRegencySources
    : sameRegencySources.length
      ? sameRegencySources
      : curatedSources.length
        ? curatedSources
        : sources;

  const computed = candidateSources
    .map((source) => {
      const distanceMeters = haversineDistanceMeters(resolved.latitude, resolved.longitude, source.latitude, source.longitude);
      const regencyName = db.regencies.find((row) => row.code === source.regencyCode)?.name;
      const districtName = db.districts.find((row) => row.code === source.districtCode)?.name;
      return {
        ...source,
        regencyName,
        districtName,
        distanceMeters,
        distanceKm: Number((distanceMeters / 1000).toFixed(2))
      };
    })
    .sort((a, b) => a.distanceMeters - b.distanceMeters);

  const nearest = computed[0];
  return {
    nearest,
    nearby: computed.filter((source) => source.distanceMeters <= radiusMeters).slice(0, nearestLimit),
    alternatives: computed.slice(0, nearestLimit),
    supportLevel: waterSupportLabel(nearest?.distanceMeters),
    radiusMeters,
    source: resolved.source,
    latitude: resolved.latitude,
    longitude: resolved.longitude
  };
}
