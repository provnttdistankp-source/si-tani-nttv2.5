import express from "express";
import { allowRoles } from "../middleware/auth.js";
import { readDb, writeDb, generateId, collectionPrefix } from "../utils/db.js";
import { pushAuditLog, buildChangeSet } from "../utils/audit.js";

const router = express.Router();

router.get("/catalog", allowRoles("admin"), async (req, res, next) => {
  try {
    const db = await readDb();
    return res.json({
      datasets: db.officialDatasets || [],
      templateCatalog: db.templateCatalog || []
    });
  } catch (error) {
    next(error);
  }
});

const numberFields = new Set(["age", "membersCount", "formedYear", "latitude", "longitude", "areaHa", "areaValue", "productionTon", "productivityValue", "productivityTonHa", "year", "metric1Value", "metric2Value", "metric3Value", "metric4Value", "productionValue", "households", "budgetRp"]);
const nikFields = new Set(["nik", "chairmanNik"]);

function actorFromReq(req) {
  return {
    actorId: req.user?.id || null,
    actorName: req.user?.name || "Pengguna",
    actorEmail: req.user?.email || null,
    actorRole: req.user?.role || null,
    ip: req.headers["x-forwarded-for"]?.split(",")?.[0]?.trim() || req.socket?.remoteAddress || req.ip || null,
    userAgent: req.headers["user-agent"] || null
  };
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\n/g, " ")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") return value;
  let text = String(value).trim().replace(/\s+/g, "");
  if (!text) return null;
  if (text.includes(",") && text.includes(".")) {
    if (text.lastIndexOf(",") > text.lastIndexOf(".")) text = text.replace(/\./g, "").replace(",", ".");
    else text = text.replace(/,/g, "");
  } else if (text.includes(",")) {
    text = text.replace(",", ".");
  }
  if ((text.match(/\./g) || []).length > 1) {
    const parts = text.split(".");
    text = `${parts.slice(0, -1).join("")}.${parts[parts.length - 1]}`;
  }
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeValue(field, value) {
  if (value === undefined) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (nikFields.has(field)) return trimmed.replace(/\D/g, "");
    if (numberFields.has(field)) return toNumber(trimmed);
    return trimmed;
  }
  if (numberFields.has(field)) return toNumber(value);
  return value;
}

function resolveRegencyCode(db, row) {
  if (row.regencyCode) return row.regencyCode;
  const rawTarget = row.regencyName || row.kabupaten || row["kabupaten/kota"] || row["Kabupaten"];
  const target = normalizeText(rawTarget);
  if (!target) return null;

  const direct = db.regencies.find((item) => normalizeText(item.fullName || item.name) === target);
  if (direct) return direct.code;

  const candidates = db.regencies.filter((item) => normalizeText(item.name) === target);
  if (candidates.length === 1) return candidates[0].code;

  if (candidates.length > 1) {
    if (target.startsWith("kabupaten ")) return candidates.find((item) => item.fullName?.toLowerCase().startsWith("kabupaten "))?.code || null;
    if (target.startsWith("kota ")) return candidates.find((item) => item.fullName?.toLowerCase().startsWith("kota "))?.code || null;
    return null;
  }

  return null;
}

function resolveDistrictCode(db, regencyCode, row) {
  if (row.districtCode) return row.districtCode;
  const target = normalizeText(row.districtName || row.kecamatan || row["Kecamatan"]);
  if (!target) return null;
  return db.districts.find((item) => item.regencyCode === regencyCode && normalizeText(item.name) === target)?.code || null;
}

function resolveCommodityId(db, row) {
  if (row.commodityId) return row.commodityId;
  const target = normalizeText(row.commodityName || row.komoditas || row.name);
  return db.commodities.find((item) => normalizeText(item.name) === target)?.id || null;
}

function resolveFarmerGroupId(db, row) {
  if (row.farmerGroupId) return row.farmerGroupId;
  const target = normalizeText(row.farmerGroupName || row.kelompokTani || row.kelompok_tani);
  return db.farmerGroups.find((item) => normalizeText(item.name) === target)?.id || null;
}

function ensureGroupChairmanNik(db, chairmanNik) {
  if (/^\d{16}$/.test(String(chairmanNik || ""))) return String(chairmanNik);
  let candidate = String(5311880000000000 + db.farmerGroups.length + 1);
  while (db.farmerGroups.some((item) => String(item.chairmanNik) === candidate)) {
    candidate = String(Number(candidate) + 1);
  }
  return candidate.slice(0, 16);
}

