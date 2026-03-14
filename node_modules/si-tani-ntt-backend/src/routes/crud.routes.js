import express from "express";
import { readDb, writeDb, generateId, collectionPrefix } from "../utils/db.js";
import { applySearchAndFilters, paginate, parseQuery, sortItems } from "../utils/helpers.js";
import { collectionConfig, hydrateRecord } from "../utils/lookups.js";
import { allowRoles } from "../middleware/auth.js";
import { buildChangeSet, pushAuditLog, summarizeEntity } from "../utils/audit.js";

const router = express.Router();

const resourceSchema = {
  users: {
    fields: ["name", "email", "role", "phone", "status", "regionCode", "avatar"],
    required: ["name", "email", "role"]
  },
  farmers: {
    fields: ["nik", "name", "gender", "age", "phone", "education", "regencyCode", "districtCode", "farmerGroupId", "address", "latitude", "longitude"],
    required: ["nik", "name", "regencyCode", "districtCode", "farmerGroupId"]
  },
  farmerGroups: {
    fields: ["name", "chairman", "chairmanNik", "membersCount", "regencyCode", "districtCode", "fieldOfficerId", "mainCommodityId", "village", "latitude", "longitude", "status", "formedYear"],
    required: ["name", "chairman", "chairmanNik", "regencyCode", "districtCode"]
  },
  fieldOfficers: {
    fields: ["name", "email", "phone", "role", "specialty", "regencyCode", "districtCode", "status"],
    required: ["name", "regencyCode"]
  },
  commodities: {
    fields: ["name", "category", "unit", "status", "description"],
    required: ["name", "category"]
  },
  lands: {
    fields: ["name", "farmerId", "regencyCode", "districtCode", "commodityId", "areaHa", "irrigationType", "status", "latitude", "longitude"],
    required: ["name", "farmerId", "regencyCode", "districtCode", "commodityId"]
  },
  activities: {
    fields: ["name", "type", "regencyCode", "districtCode", "date", "responsibleOfficerId", "farmerGroupId", "commodityId", "status", "description", "latitude", "longitude", "location"],
    required: ["name", "type", "regencyCode", "districtCode", "date"]
  }
};

const numberFields = new Set(["age", "membersCount", "formedYear", "areaHa", "latitude", "longitude"]);
const nikFields = new Set(["nik", "chairmanNik"]);

function listCollection(db, key) {
  if (key === "regions") {
    return [
      { ...db.province, kind: "province" },
      ...db.regencies.map((item) => ({ ...item, kind: "regency" })),
      ...db.districts.map((item) => ({ ...item, kind: "district" }))
    ];
  }
  return db[key] || [];
}

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

function normalizeValue(field, value) {
  if (value === undefined) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (nikFields.has(field)) return trimmed.replace(/\D/g, "");
    if (numberFields.has(field)) return trimmed === "" ? null : Number(trimmed);
    return trimmed;
  }
  if (numberFields.has(field)) return value === null || value === "" ? null : Number(value);
  return value;
}

function pickPayload(resource, body = {}) {
  const schema = resourceSchema[resource];
  if (!schema) return { ...body };
  const payload = {};
  for (const field of schema.fields) {
    const normalized = normalizeValue(field, body[field]);
    if (normalized !== undefined) payload[field] = normalized;
  }
  return payload;
}

function validatePayload(resource, payload, db, currentId = null) {
  const schema = resourceSchema[resource];
  if (!schema) return;

  for (const field of schema.required) {
    if (payload[field] === undefined || payload[field] === null || payload[field] === "") {
      throw new Error(`${field} wajib diisi.`);
    }
  }

  if (resource === "farmerGroups") {
    if (!/^\d{16}$/.test(String(payload.chairmanNik || ""))) {
      throw new Error("NIK ketua Poktan harus 16 digit angka.");
    }
    const exists = (db.farmerGroups || []).some((item) => item.id !== currentId && String(item.chairmanNik || "") === String(payload.chairmanNik));
    if (exists) throw new Error("NIK ketua Poktan sudah terdaftar pada Poktan lain.");
  }

  if (resource === "farmers") {
    if (!/^\d{16}$/.test(String(payload.nik || ""))) {
      throw new Error("NIK petani harus 16 digit angka.");
    }
    const exists = (db.farmers || []).some((item) => item.id !== currentId && String(item.nik || "") === String(payload.nik));
    if (exists) throw new Error("NIK petani sudah terdaftar.");
    const groupExists = (db.farmerGroups || []).some((item) => item.id === payload.farmerGroupId);
    if (!groupExists) throw new Error("Petani wajib tergabung pada kelompok tani yang valid.");
  }

  if (resource === "users") {
    const exists = (db.users || []).some((item) => item.id !== currentId && item.email?.toLowerCase() === String(payload.email || "").toLowerCase());
    if (exists) throw new Error("Email pengguna sudah terdaftar.");
  }
}

