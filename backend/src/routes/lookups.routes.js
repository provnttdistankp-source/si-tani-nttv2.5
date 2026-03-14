import express from "express";
import { readDb } from "../utils/db.js";
import { getLookups } from "../utils/lookups.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const db = await readDb();
    return res.json(getLookups(db));
  } catch (error) {
    next(error);
  }
});

export default router;
