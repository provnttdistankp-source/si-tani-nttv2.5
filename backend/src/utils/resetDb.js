import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, "../data");
const seedPath = path.join(dataDir, "db.seed.json");
const dbPath = path.join(dataDir, "db.json");

await fs.copyFile(seedPath, dbPath);
console.log("Database berhasil di-reset dari seed.");
