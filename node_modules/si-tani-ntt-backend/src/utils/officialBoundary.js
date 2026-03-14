import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_BOUNDARY_PATH = path.resolve(__dirname, '../data/reference/ntt-kabkota-big.geojson');
const OFFICIAL_BOUNDARY_URL = 'https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BATAS_WILAYAH/MapServer/13/query?where=kdpbps%3D%2753%27&outFields=kdbbps%2Cwadmkk%2Cwadmpr%2Ctipadm%2Cnamobj&returnGeometry=true&outSR=4326&f=geojson';
const CACHE_MS_SUCCESS = 1000 * 60 * 60 * 12;
const CACHE_MS_FAILURE = 1000 * 60 * 15;
const REMOTE_TIMEOUT_MS = 5000;

let memoryCache = {
  expiresAt: 0,
  payload: null
};

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeDigits(value) {
  const digits = String(value || '').replace(/\D+/g, '');
  if (!digits) return '';
  if (digits.length === 2) return digits;
  if (digits.length === 4) return digits;
  return digits.padStart(4, '0').slice(-4);
}

function expectedNttCodes(db) {
  return db.regencies.map((item) => normalizeDigits(item.code));
}

function regencyTypeFromDb(db, code) {
  const regency = db.regencies.find((item) => normalizeDigits(item.code) === code);
  if (!regency) return '';
  return String(regency.fullName || '').startsWith('Kota ') ? 'Kota' : 'Kabupaten';
}

function fullNameFromParts(name, type) {
  const rawName = String(name || '').trim();
  const normalizedType = String(type || '').trim();
  if (!rawName) return '-';
  if (/^(kabupaten|kota)\s+/i.test(rawName)) return rawName;
  return normalizedType ? `${normalizedType} ${rawName}` : rawName;
}

function decorateFeatures(geojson, db) {
  return {
    ...geojson,
    features: (geojson.features || []).map((feature) => {
      const props = feature.properties || {};
      const code = normalizeDigits(props.kdbbps || props.KDBBPS || props.code || props.regencyCode);
      const adminType = Number(props.tipadm ?? props.TIPADM) === 5 ? 'Kota' : regencyTypeFromDb(db, code) || 'Kabupaten';
      const name = props.wadmkk || props.WADMKK || props.namobj || props.NAMOBJ || '';
      return {
        ...feature,
        properties: {
          ...props,
          regencyCode: code,
          regencyName: String(name || '').trim(),
          regencyFullName: fullNameFromParts(name, adminType),
          adminType,
          source: 'BIG'
        }
      };
    })
  };
}

function validateBoundary(geojson, db) {
  if (!geojson || geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
    return { valid: false, reason: 'Format boundary bukan FeatureCollection.' };
  }

  const features = geojson.features.filter((feature) => feature?.geometry && feature?.properties);
  const expected = new Set(expectedNttCodes(db));
  const codes = features.map((feature) => normalizeDigits(feature.properties?.regencyCode || feature.properties?.kdbbps || feature.properties?.KDBBPS));
  const uniqueCodes = new Set(codes.filter(Boolean));
  const missingCodes = [...expected].filter((code) => !uniqueCodes.has(code));
  const extraCodes = [...uniqueCodes].filter((code) => !expected.has(code));

  if (features.length !== expected.size) {
    return {
      valid: false,
      reason: `Jumlah fitur boundary ${features.length} tidak sama dengan jumlah kabupaten/kota NTT (${expected.size}).`,
      missingCodes,
      extraCodes
    };
  }

  if (missingCodes.length || extraCodes.length) {
    return {
      valid: false,
      reason: 'Kode wilayah boundary tidak cocok dengan daftar kabupaten/kota NTT pada aplikasi.',
      missingCodes,
      extraCodes
    };
  }

  const missingGeometry = features
    .filter((feature) => !feature.geometry || !Array.isArray(feature.geometry.coordinates) || !feature.geometry.coordinates.length)
    .map((feature) => feature.properties?.regencyCode || feature.properties?.kdbbps || feature.properties?.KDBBPS);

  if (missingGeometry.length) {
    return {
      valid: false,
      reason: 'Ada fitur boundary tanpa geometri polygon yang lengkap.',
      missingGeometry
    };
  }

  const expectedNames = new Map(db.regencies.map((item) => [normalizeDigits(item.code), fullNameFromParts(item.name, String(item.fullName || '').startsWith('Kota ') ? 'Kota' : 'Kabupaten')]));
  const mismatchedNames = features
    .map((feature) => ({
      code: normalizeDigits(feature.properties?.regencyCode || feature.properties?.kdbbps || feature.properties?.KDBBPS),
      got: fullNameFromParts(feature.properties?.regencyName || feature.properties?.wadmkk || feature.properties?.WADMKK, feature.properties?.adminType),
    }))
    .filter((item) => expectedNames.get(item.code) && normalizeDigits(item.code) && normalizeText(expectedNames.get(item.code)) !== normalizeText(item.got));

  if (mismatchedNames.length) {
    return {
      valid: false,
      reason: 'Nama wilayah boundary tidak konsisten dengan daftar kabupaten/kota NTT pada aplikasi.',
      mismatchedNames
    };
  }

  return { valid: true, featureCount: features.length };
}

