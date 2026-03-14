import { generateId } from "./db.js";

const MAX_AUDIT_LOGS = 1500;

function cleanObject(input) {
  if (!input || typeof input !== "object") return {};
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

export function summarizeEntity(resource, record = {}) {
  const names = [record.name, record.title, record.email, record.nik, record.chairmanNik].filter(Boolean);
  if (names.length) return names.join(" · ");
  return `${resource || "record"} ${record.id || "baru"}`;
}

export function buildChangeSet(previous = {}, next = {}) {
  const keys = new Set([...Object.keys(previous || {}), ...Object.keys(next || {})]);
  const changes = [];
  for (const key of keys) {
    if (["password", "avatar", "groupDetail", "farmerDetail", "commodityDetail", "regencyDetail", "districtDetail"].includes(key)) continue;
    const before = previous?.[key];
    const after = next?.[key];
    if (JSON.stringify(before) === JSON.stringify(after)) continue;
    changes.push({ key, before, after });
  }
  return changes.slice(0, 20);
}

export function pushAuditLog(db, payload = {}) {
  if (!db.auditLogs) db.auditLogs = [];
  const entry = {
    id: generateId("log", db.auditLogs),
    timestamp: new Date().toISOString(),
    action: payload.action || "view",
    status: payload.status || "success",
    resource: payload.resource || "system",
    entityId: payload.entityId || null,
    entityName: payload.entityName || null,
    description: payload.description || "",
    actorId: payload.actorId || null,
    actorName: payload.actorName || payload.actorEmail || "Sistem",
    actorEmail: payload.actorEmail || null,
    actorRole: payload.actorRole || null,
    ip: payload.ip || null,
    userAgent: payload.userAgent || null,
    changes: Array.isArray(payload.changes) ? payload.changes : [],
    metadata: cleanObject(payload.metadata)
  };

  db.auditLogs.unshift(entry);
  if (db.auditLogs.length > MAX_AUDIT_LOGS) {
    db.auditLogs = db.auditLogs.slice(0, MAX_AUDIT_LOGS);
  }
  return entry;
}
