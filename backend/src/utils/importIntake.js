const REGION_ALIASES = {
  "kabupaten kupang": "Kabupaten Kupang",
  "kota kupang": "Kota Kupang",
  "kab. kpg": "Kabupaten Kupang",
  "kab kpg": "Kabupaten Kupang",
  kpg: "Kabupaten Kupang",
  tts: "Kabupaten Timor Tengah Selatan",
  ttu: "Kabupaten Timor Tengah Utara",
  matim: "Kabupaten Manggarai Timur",
  mabar: "Kabupaten Manggarai Barat",
  flotim: "Kabupaten Flores Timur",
  sbd: "Kabupaten Sumba Barat Daya",
  "s. barat": "Kabupaten Sumba Barat",
  "s. tengah": "Kabupaten Sumba Tengah",
  "s. timur": "Kabupaten Sumba Timur",
  sabu: "Kabupaten Sabu Raijua",
  rote: "Kabupaten Rote Ndao",
  "timor tengah selatan": "Kabupaten Timor Tengah Selatan",
  "timor tengah utara": "Kabupaten Timor Tengah Utara",
  "manggarai barat": "Kabupaten Manggarai Barat",
  "manggarai timur": "Kabupaten Manggarai Timur",
  manggarai: "Kabupaten Manggarai",
  "sumba barat daya": "Kabupaten Sumba Barat Daya",
  "sumba barat": "Kabupaten Sumba Barat",
  "sumba tengah": "Kabupaten Sumba Tengah",
  "sumba timur": "Kabupaten Sumba Timur",
  "rote ndao": "Kabupaten Rote Ndao",
  "sabu raijua": "Kabupaten Sabu Raijua",
  "flores timur": "Kabupaten Flores Timur",
  alor: "Kabupaten Alor",
  belu: "Kabupaten Belu",
  ende: "Kabupaten Ende",
  lembata: "Kabupaten Lembata",
  nagekeo: "Kabupaten Nagekeo",
  ngada: "Kabupaten Ngada",
  sikka: "Kabupaten Sikka",
  malaka: "Kabupaten Malaka",
  ngad: "Kabupaten Ngada",
  angad: "Kabupaten Ngada"
};

const COMMODITY_HINTS = [
  "kopi arabika",
  "kopi robusta",
  "jambu mete",
  "jarak pagar",
  "kemiri sunan",
  "lontar aren",
  "marungga kelor",
  "kelapa",
  "kakao",
  "jagung",
  "padi",
  "asam",
  "cengkeh",
  "kapas",
  "kapuk",
  "lada",
  "lontar",
  "aren",
  "kemiri",
  "pala",
  "pinang",
  "sirih",
  "tembakau",
  "vanili"
];

