import express from "express";
import { readDb } from "../utils/db.js";
import { monthLabel } from "../utils/helpers.js";

const router = express.Router();

router.get("/home", async (req, res, next) => {
  try {
    const db = await readDb();

    const stats = {
      farmers: db.farmers.length,
      farmerGroups: db.farmerGroups.length,
      lands: db.lands.length,
      commodities: db.commodities.length,
      productions: db.productionData.length,
      activities: db.activities.length
    };

    const trendMap = new Map();
    for (const item of db.productionData) {
      const current = trendMap.get(item.month) || 0;
      trendMap.set(item.month, current + Number(item.productionTon || 0));
    }

    const productionTrend = [...trendMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, total]) => ({
        month: monthLabel(month),
        total: Number(total.toFixed(2))
      }));

    const featuredRegions = db.agriSummaries
      .slice()
      .sort((a, b) => b.totalAreaHa - a.totalAreaHa)
      .slice(0, 6);

    const mapPreview = db.mapLocations
      .filter((item) => item.category === "Kegiatan")
      .slice(0, 12);

    return res.json({
      app: db.meta.appName,
      subtitle: "Sistem Informasi Tani Nusa Tenggara Timur",
      stats,
      productionTrend,
      featuredRegions,
      mapPreview,
      latestActivities: db.activities.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
    });
  } catch (error) {
    next(error);
  }
});

export default router;
