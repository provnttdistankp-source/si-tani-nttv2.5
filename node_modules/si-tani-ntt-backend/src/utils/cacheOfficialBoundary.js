import { ensureDb, readDb } from './db.js';
import { cacheOfficialNttBoundary } from './officialBoundary.js';

await ensureDb();
const db = await readDb();
const result = await cacheOfficialNttBoundary(db);
console.log(`Boundary resmi NTT berhasil disimpan dari sumber ${result.source}. Fitur: ${result.validation.featureCount}.`);