router.get("/:resource", async (req, res, next) => {
  try {
    const { resource } = req.params;
    const config = collectionConfig(resource);
    if (!config) return res.status(404).json({ message: "Resource tidak ditemukan." });

    const db = await readDb();
    const query = parseQuery(req.query);
    const hydrated = listCollection(db, config.collection).map((item) => hydrateRecord(config.collection, item, db));
    const filtered = applySearchAndFilters(hydrated, query);
    const sorted = sortItems(filtered, query.sortBy, query.order);
    const payload = paginate(sorted, query.page, query.limit);
    return res.json(payload);
  } catch (error) {
    next(error);
  }
});

router.get("/:resource/:id", async (req, res, next) => {
  try {
    const { resource, id } = req.params;
    const config = collectionConfig(resource);
    if (!config) return res.status(404).json({ message: "Resource tidak ditemukan." });

    const db = await readDb();
    const item = listCollection(db, config.collection).find((row) => row.id === id);
    if (!item) return res.status(404).json({ message: "Data tidak ditemukan." });

    return res.json(hydrateRecord(config.collection, item, db));
  } catch (error) {
    next(error);
  }
});

router.post("/:resource", allowRoles("admin", "petugas", "penyuluh"), async (req, res, next) => {
  try {
    const { resource } = req.params;
    const config = collectionConfig(resource);
    if (!config || ["regencies", "districts"].includes(config.collection)) {
      return res.status(400).json({ message: "Resource tidak dapat dibuat dari endpoint ini." });
    }

    const db = await readDb();
    const collection = db[config.collection];
    const payload = pickPayload(config.collection, req.body);
    validatePayload(config.collection, payload, db);

    const now = new Date().toISOString();
    const id = generateId(collectionPrefix[config.collection] || resource, collection);
    const item = { id, ...payload, createdAt: now, updatedAt: now, createdBy: req.user?.id || null, updatedBy: req.user?.id || null };
    collection.unshift(item);

    pushAuditLog(db, {
      ...actorFromReq(req),
      action: "create",
      status: "success",
      resource: config.collection,
      entityId: item.id,
      entityName: summarizeEntity(config.collection, item),
      description: `Menambahkan data ${config.collection}.`,
      changes: buildChangeSet({}, item)
    });

    await writeDb(db);
    return res.status(201).json(item);
  } catch (error) {
    if (error.message?.includes("wajib diisi") || error.message?.includes("sudah") || error.message?.includes("16 digit") || error.message?.includes("valid")) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
});

router.put("/:resource/:id", allowRoles("admin", "petugas", "penyuluh"), async (req, res, next) => {
  try {
    const { resource, id } = req.params;
    const config = collectionConfig(resource);
    if (!config || ["regencies", "districts"].includes(config.collection)) {
      return res.status(400).json({ message: "Resource tidak dapat diubah dari endpoint ini." });
    }

    const db = await readDb();
    const collection = db[config.collection];
    const index = collection.findIndex((item) => item.id === id);
    if (index === -1) return res.status(404).json({ message: "Data tidak ditemukan." });

    const previous = { ...collection[index] };
    const payload = pickPayload(config.collection, req.body);
    const nextItem = { ...collection[index], ...payload, id, updatedAt: new Date().toISOString(), updatedBy: req.user?.id || null };
    validatePayload(config.collection, nextItem, db, id);
    collection[index] = nextItem;

    pushAuditLog(db, {
      ...actorFromReq(req),
      action: "update",
      status: "success",
      resource: config.collection,
      entityId: id,
      entityName: summarizeEntity(config.collection, nextItem),
      description: `Memperbarui data ${config.collection}.`,
      changes: buildChangeSet(previous, nextItem)
    });

    await writeDb(db);
    return res.json(collection[index]);
  } catch (error) {
    if (error.message?.includes("wajib diisi") || error.message?.includes("sudah") || error.message?.includes("16 digit") || error.message?.includes("valid")) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
});

router.delete("/:resource/:id", allowRoles("admin", "petugas", "penyuluh"), async (req, res, next) => {
  try {
    const { resource, id } = req.params;
    const config = collectionConfig(resource);
    if (!config || ["regencies", "districts"].includes(config.collection)) {
      return res.status(400).json({ message: "Resource tidak dapat dihapus dari endpoint ini." });
    }

    const db = await readDb();
    const collection = db[config.collection];
    const index = collection.findIndex((item) => item.id === id);
    if (index === -1) return res.status(404).json({ message: "Data tidak ditemukan." });

    const [deleted] = collection.splice(index, 1);
    pushAuditLog(db, {
      ...actorFromReq(req),
      action: "delete",
      status: "success",
      resource: config.collection,
      entityId: id,
      entityName: summarizeEntity(config.collection, deleted),
      description: `Menghapus data ${config.collection}.`,
      changes: buildChangeSet(deleted, {})
    });

    await writeDb(db);
    return res.json({ message: "Data berhasil dihapus.", deleted });
  } catch (error) {
    next(error);
  }
});

export default router;