const FAMILY_META = {
  "program-summary-2025": {
    familyLabel: "Sebaran Kegiatan 2025",
    mappedResource: "programSummaries",
    scope: "Kabupaten 2025",
    category: "operasional-program"
  },
  "program-summary-2024": {
    familyLabel: "Sebaran Kegiatan 2024",
    mappedResource: "programSummaries",
    scope: "Kabupaten 2024",
    category: "operasional-program"
  },
  "horticulture-bst": {
    familyLabel: "BST / Buah Sayuran Tahunan",
    mappedResource: "officialStats",
    scope: "Provinsi dan kabupaten/kota",
    category: "statistik-resmi"
  },
  "horticulture-sbs": {
    familyLabel: "SBS / Sayuran Buah Semusim",
    mappedResource: "officialStats",
    scope: "Provinsi dan kabupaten/kota",
    category: "statistik-resmi"
  },
  "horticulture-tbf": {
    familyLabel: "TBF / Tanaman Biofarmaka",
    mappedResource: "officialStats",
    scope: "Provinsi dan kabupaten/kota",
    category: "statistik-resmi"
  },
  "horticulture-th": {
    familyLabel: "TH / Florikultura",
    mappedResource: "officialStats",
    scope: "Provinsi dan kabupaten/kota",
    category: "statistik-resmi"
  },
  "horticulture-buah": {
    familyLabel: "Hortikultura Buah",
    mappedResource: "officialStats",
    scope: "Provinsi dan kabupaten/kota",
    category: "statistik-resmi"
  },
  "horticulture-sayur": {
    familyLabel: "Hortikultura Sayuran",
    mappedResource: "officialStats",
    scope: "Provinsi dan kabupaten/kota",
    category: "statistik-resmi"
  },
  "horticulture-obat": {
    familyLabel: "Hortikultura Biofarmaka / Obat",
    mappedResource: "officialStats",
    scope: "Provinsi dan kabupaten/kota",
    category: "statistik-resmi"
  },
  "plantation-commodity": {
    familyLabel: "Perkebunan per Komoditas",
    mappedResource: "officialStats",
    scope: "Komoditas lintas wilayah",
    category: "statistik-resmi"
  },
  "plantation-region": {
    familyLabel: "Perkebunan per Wilayah",
    mappedResource: "officialStats",
    scope: "Kabupaten/kota atau kecamatan",
    category: "statistik-resmi"
  },
  "plantation-province": {
    familyLabel: "Perkebunan tingkat Provinsi",
    mappedResource: "officialStats",
    scope: "Provinsi",
    category: "statistik-resmi"
  },
  "food-crops-provincial": {
    familyLabel: "Tanaman Pangan",
    mappedResource: "productionData / commodityStats",
    scope: "Provinsi dan kabupaten/kota",
    category: "statistik-resmi"
  },
  "food-crops-bps-ksa": {
    familyLabel: "Rilis KSA BPS",
    mappedResource: "officialStats",
    scope: "Provinsi / nasional",
    category: "referensi-pembanding"
  },
  unknown: {
    familyLabel: "Perlu klasifikasi manual",
    mappedResource: "review",
    scope: "Belum ditentukan",
    category: "perlu-review"
  }
};

const STATUS_LABELS = {
  "baseline-accepted": "Sudah terdaftar",
  "ready-review": "Siap review",
  "duplicate-skip": "Duplikat pasti",
  "duplicate-review": "Mirip, perlu cek",
  "needs-classification": "Perlu klasifikasi"
};