async function readLocalBoundary(db) {
  try {
    const raw = await fs.readFile(LOCAL_BOUNDARY_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    const decorated = decorateFeatures(parsed, db);
    const validation = validateBoundary(decorated, db);
    if (!validation.valid) return { ok: false, source: 'local', ...validation };
    return { ok: true, source: 'local', data: decorated, validation };
  } catch (error) {
    return { ok: false, source: 'local', reason: error.code === 'ENOENT' ? 'File cache boundary resmi lokal belum tersedia.' : error.message };
  }
}

async function fetchRemoteBoundary(db) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REMOTE_TIMEOUT_MS);
  try {
    const response = await fetch(OFFICIAL_BOUNDARY_URL, { signal: controller.signal, headers: { accept: 'application/geo+json, application/json, */*' } });
    if (!response.ok) {
      throw new Error(`Gagal mengambil boundary resmi BIG. HTTP ${response.status}.`);
    }
    const parsed = await response.json();
    const decorated = decorateFeatures(parsed, db);
    const validation = validateBoundary(decorated, db);
    if (!validation.valid) return { ok: false, source: 'remote', ...validation };
    await fs.mkdir(path.dirname(LOCAL_BOUNDARY_PATH), { recursive: true });
    await fs.writeFile(LOCAL_BOUNDARY_PATH, JSON.stringify(decorated));
    return { ok: true, source: 'remote', data: decorated, validation };
  } catch (error) {
    return { ok: false, source: 'remote', reason: error.name === 'AbortError' ? 'Permintaan boundary resmi BIG melewati batas waktu.' : error.message };
  } finally {
    clearTimeout(timer);
  }
}

export async function getOfficialNttBoundary(db) {
  if (memoryCache.payload && memoryCache.expiresAt > Date.now()) return memoryCache.payload;

  const localResult = await readLocalBoundary(db);
  if (localResult.ok) {
    const payload = {
      status: 'ready',
      source: 'local-cache',
      data: localResult.data,
      validation: localResult.validation,
      officialUrl: OFFICIAL_BOUNDARY_URL
    };
    memoryCache = { payload, expiresAt: Date.now() + CACHE_MS_SUCCESS };
    return payload;
  }

  const remoteResult = await fetchRemoteBoundary(db);
  if (remoteResult.ok) {
    const payload = {
      status: 'ready',
      source: 'big-live',
      data: remoteResult.data,
      validation: remoteResult.validation,
      officialUrl: OFFICIAL_BOUNDARY_URL
    };
    memoryCache = { payload, expiresAt: Date.now() + CACHE_MS_SUCCESS };
    return payload;
  }

  const payload = {
    status: 'fallback',
    source: 'safe-centroid',
    data: null,
    officialUrl: OFFICIAL_BOUNDARY_URL,
    warnings: [localResult, remoteResult].map((item) => ({ source: item.source, reason: item.reason, missingCodes: item.missingCodes || [], extraCodes: item.extraCodes || [] }))
  };
  memoryCache = { payload, expiresAt: Date.now() + CACHE_MS_FAILURE };
  return payload;
}

export async function cacheOfficialNttBoundary(db) {
  const result = await fetchRemoteBoundary(db);
  if (!result.ok) throw new Error(result.reason || 'Gagal mengunduh boundary resmi NTT.');
  return result;
}
