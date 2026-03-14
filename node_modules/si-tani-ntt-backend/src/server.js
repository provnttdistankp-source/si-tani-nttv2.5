import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureDb } from "./utils/db.js";
import { authRequired } from "./middleware/auth.js";
import authRoutes from "./routes/auth.routes.js";
import publicRoutes from "./routes/public.routes.js";
import crudRoutes from "./routes/crud.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import mapRoutes from "./routes/map.routes.js";
import reportRoutes from "./routes/report.routes.js";
import lookupRoutes from "./routes/lookups.routes.js";
import auditRoutes from "./routes/audit.routes.js";
import importRoutes from "./routes/import.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number(process.env.PORT || 4000);

await ensureDb();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "si-tani-ntt-backend" });
});

app.use("/api/public", publicRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/lookups", authRequired, lookupRoutes);
app.use("/api/dashboard", authRequired, dashboardRoutes);
app.use("/api/map", authRequired, mapRoutes);
app.use("/api/reports", authRequired, reportRoutes);
app.use("/api/audit", authRequired, auditRoutes);
app.use("/api/import", authRequired, importRoutes);
app.use("/api", authRequired, crudRoutes);

const frontendDist = path.resolve(__dirname, "../../frontend/dist");
app.use(express.static(frontendDist));

app.use((req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  return res.sendFile(path.join(frontendDist, "index.html"));
});

app.use((req, res) => {
  res.status(404).json({ message: "Endpoint tidak ditemukan." });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: error.message || "Terjadi kesalahan pada server." });
});

app.listen(PORT, () => {
  console.log(`SI Tani NTT backend running on http://localhost:${PORT}`);
});
