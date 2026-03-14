import express from "express";
import { readDb } from "../utils/db.js";
import { allowRoles } from "../middleware/auth.js";
import { applySearchAndFilters, paginate, parseQuery, sortItems } from "../utils/helpers.js";

const router = express.Router();
router.use(allowRoles("admin"));

function hydrateLog(log, db) {
  const user = db.users.find((item) => item.id === log.actorId);
  return {
    ...log,
    actorName: user?.name || log.actorName || log.actorEmail || "Sistem",
    actorEmail: user?.email || log.actorEmail || "-",
    actorRole: user?.role || log.actorRole || "-"
  };
}

router.get("/summary", async (req, res, next) => {
  try {
    const db = await readDb();
    const logs = (db.auditLogs || []).map((log) => hydrateLog(log, db));
    const loginLogs = logs.filter((log) => log.action === "login" && log.status === "success");
    const failedLogins = logs.filter((log) => log.action === "login" && log.status === "failed");
    const changeLogs = logs.filter((log) => ["create", "update", "delete"].includes(log.action));
    const since = Date.now() - 24 * 60 * 60 * 1000;
    const changes24h = changeLogs.filter((log) => new Date(log.timestamp).getTime() >= since);

    const latestUserLogins = (db.users || [])
      .filter((item) => item.lastLoginAt)
      .sort((a, b) => new Date(b.lastLoginAt).getTime() - new Date(a.lastLoginAt).getTime())
      .slice(0, 10)
      .map((item) => ({
        id: item.id,
        name: item.name,
        email: item.email,
        role: item.role,
        lastLoginAt: item.lastLoginAt,
        lastLoginIp: item.lastLoginIp || "-"
      }));

    return res.json({
      stats: {
        totalLogs: logs.length,
        successfulLogins: loginLogs.length,
        failedLogins: failedLogins.length,
        dataChanges24h: changes24h.length,
        latestDataChangeAt: changeLogs[0]?.timestamp || null
      },
      latestUserLogins,
      recentChanges: changeLogs.slice(0, 12),
      recentFailures: failedLogins.slice(0, 8)
    });
  } catch (error) {
    next(error);
  }
});

router.get("/logs", async (req, res, next) => {
  try {
    const db = await readDb();
    const query = parseQuery(req.query);
    const hydrated = (db.auditLogs || []).map((log) => hydrateLog(log, db));
    const filtered = applySearchAndFilters(hydrated, query);
    const sorted = sortItems(filtered, query.sortBy || "timestamp", query.order || "desc");
    return res.json(paginate(sorted, query.page, query.limit));
  } catch (error) {
    next(error);
  }
});

export default router;
