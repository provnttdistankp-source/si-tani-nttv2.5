import fs from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "node:url";
import { OFFICIAL_DATA_VERSION, OFFICIAL_DATASETS, OFFICIAL_STATS, PROGRAM_SUMMARIES, TEMPLATE_SHEETS } from "../data/officialData.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, "../data");
const seedPath = path.join(dataDir, "db.seed.json");
const dbPath = path.join(dataDir, "db.json");

function fallbackChairmanNik(index) {
  return String(5300000000000000 + index).slice(0, 16);
}

export async function ensureDb() {
  try {
    await fs.access(dbPath);
  } catch {
    await fs.copyFile(seedPath, dbPath);
  }

  const db = await readDb();
  let changed = false;

  if (!Array.isArray(db.auditLogs)) {
    db.auditLogs = [];
    changed = true;
  }

  if (!Array.isArray(db.commodityStats)) {
    db.commodityStats = [];
    changed = true;
  }

  if (!db.meta) {
    db.meta = {};
    changed = true;
  }

  if (db.meta.officialDataVersion !== OFFICIAL_DATA_VERSION) {
    db.officialDatasets = OFFICIAL_DATASETS;
    db.officialStats = OFFICIAL_STATS;
    db.programSummaries = PROGRAM_SUMMARIES;
    db.templateCatalog = TEMPLATE_SHEETS;
    db.meta.officialDataVersion = OFFICIAL_DATA_VERSION;
    changed = true;
  }

  if (!Array.isArray(db.officialDatasets)) {
    db.officialDatasets = OFFICIAL_DATASETS;
    changed = true;
  }

  if (!Array.isArray(db.officialStats)) {
    db.officialStats = OFFICIAL_STATS;
    changed = true;
  }

  if (!Array.isArray(db.programSummaries)) {
    db.programSummaries = PROGRAM_SUMMARIES;
    changed = true;
  }

  if (!Array.isArray(db.templateCatalog)) {
    db.templateCatalog = TEMPLATE_SHEETS;
    changed = true;
  }

  for (const [index, user] of (db.users || []).entries()) {
    if (!user.password?.startsWith("$2")) {
      user.password = await bcrypt.hash(user.password || "demo12345", 10);
      changed = true;
    }
    if (user.lastLoginAt === undefined) {
      user.lastLoginAt = null;
      changed = true;
    }
    if (user.lastLoginIp === undefined) {
      user.lastLoginIp = null;
      changed = true;
    }
    if (user.lastActivityAt === undefined) {
      user.lastActivityAt = null;
      changed = true;
    }
    if (!user.avatar) {
      user.avatar = user.name?.[0]?.toUpperCase() || String(index + 1);
      changed = true;
    }
  }

  for (const [index, group] of (db.farmerGroups || []).entries()) {
    if (!group.chairmanNik) {
      group.chairmanNik = fallbackChairmanNik(index + 1);
      changed = true;
    }
  }

  for (const [index, farmer] of (db.farmers || []).entries()) {
    if (!farmer.nik) {
      farmer.nik = String(5310000000000000 + index).slice(0, 16);
      changed = true;
    }
  }

  if (changed) {
    await writeDb(db);
  }

  return db;
}

export async function readDb() {
  const raw = await fs.readFile(dbPath, "utf-8");
  return JSON.parse(raw);
}

export async function writeDb(data) {
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2), "utf-8");
}

export function generateId(prefix, existing = []) {
  const max = existing.reduce((acc, item) => {
    const match = String(item.id || "").match(/(\d+)$/);
    return match ? Math.max(acc, Number(match[1])) : acc;
  }, 0);

  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

export const collectionPrefix = {
  users: "user",
  farmers: "far",
  farmerGroups: "grp",
  fieldOfficers: "off",
  commodities: "cmd",
  lands: "lnd",
  activities: "act",
  agriSummaries: "sum",
  reports: "rep",
  productionData: "prd",
  commodityStats: "cst",
  officialStats: "ofs",
  programSummaries: "pgm",
  regencies: "reg",
  districts: "dist",
  auditLogs: "log"
};