function upsertBy(collection, predicate, nextItem) {
  const index = collection.findIndex(predicate);
  if (index >= 0) {
    const previous = { ...collection[index] };
    collection[index] = { ...collection[index], ...nextItem, updatedAt: new Date().toISOString() };
    return { type: "updated", item: collection[index], previous };
  }
  collection.unshift(nextItem);
  return { type: "inserted", item: nextItem, previous: {} };
}

router.post("/:resource", allowRoles("admin"), async (req, res, next) => {
  try {
    const { resource } = req.params;
    const { rows = [], mode = "upsert" } = req.body || {};
    if (!Array.isArray(rows) || !rows.length) return res.status(400).json({ message: "Baris impor belum tersedia." });

    const db = await readDb();
    const summary = { inserted: 0, updated: 0, skipped: 0, errors: [] };

    for (const [index, rawRow] of rows.entries()) {
      try {
        const row = { ...rawRow };
        if (resource === "commodities") {
          const name = normalizeValue("name", row.name);
          if (!name) throw new Error("name wajib diisi");
          const payload = {
            id: row.id || generateId(collectionPrefix.commodities, db.commodities),
            name,
            category: normalizeValue("category", row.category || "Tanaman Pangan"),
            unit: normalizeValue("unit", row.unit || "ton"),
            status: normalizeValue("status", row.status || "active"),
            description: normalizeValue("description", row.description || ""),
            sourceYear: normalizeValue("year", row.sourceYear || row.year),
            sourceDataset: normalizeValue("sourceDataset", row.sourceDataset || ""),
            sourceInstitution: normalizeValue("sourceInstitution", row.sourceInstitution || "")
          };
          const result = upsertBy(db.commodities, (item) => normalizeText(item.name) === normalizeText(payload.name), payload);
          summary[result.type] += 1;
          continue;
        }

        if (resource === "commodityStats") {
          const commodityId = resolveCommodityId(db, row);
          const regencyCode = resolveRegencyCode(db, row);
          if (!commodityId || !regencyCode) throw new Error("commodityName/commodityId dan regencyName/regencyCode wajib valid");
          const year = normalizeValue("year", row.year);
          if (!year) throw new Error("year wajib diisi");
          const payload = {
            id: row.id || generateId(collectionPrefix.commodityStats, db.commodityStats),
            commodityId,
            regencyCode,
            year,
            period: normalizeValue("period", row.period || "annual"),
            areaValue: normalizeValue("areaValue", row.areaValue),
            areaUnit: normalizeValue("areaUnit", row.areaUnit || "Ha"),
            productionTon: normalizeValue("productionTon", row.productionTon),
            productivityValue: normalizeValue("productivityValue", row.productivityValue),
            productivityUnit: normalizeValue("productivityUnit", row.productivityUnit || "Ku/Ha"),
            sourceDataset: normalizeValue("sourceDataset", row.sourceDataset || ""),
            sourceInstitution: normalizeValue("sourceInstitution", row.sourceInstitution || "")
          };
          const result = upsertBy(db.commodityStats, (item) => item.commodityId === commodityId && item.regencyCode === regencyCode && Number(item.year) === Number(year), payload);
          summary[result.type] += 1;
          continue;
        }

        if (resource === "productionData") {
          const commodityId = resolveCommodityId(db, row);
          const regencyCode = resolveRegencyCode(db, row);
          if (!commodityId || !regencyCode) throw new Error("commodityName/commodityId dan regencyName/regencyCode wajib valid");
          const month = normalizeValue("month", row.month);
          if (!month) throw new Error("month wajib diisi");
          const payload = {
            id: row.id || generateId(collectionPrefix.productionData, db.productionData),
            commodityId,
            regencyCode,
            districtCode: row.districtCode || resolveDistrictCode(db, regencyCode, row),
            month,
            year: normalizeValue("year", row.year || String(month).slice(0, 4)),
            areaHa: normalizeValue("areaHa", row.areaHa),
            productionTon: normalizeValue("productionTon", row.productionTon),
            productivityTonHa: normalizeValue("productivityTonHa", row.productivityTonHa),
            source: normalizeValue("source", row.source || ""),
            sourceInstitution: normalizeValue("sourceInstitution", row.sourceInstitution || "")
          };
          const result = upsertBy(db.productionData, (item) => item.commodityId === commodityId && item.regencyCode === regencyCode && item.month === month, payload);
          summary[result.type] += 1;
          continue;
        }

        if (resource === "officialStats") {
          const datasetType = normalizeValue("datasetType", row.datasetType);
          const commodityName = normalizeValue("commodityName", row.commodityName || row.komoditi || row.name);
          const year = normalizeValue("year", row.year);
          if (!datasetType || !commodityName || !year) throw new Error("datasetType, commodityName, dan year wajib diisi");
          const regencyCode = resolveRegencyCode(db, row);
          const payload = {
            id: row.id || generateId(collectionPrefix.officialStats, db.officialStats || []),
            datasetId: normalizeValue("datasetId", row.datasetId || "manual-import"),
            datasetType,
            categoryGroup: normalizeValue("categoryGroup", row.categoryGroup || row.category || "Statistik Resmi"),
            year,
            commodityName,
            regencyCode,
            regencyName: normalizeValue("regencyName", row.regencyName || row.kabupaten || row["kabupaten/kota"] || (regencyCode ? db.regencies.find((item) => item.code === regencyCode)?.name : "Nusa Tenggara Timur")),
            scope: normalizeValue("scope", row.scope || (regencyCode ? "regency" : "province")),
            metric1Label: normalizeValue("metric1Label", row.metric1Label || ""),
            metric1Value: normalizeValue("metric1Value", row.metric1Value),
            metric1Unit: normalizeValue("metric1Unit", row.metric1Unit || ""),
            metric2Label: normalizeValue("metric2Label", row.metric2Label || ""),
            metric2Value: normalizeValue("metric2Value", row.metric2Value),
            metric2Unit: normalizeValue("metric2Unit", row.metric2Unit || ""),
            metric3Label: normalizeValue("metric3Label", row.metric3Label || ""),
            metric3Value: normalizeValue("metric3Value", row.metric3Value),
            metric3Unit: normalizeValue("metric3Unit", row.metric3Unit || ""),
            metric4Label: normalizeValue("metric4Label", row.metric4Label || ""),
            metric4Value: normalizeValue("metric4Value", row.metric4Value),
            metric4Unit: normalizeValue("metric4Unit", row.metric4Unit || ""),
            productionValue: normalizeValue("productionValue", row.productionValue),
            productionUnit: normalizeValue("productionUnit", row.productionUnit || ""),
            productivityValue: normalizeValue("productivityValue", row.productivityValue),
            productivityUnit: normalizeValue("productivityUnit", row.productivityUnit || ""),
            households: normalizeValue("households", row.households),
            sourceDataset: normalizeValue("sourceDataset", row.sourceDataset || ""),
            sourceInstitution: normalizeValue("sourceInstitution", row.sourceInstitution || ""),
            notes: normalizeValue("notes", row.notes || ""),
            isOfficial: row.isOfficial === undefined ? true : Boolean(row.isOfficial)
          };
          const result = upsertBy(db.officialStats, (item) => normalizeText(item.datasetType) === normalizeText(payload.datasetType) && normalizeText(item.commodityName) === normalizeText(payload.commodityName) && Number(item.year) === Number(payload.year) && String(item.regencyCode || "") === String(payload.regencyCode || ""), payload);
          summary[result.type] += 1;
          continue;
        }

        if (resource === "programSummaries") {
          const regencyCode = resolveRegencyCode(db, row);
          const districtCode = resolveDistrictCode(db, regencyCode, row);
          const activityName = normalizeValue("activityName", row.activityName || row["Nama Kegiatan"] || row.kegiatan || row.name);
          const year = normalizeValue("year", row.year);
          if (!activityName || !year || !regencyCode) throw new Error("activityName, regencyName/regencyCode, dan year wajib valid");
          const payload = {
            id: row.id || generateId(collectionPrefix.programSummaries, db.programSummaries || []),
            year,
            regencyCode,
            regencyName: normalizeValue("regencyName", row.regencyName || row.kabupaten || row["Kabupaten"] || db.regencies.find((item) => item.code === regencyCode)?.name),
            districtCode,
            districtName: normalizeValue("districtName", row.districtName || row.kecamatan || row["Kecamatan"] || ""),
            village: normalizeValue("village", row.village || row.desa || row["Desa"] || ""),
            activityName,
            fundingSource: normalizeValue("fundingSource", row.fundingSource || row["Sumber Dana"] || row.sumber || ""),
            volume: normalizeValue("volume", row.volume || row["Sasaran/Unit/Volume"] || row["Volume"] || ""),
            budgetRp: normalizeValue("budgetRp", row.budgetRp || row.anggaran),
            farmerGroupName: normalizeValue("farmerGroupName", row.farmerGroupName || row.kelompokTani || row["Kelompok Tani"] || ""),
            chairman: normalizeValue("chairman", row.chairman || row.ketua || row["Ketua Poktan"] || row["Ketua"] || ""),
            notes: normalizeValue("notes", row.notes || row.keterangan || row["Keterangan"] || ""),
            sourceDataset: normalizeValue("sourceDataset", row.sourceDataset || ""),
            sourceInstitution: normalizeValue("sourceInstitution", row.sourceInstitution || "")
          };
          const result = upsertBy(db.programSummaries, (item) => Number(item.year) === Number(payload.year) && normalizeText(item.regencyName) === normalizeText(payload.regencyName) && normalizeText(item.activityName) === normalizeText(payload.activityName) && normalizeText(item.districtName || "") === normalizeText(payload.districtName || "") && normalizeText(item.farmerGroupName || "") === normalizeText(payload.farmerGroupName || ""), payload);
          summary[result.type] += 1;
          continue;
        }

        if (resource === "farmerGroups") {
          const regencyCode = resolveRegencyCode(db, row);
          const districtCode = resolveDistrictCode(db, regencyCode, row);
          if (!regencyCode || !districtCode) throw new Error("wilayah poktan belum valid");
          const chairmanNik = ensureGroupChairmanNik(db, normalizeValue("chairmanNik", row.chairmanNik));
          const payload = {
            id: row.id || generateId(collectionPrefix.farmerGroups, db.farmerGroups),
            name: normalizeValue("name", row.name),
            chairman: normalizeValue("chairman", row.chairman),
            chairmanNik,
            membersCount: normalizeValue("membersCount", row.membersCount || 0),
            regencyCode,
            districtCode,
            fieldOfficerId: row.fieldOfficerId || null,
            mainCommodityId: resolveCommodityId(db, row),
            village: normalizeValue("village", row.village || ""),
            latitude: normalizeValue("latitude", row.latitude),
            longitude: normalizeValue("longitude", row.longitude),
            status: normalizeValue("status", row.status || "aktif"),
            formedYear: normalizeValue("formedYear", row.formedYear),
            sourceLabel: normalizeValue("sourceLabel", row.sourceLabel || "")
          };
          if (!payload.name || !payload.chairman) throw new Error("name dan chairman wajib diisi");
          const result = upsertBy(db.farmerGroups, (item) => String(item.chairmanNik) === String(chairmanNik) || (normalizeText(item.name) === normalizeText(payload.name) && item.districtCode === districtCode), payload);
          summary[result.type] += 1;
          continue;
        }

        if (resource === "farmers") {
          const farmerGroupId = resolveFarmerGroupId(db, row);
          const regencyCode = resolveRegencyCode(db, row);
          const districtCode = resolveDistrictCode(db, regencyCode, row);
          const nik = normalizeValue("nik", row.nik);
          if (!nik || !farmerGroupId || !regencyCode || !districtCode) throw new Error("nik, farmerGroupName/farmerGroupId, dan wilayah petani wajib valid");
          const payload = {
            id: row.id || generateId(collectionPrefix.farmers, db.farmers),
            nik,
            name: normalizeValue("name", row.name),
            gender: normalizeValue("gender", row.gender || "L"),
            age: normalizeValue("age", row.age),
            phone: normalizeValue("phone", row.phone || ""),
            education: normalizeValue("education", row.education || ""),
            farmerGroupId,
            regencyCode,
            districtCode,
            address: normalizeValue("address", row.address || ""),
            joinedAt: normalizeValue("joinedAt", row.joinedAt || new Date().toISOString().slice(0, 10)),
            latitude: normalizeValue("latitude", row.latitude),
            longitude: normalizeValue("longitude", row.longitude),
            status: normalizeValue("status", row.status || "active"),
            identityStatus: normalizeValue("identityStatus", row.identityStatus || "")
          };
          if (!payload.name) throw new Error("name wajib diisi");
          const result = upsertBy(db.farmers, (item) => String(item.nik) === String(nik), payload);
          summary[result.type] += 1;
          continue;
        }

        throw new Error("resource impor tidak didukung");
      } catch (error) {
        summary.skipped += 1;
        summary.errors.push({ row: index + 1, message: error.message });
      }
    }

    pushAuditLog(db, {
      ...actorFromReq(req),
      action: "import",
      status: summary.errors.length ? "warning" : "success",
      resource,
      entityId: null,
      entityName: `${rows.length} baris`,
      description: `Mengimpor data ${resource}.`,
      changes: buildChangeSet({}, summary),
      metadata: { rows: rows.length, mode }
    });

    await writeDb(db);
    return res.json({
      message: "Impor data selesai diproses.",
      resource,
      mode,
      ...summary
    });
  } catch (error) {
    next(error);
  }
});

export default router;