export function normalizeFileName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\(1\)/g, "")
    .replace(/\.pdf$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(value) {
  return String(value || "").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function extractYear(fileName) {
  const match = String(fileName || "").match(/20\d{2}/);
  return match ? Number(match[0]) : null;
}

export function detectCommodityHint(fileName) {
  const normalizedName = normalizeFileName(fileName);
  const match = COMMODITY_HINTS.find((item) => normalizedName.includes(item));
  return match ? titleCase(match) : null;
}

export function detectRegionFromFileName(fileName, regencies = []) {
  const normalizedName = normalizeFileName(fileName);
  const matches = [];

  for (const item of regencies) {
    for (const candidate of [item.name, item.fullName || item.name]) {
      const normalizedCandidate = normalizeFileName(candidate);
      if (normalizedCandidate && normalizedName.includes(normalizedCandidate)) {
        matches.push({ alias: normalizedCandidate, regionName: item.fullName || item.name, regionCode: item.code });
      }
    }
  }

  for (const [alias, regionName] of Object.entries(REGION_ALIASES)) {
    const normalizedAlias = normalizeFileName(alias);
    if (normalizedAlias && normalizedName.includes(normalizedAlias)) {
      const regency = regencies.find((item) => (item.fullName || item.name) === regionName);
      matches.push({ alias: normalizedAlias, regionName, regionCode: regency?.code || null });
    }
  }

  matches.sort((a, b) => b.alias.length - a.alias.length);
  return matches[0] || { regionName: null, regionCode: null };
}

export function classifyFileName(fileName, regencies = []) {
  const normalizedName = normalizeFileName(fileName);
  const year = extractYear(fileName);
  const region = detectRegionFromFileName(fileName, regencies);
  const hasRegion = Boolean(region.regionName);

  let family = "unknown";
  if (year === 2025 && hasRegion && !normalizedName.includes("atap") && !normalizedName.includes("angka tetap") && !normalizedName.includes("ntt 2023")) {
    family = "program-summary-2025";
  } else if (normalizedName.startsWith("2024 ") && hasRegion) {
    family = "program-summary-2024";
  } else if (normalizedName.includes("ksa bps")) {
    family = "food-crops-bps-ksa";
  } else if (normalizedName.includes("bst") && (normalizedName.includes("angka tetap") || normalizedName.includes("atap buah sayuran tahunan"))) {
    family = "horticulture-bst";
  } else if (normalizedName.includes("sbs") && (normalizedName.includes("angka tetap") || normalizedName.includes("atap"))) {
    family = "horticulture-sbs";
  } else if (normalizedName.includes("tbf") && (normalizedName.includes("angka tetap") || normalizedName.includes("atap"))) {
    family = "horticulture-tbf";
  } else if (/\bth\b/.test(normalizedName) && (normalizedName.includes("angka tetap") || normalizedName.includes("atap"))) {
    family = "horticulture-th";
  } else if (normalizedName.includes("buah") && (normalizedName.includes("atap") || year === 2020) && !normalizedName.includes("bst")) {
    family = "horticulture-buah";
  } else if (normalizedName.includes("sayur") && (normalizedName.includes("atap") || year === 2020) && !normalizedName.includes("buah sayuran tahunan")) {
    family = "horticulture-sayur";
  } else if ((normalizedName.includes("obat") && year === 2020) || normalizedName.includes("biofarmaka")) {
    family = "horticulture-obat";
  } else if (normalizedName.includes("tanaman pangan") || normalizedName.startsWith("atap tp") || normalizedName.includes("data produksi tp") || normalizedName.includes("atap pangan")) {
    family = "food-crops-provincial";
  } else if (normalizedName.startsWith("atap bun") && normalizedName.includes("provinsi")) {
    family = "plantation-province";
  } else if ((normalizedName.includes("ntt 2023") && hasRegion) || (normalizedName.startsWith("atap bun") && hasRegion)) {
    family = "plantation-region";
  } else if (normalizedName.startsWith("atap bun") && (normalizedName.includes("per komoditi") || normalizedName.includes("perkomoditi") || Boolean(detectCommodityHint(fileName)))) {
    family = "plantation-commodity";
  }

  return {
    family,
    ...FAMILY_META[family],
    year,
    ...region,
    commodityHint: detectCommodityHint(fileName)
  };
}

function buildRecommendation(entry) {
  if (entry.status === "duplicate-skip") return "Lewati karena dokumen yang sama sudah terdaftar.";
  if (entry.status === "duplicate-review") return "Bandingkan dengan dokumen dasar yang sudah ada. Nama file sama atau sangat mirip.";
  if (entry.family.startsWith("program-summary")) return "Masukkan ke staging programSummaries. Jangan membuat NIK, koordinat, atau jumlah anggota baru jika dokumen tidak memuatnya.";
  if (entry.family.startsWith("horticulture") || entry.family.startsWith("food-crops")) return "Masukkan ke officialStats atau productionData dengan indikator, nilai, satuan, dan tahun asli tanpa mengubah struktur resmi.";
  if (entry.family.startsWith("plantation")) return "Masukkan ke officialStatsDetail atau officialStats sesuai level data. Pertahankan TBM, TM, TT/TR, jumlah areal, produksi, produktivitas, dan jumlah KK.";
  return "Perlu klasifikasi manual sebelum masuk staging.";
}

export function enrichRegistryEntries(entries = []) {
  const byId = new Map(entries.map((item) => [item.id, item]));
  return entries.map((item) => ({
    ...item,
    activeSource: item.activeSource ?? ["baseline-accepted", "ready-review"].includes(item.status),
    statusLabel: STATUS_LABELS[item.status] || item.status,
    duplicateOfName: item.duplicateOf ? byId.get(item.duplicateOf)?.fileName || null : null,
    recommendation: item.recommendation || buildRecommendation(item)
  }));
}

export function summarizeRegistry(entries = []) {
  const enriched = enrichRegistryEntries(entries);
  const families = [...new Set(enriched.map((item) => item.familyLabel).filter(Boolean))].sort();
  const years = [...new Set(enriched.map((item) => item.year).filter(Boolean))].sort((a, b) => b - a);
  const statuses = [...new Set(enriched.map((item) => item.status))].sort();

  return {
    total: enriched.length,
    activeSource: enriched.filter((item) => item.activeSource).length,
    duplicates: enriched.filter((item) => item.status === "duplicate-skip" || item.status === "duplicate-review").length,
    readyReview: enriched.filter((item) => item.status === "ready-review").length,
    baseline: enriched.filter((item) => item.status === "baseline-accepted").length,
    needsClassification: enriched.filter((item) => item.status === "needs-classification").length,
    families,
    years,
    statuses,
    sourceBuckets: [...new Set(enriched.map((item) => item.sourceBucket))].sort(),
    byFamily: families.map((familyLabel) => ({
      familyLabel,
      count: enriched.filter((item) => item.familyLabel === familyLabel).length
    })),
    byStatus: statuses.map((status) => ({
      status,
      label: STATUS_LABELS[status] || status,
      count: enriched.filter((item) => item.status === status).length
    }))
  };
}

export function filterRegistryEntries(entries = [], filters = {}) {
  const search = normalizeFileName(filters.search || "");
  return enrichRegistryEntries(entries).filter((item) => {
    if (filters.status && item.status !== filters.status) return false;
    if (filters.family && item.family !== filters.family) return false;
    if (filters.year && String(item.year || "") !== String(filters.year)) return false;
    if (filters.sourceBucket && item.sourceBucket !== filters.sourceBucket) return false;
    if (!search) return true;
    const haystack = normalizeFileName([
      item.fileName,
      item.familyLabel,
      item.regionName,
      item.regionCode,
      item.commodityHint,
      item.mappedResource,
      item.recommendation
    ].filter(Boolean).join(" "));
    return haystack.includes(search);
  });
}

export function analyzeManifestItems(items = [], existingEntries = [], regencies = []) {
  const registry = enrichRegistryEntries(existingEntries);
  const byHash = new Map(registry.filter((item) => item.fileHash).map((item) => [item.fileHash, item]));
  const byNormalizedName = new Map(registry.map((item) => [normalizeFileName(item.fileName), item]));

  const entries = items
    .map((item, index) => {
      const fileName = String(item.fileName || item.name || item.filename || "").trim();
      if (!fileName) return null;
      const classification = classifyFileName(fileName, regencies);
      const fileHash = item.fileHash || item.hash || null;
      const normalizedName = normalizeFileName(fileName);
      const duplicate = fileHash ? byHash.get(fileHash) : byNormalizedName.get(normalizedName);
      const duplicateType = fileHash && duplicate ? "exact-hash" : duplicate ? "same-normalized-name" : null;
      const status = duplicate ? (duplicateType === "exact-hash" ? "duplicate-skip" : "duplicate-review") : classification.family === "unknown" ? "needs-classification" : "ready-review";
      return {
        id: `manifest-${String(index + 1).padStart(3, "0")}`,
        sourceBucket: "manifest-analysis",
        fileName,
        fileHash,
        fileSize: item.fileSize || item.size || null,
        extension: fileName.toLowerCase().endsWith(".pdf") ? "pdf" : null,
        ...classification,
        status,
        statusLabel: STATUS_LABELS[status] || status,
        duplicateOf: duplicate?.id || null,
        duplicateOfName: duplicate?.fileName || null,
        duplicateType,
        activeSource: !duplicate && classification.family !== "unknown",
        authoritative: true,
        importable: !duplicate && classification.family !== "unknown",
        sourceKind: "manifest-upload",
        recommendation: buildRecommendation({ ...classification, status })
      };
    })
    .filter(Boolean);

  return {
    summary: summarizeRegistry(entries),
    entries
  };
}
