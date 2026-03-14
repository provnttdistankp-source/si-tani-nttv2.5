import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  FolderKanban,
  ScanSearch,
  ShieldCheck,
  Upload
} from "lucide-react";
import { api } from "../lib/api";
import { Button, Card, Input, PageHeader, Select, Textarea, Toast } from "../components/UI";

const structureFamilies = [
  { title: "Tanaman Pangan", destination: "productionData / commodityStats", fields: ["Kabupaten/Kota", "Luas Tanam", "Luas Panen", "Produktivitas", "Produksi"], note: "Cocok untuk rilis tanaman pangan seperti padi, jagung, kacang, ubi, dan sorgum per tahun atau per subround." },
  { title: "BST dan Buah Tahunan", destination: "officialStats", fields: ["Komoditi", "Kabupaten/Kota", "Jumlah atau Luas Tanaman", "Tanaman Produktif atau Luas Panen", "Produksi", "Produktivitas"], note: "Dipakai untuk buah sayuran tahunan atau buah tahunan. Struktur indikator tetap harus dipertahankan sesuai dokumen resmi." },
  { title: "SBS", destination: "officialStats", fields: ["Komoditi", "Kabupaten/Kota", "Luas Tanam", "Luas Panen", "Produksi", "Produktivitas"], note: "Cocok untuk sayuran buah semusim seperti cabai, tomat, mentimun, dan sejenisnya." },
  { title: "TBF dan TH", destination: "officialStats", fields: ["Komoditi", "Kabupaten/Kota", "Luas Tanam", "Luas Panen", "Produksi", "Produktivitas"], note: "Biofarmaka dan florikultura perlu menjaga satuan asli seperti kilogram, meter persegi, pot, atau tangkai." },
  { title: "Perkebunan", destination: "officialStats", fields: ["Komoditi", "TBM", "TM", "TT/TR", "Jumlah", "Produksi", "Produktivitas", "Jumlah KK"], note: "Struktur ini cocok untuk kelapa dan komoditas perkebunan lain. Jangan menghapus fase tanaman karena itu bagian inti analisis." },
  { title: "Sebaran Kegiatan 2025", destination: "programSummaries / farmerGroups / farmers", fields: ["Nama Kegiatan", "Sumber Dana", "Sasaran atau Volume", "Kabupaten", "Kecamatan", "Desa", "Kelompok Tani", "Ketua Poktan", "Keterangan"], note: "Cocok untuk impor program bantuan, lokasi kegiatan, poktan, dan ketua poktan hasil dokumen sebaran kegiatan kabupaten." }
];

const importConfigs = {
  officialStats: {
    title: "Statistik resmi komoditas",
    description: "Gunakan untuk memuat tabel resmi per komoditas dari PDF rilis yang sudah ditranskrip ke XLSX, CSV, atau JSON. Resource ini menjadi jalur utama untuk BST, SBS, TBF, TH, dan statistik perkebunan.",
    required: ["datasetType", "year", "commodityName"],
    sample: [{ datasetType: "BST", year: 2024, commodityName: "Alpukat", regencyName: "Timor Tengah Selatan", scope: "regency", categoryGroup: "Buah Sayuran Tahunan", metric1Label: "Jumlah Tanaman", metric1Value: 625642, metric1Unit: "pohon", metric2Label: "Tanaman Produktif", metric2Value: 153365, metric2Unit: "pohon", productionValue: 4870.5, productionUnit: "ton", productivityValue: 31.76, productivityUnit: "kg/pohon", sourceDataset: "Angka Tetap BST 2024", sourceInstitution: "Dinas Pertanian dan Ketahanan Pangan Provinsi NTT" }]
  },
  programSummaries: {
    title: "Sebaran kegiatan resmi",
    description: "Gunakan untuk mengimpor daftar program, bantuan, volume, anggaran, kecamatan, desa, poktan, dan ketua dari dokumen sebaran kegiatan kabupaten.",
    required: ["year", "activityName", "regencyName"],
    sample: [{ year: 2025, regencyName: "Manggarai", districtName: "Ruteng", village: "Compang Namut", activityName: "Pekarangan Pangan Lestari (1 Kelompok)", fundingSource: "APBD", volume: "7 KK", budgetRp: 11089680, farmerGroupName: "Mudah Berkarya", chairman: "Yohanes D. Moa", notes: "Contoh format struktur berdasarkan dokumen resmi." }]
  },
  productionData: {
    title: "Produksi terukur per bulan",
    description: "Gunakan untuk data produksi berkala aplikasi jika Anda sudah menurunkan data resmi ke seri bulanan atau triwulan.",
    required: ["commodityName", "regencyName", "month", "productionTon"],
    sample: [{ commodityName: "Padi", regencyName: "Manggarai Barat", month: "2024-12", areaHa: 8057.4, productionTon: 37063, productivityTonHa: 4.6, source: "ATAP Tanaman Pangan 2024", sourceInstitution: "BPS Provinsi NTT" }]
  },
  farmerGroups: {
    title: "Kelompok tani",
    description: "Gunakan untuk poktan baru atau pembaruan poktan bila ada hasil verifikasi lapangan. NIK ketua harus unik.",
    required: ["name", "chairman", "chairmanNik", "regencyName", "districtName"],
    sample: [{ name: "Poktan Sejahtera", chairman: "Paulus Tefa", chairmanNik: "5311991101010001", regencyName: "Kupang", districtName: "Amarasi", village: "Baumata", membersCount: 25, latitude: -10.165, longitude: 123.671 }]
  },
  farmers: {
    title: "Petani",
    description: "Gunakan untuk data petani berbasis NIK unik yang sudah diverifikasi dan terkait ke poktan.",
    required: ["name", "nik", "farmerGroupName", "regencyName", "districtName"],
    sample: [{ name: "Paulus Tefa", nik: "5311991101010001", farmerGroupName: "Poktan Sejahtera", regencyName: "Kupang", districtName: "Amarasi", address: "Baumata", gender: "L", age: 43, latitude: -10.165, longitude: 123.671 }]
  }
};

const STATUS_LABELS = {
  "baseline-accepted": "Sudah terdaftar",
  "ready-review": "Siap review",
  "duplicate-skip": "Duplikat pasti",
  "duplicate-review": "Mirip, perlu cek",
  "needs-classification": "Perlu klasifikasi"
};

function normalizeName(value) {
  return String(value || "").toLowerCase().replace(/_/g, " ").replace(/-/g, " ").replace(/\(1\)/g, "").replace(/\.pdf$/i, "").replace(/\s+/g, " ").trim();
}

function parseWorkbook(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target.result, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        resolve(XLSX.utils.sheet_to_json(sheet, { defval: "" }));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error("Gagal membaca file impor."));
    reader.readAsArrayBuffer(file);
  });
}

function downloadTemplate(resource) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(importConfigs[resource].sample), "Template");
  XLSX.writeFile(workbook, `template-${resource}.xlsx`);
}

function exportRegistry(entries) {
  const workbook = XLSX.utils.book_new();
  const rows = entries.map((item) => ({ NamaFile: item.fileName, Tahun: item.year, Keluarga: item.familyLabel, Wilayah: item.regionName, KodeWilayah: item.regionCode, Resource: item.mappedResource, Status: item.statusLabel, BucketSumber: item.sourceBucket, AktifDipakai: item.activeSource ? "Ya" : "Tidak", DuplikatDari: item.duplicateOfName || "", Rekomendasi: item.recommendation }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Registry");
  XLSX.writeFile(workbook, "registry-dataset-resmi.xlsx");
}

function Badge({ tone = "slate", children }) {
  const styles = { slate: "bg-slate-100 text-slate-700", emerald: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700", red: "bg-red-50 text-red-700", blue: "bg-blue-50 text-blue-700" };
  return <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${styles[tone]}`}>{children}</span>;
}

function toneForStatus(status) {
  if (status === "baseline-accepted") return "emerald";
  if (status === "ready-review") return "blue";
  if (status === "duplicate-skip") return "red";
  if (status === "duplicate-review") return "amber";
  return "slate";
}

function classifyNameLocally(fileName, registry) {
  const normalized = normalizeName(fileName);
  const existing = registry.find((item) => normalizeName(item.fileName) === normalized);
  if (existing) {
    const status = existing.fileHash ? "duplicate-review" : existing.status;
    return { ...existing, status: status === "baseline-accepted" ? "duplicate-review" : status, statusLabel: STATUS_LABELS[status === "baseline-accepted" ? "duplicate-review" : status], duplicateOfName: existing.fileName };
  }
  const family = normalized.includes("bst") ? "BST / Buah Sayuran Tahunan"
    : normalized.includes("sbs") ? "SBS / Sayuran Buah Semusim"
    : normalized.includes("tbf") ? "TBF / Tanaman Biofarmaka"
    : /\bth\b/.test(normalized) ? "TH / Florikultura"
    : normalized.includes("atap bun") ? "Perkebunan"
    : normalized.includes("tanaman pangan") || normalized.includes("atap tp") || normalized.includes("padi") || normalized.includes("jagung") ? "Tanaman Pangan"
    : normalized.includes("2025") ? "Sebaran Kegiatan 2025"
    : normalized.startsWith("2024 ") ? "Sebaran Kegiatan 2024"
    : "Perlu klasifikasi manual";
  const status = family === "Perlu klasifikasi manual" ? "needs-classification" : "ready-review";
  return { id: `manifest-${normalized}`, fileName, familyLabel: family, regionName: null, mappedResource: family.includes("Kegiatan") ? "programSummaries" : "officialStats", status, statusLabel: STATUS_LABELS[status], duplicateOfName: null, recommendation: status === "needs-classification" ? "Perlu klasifikasi manual sebelum masuk staging." : "Siapkan ke staging lalu validasi mapping kolom sebelum impor final.", activeSource: status === "ready-review" };
}

export default function ImportPage() {
  const [resource, setResource] = useState("officialStats");
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [catalog, setCatalog] = useState({ datasets: [], templateCatalog: [], registrySummary: null, importRegistry: [], registryFilters: { families: [], years: [], statuses: [], sourceBuckets: [] } });
  const [registryFilters, setRegistryFilters] = useState({ status: "", family: "", year: "", sourceBucket: "", search: "" });
  const [manifestText, setManifestText] = useState("");
  const [manifestResult, setManifestResult] = useState(null);

  useEffect(() => {
    api.get("/api/import/catalog").then(setCatalog).catch(console.error);
  }, []);

  const config = importConfigs[resource];

  const missingColumns = useMemo(() => {
    if (!rows.length) return [];
    const row = rows[0] || {};
    return config.required.filter((field) => !(field in row));
  }, [rows, config]);

  const registryEntries = useMemo(() => {
    const search = normalizeName(registryFilters.search);
    return (catalog.importRegistry || []).filter((item) => {
      if (registryFilters.status && item.status !== registryFilters.status) return false;
      if (registryFilters.family && item.family !== registryFilters.family) return false;
      if (registryFilters.year && String(item.year || "") !== String(registryFilters.year)) return false;
      if (registryFilters.sourceBucket && item.sourceBucket !== registryFilters.sourceBucket) return false;
      if (!search) return true;
      return normalizeName([item.fileName, item.familyLabel, item.regionName, item.recommendation, item.mappedResource].filter(Boolean).join(" ")).includes(search);
    });
  }, [catalog.importRegistry, registryFilters]);

  const familyOptions = useMemo(() => {
    const seen = new Map();
    for (const item of catalog.importRegistry || []) if (!seen.has(item.family)) seen.set(item.family, item.familyLabel);
    return Array.from(seen.entries()).map(([family, label]) => ({ family, label }));
  }, [catalog.importRegistry]);

  const onSelectFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseWorkbook(file);
      setRows(parsed);
      setFileName(file.name);
      setResult(null);
      if (!parsed.length) setToast({ type: "error", message: "Tidak ada baris yang terbaca dari file." });
    } catch (error) {
      setToast({ type: "error", message: error.message });
    }
  };

  const onImport = async () => {
    if (!rows.length) return setToast({ type: "error", message: "Pilih file data terlebih dahulu." });
    if (missingColumns.length) return setToast({ type: "error", message: `Kolom wajib belum lengkap: ${missingColumns.join(", ")}` });
    setLoading(true);
    try {
      const payload = await api.post(`/api/import/${resource}`, { rows, mode: "upsert" });
      setResult(payload);
      setToast({ type: "success", message: payload.message || "Impor data selesai." });
    } catch (error) {
      setToast({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const onAnalyzeManifest = () => {
    if (!manifestText.trim()) return setToast({ type: "error", message: "Tempel daftar nama file terlebih dahulu." });
    const entries = manifestText.split(/\r?\n/g).map((line) => line.trim()).filter(Boolean).map((name) => classifyNameLocally(name, catalog.importRegistry || []));
    const summary = {
      activeSource: entries.filter((item) => item.activeSource).length,
      duplicates: entries.filter((item) => item.duplicateOfName).length,
      needsClassification: entries.filter((item) => item.status === "needs-classification").length
    };
    setManifestResult({ summary, entries });
    setToast({ type: "success", message: `Berhasil menganalisis ${entries.length} nama file.` });
  };

  const registrySummary = catalog.registrySummary;

  return (
    <div className="space-y-6">
      <PageHeader title="Pusat impor dan registry dataset resmi" subtitle="Dataset ZIP resmi yang Anda unggah sudah ditanam ke aplikasi sebagai registry sumber aktif. File duplikat otomatis tidak dihitung dua kali." action={<Button variant="secondary" onClick={() => downloadTemplate(resource)}><Download size={16} />Unduh template aktif</Button>} />

      <Card className="border-amber-200 bg-amber-50/70 p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-amber-100 p-3 text-amber-700"><ShieldCheck size={18} /></div>
          <div>
            <h3 className="text-lg font-semibold text-amber-950">Dataset resmi sudah ditanam sebagai sumber aplikasi</h3>
            <p className="mt-2 text-sm leading-6 text-amber-900">Dokumen PDF resmi dari ZIP terbaru sudah masuk sebagai <span className="font-semibold">registry dataset</span> yang dipakai aplikasi untuk deduplikasi, klasifikasi keluarga dokumen, dan acuan impor berikutnya. File <span className="font-semibold">Tabel.xlsx</span> tetap hanya diperlakukan sebagai acuan format tabel, bukan sumber angka.</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="p-5"><div className="flex items-start justify-between"><div><div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Total dokumen</div><div className="mt-3 text-3xl font-bold text-slate-900">{registrySummary?.total || 0}</div></div><Database className="text-slate-400" size={22} /></div></Card>
        <Card className="p-5"><div className="flex items-start justify-between"><div><div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Aktif dipakai</div><div className="mt-3 text-3xl font-bold text-emerald-700">{registrySummary?.activeSource || 0}</div></div><CheckCircle2 className="text-emerald-500" size={22} /></div></Card>
        <Card className="p-5"><div className="flex items-start justify-between"><div><div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Duplikat</div><div className="mt-3 text-3xl font-bold text-red-600">{registrySummary?.duplicates || 0}</div></div><AlertCircle className="text-red-400" size={22} /></div></Card>
        <Card className="p-5"><div className="flex items-start justify-between"><div><div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Siap review</div><div className="mt-3 text-3xl font-bold text-blue-700">{registrySummary?.readyReview || 0}</div></div><FolderKanban className="text-blue-500" size={22} /></div></Card>
        <Card className="p-5"><div className="flex items-start justify-between"><div><div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Perlu klasifikasi</div><div className="mt-3 text-3xl font-bold text-amber-700">{registrySummary?.needsClassification || 0}</div></div><ScanSearch className="text-amber-500" size={22} /></div></Card>
      </div>

      <div className="space-y-4">
        <div><h3 className="text-lg font-semibold text-slate-900">Analisis struktur data untuk impor berikutnya</h3><p className="mt-1 text-sm text-slate-500">Bagian ini menjelaskan pola kolom resmi yang paling aman dipakai saat menyalin angka dari PDF rilis atau saat menyiapkan file kerja baru.</p></div>
        <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">{structureFamilies.map((item) => (<Card key={item.title} className="p-5"><div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Masuk ke {item.destination}</div><h3 className="mt-2 text-lg font-semibold text-slate-900">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{item.note}</p><div className="mt-4 flex flex-wrap gap-2">{item.fields.map((field) => <span key={field} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{field}</span>)}</div></Card>))}</div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="p-5">
          <div className="grid gap-4 lg:grid-cols-[260px_1fr_auto]">
            <Select label="Jenis resource" value={resource} onChange={(e) => { setResource(e.target.value); setRows([]); setResult(null); }}>
              {Object.entries(importConfigs).map(([key, value]) => <option key={key} value={key}>{value.title}</option>)}
            </Select>
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">File impor</span><input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900" type="file" accept=".xlsx,.xls,.csv,.json" onChange={onSelectFile} /></label>
            <div className="flex items-end"><Button onClick={onImport} disabled={loading}>{loading ? "Memproses..." : <><Upload size={16} />Mulai impor</>}</Button></div>
          </div>
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600"><p className="font-semibold text-slate-900">{config.title}</p><p className="mt-1 leading-6">{config.description}</p><p className="mt-2 text-xs text-slate-500">Kolom wajib: {config.required.join(", ")}</p>{fileName ? <p className="mt-2 text-xs text-emerald-700">File aktif: {fileName}</p> : null}</div>
        </Card>

        <Card className="p-5">
          <h3 className="text-lg font-semibold text-slate-900">Ringkasan kesiapan data</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-700"><p className="text-xs font-semibold uppercase">File resmi</p><p className="mt-2 text-2xl font-bold">{catalog.datasets.filter((item) => item.authoritative).length}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4 text-slate-700"><p className="text-xs font-semibold uppercase">Template sheet</p><p className="mt-2 text-2xl font-bold">{catalog.templateCatalog.length}</p></div>
            <div className="rounded-2xl bg-blue-50 p-4 text-blue-700"><p className="text-xs font-semibold uppercase">Resource impor</p><p className="mt-2 text-2xl font-bold">{Object.keys(importConfigs).length}</p></div>
          </div>
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Jalur impor yang disarankan: <span className="font-semibold text-slate-900">PDF resmi → registry dataset → staging terstruktur → validasi kolom → impor ke resource yang sesuai</span>.</div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4"><h3 className="text-lg font-semibold text-slate-900">Pratinjau file impor</h3><p className="mt-1 text-sm text-slate-500">Baris pertama sampai kelima ditampilkan untuk validasi cepat sebelum impor.</p></div>
          <div className="p-5">{!rows.length ? <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">Belum ada file yang dipilih.</div> : <div className="space-y-4">{missingColumns.length ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">Kolom wajib belum lengkap: {missingColumns.join(", ")}</div> : <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Struktur kolom inti terbaca dengan baik. Total baris: {rows.length}.</div>}<div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr>{Object.keys(rows[0] || {}).map((column) => <th key={column} className="px-3 py-2 font-semibold">{column}</th>)}</tr></thead><tbody>{rows.slice(0, 5).map((row, index) => <tr key={index} className="border-t border-slate-100">{Object.keys(rows[0] || {}).map((column) => <td key={column} className="px-3 py-2 text-slate-700">{String(row[column] ?? "-")}</td>)}</tr>)}</tbody></table></div></div>}</div>
        </Card>

        <Card className="p-5">
          <h3 className="text-lg font-semibold text-slate-900">Hasil proses impor</h3>
          {!result ? <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">Belum ada hasil impor. Setelah proses selesai, ringkasan insert, update, dan error akan muncul di sini.</div> : <div className="mt-4 space-y-4"><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-emerald-50 p-4 text-emerald-700"><p className="text-xs font-semibold uppercase">Inserted</p><p className="mt-2 text-2xl font-bold">{result.inserted}</p></div><div className="rounded-2xl bg-blue-50 p-4 text-blue-700"><p className="text-xs font-semibold uppercase">Updated</p><p className="mt-2 text-2xl font-bold">{result.updated}</p></div><div className="rounded-2xl bg-amber-50 p-4 text-amber-700"><p className="text-xs font-semibold uppercase">Skipped</p><p className="mt-2 text-2xl font-bold">{result.skipped}</p></div></div>{result.errors?.length ? <div className="space-y-2"><div className="flex items-center gap-2 text-sm font-semibold text-red-700"><AlertCircle size={16} />Baris yang perlu diperbaiki</div>{result.errors.slice(0, 10).map((error) => <div key={`${error.row}-${error.message}`} className="rounded-2xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">Baris {error.row}: {error.message}</div>)}</div> : <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"><CheckCircle2 size={16} />Tidak ada error impor pada batch ini.</div>}</div>}
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h3 className="text-lg font-semibold text-slate-900">Registry dataset resmi dan deduplikasi</h3><p className="mt-1 text-sm text-slate-500">Semua PDF resmi dari upload lama dan Dataset.zip sudah didaftarkan. File duplikat ditandai otomatis agar tidak dipakai dua kali.</p></div><Button variant="secondary" onClick={() => exportRegistry(registryEntries)}><Download size={16} />Unduh registry terfilter</Button></div>
        <div className="mt-4 grid gap-3 lg:grid-cols-5">
          <Select label="Status" value={registryFilters.status} onChange={(e) => setRegistryFilters((prev) => ({ ...prev, status: e.target.value }))}><option value="">Semua status</option>{catalog.registryFilters.statuses.map((item) => <option key={item} value={item}>{item}</option>)}</Select>
          <Select label="Keluarga dokumen" value={registryFilters.family} onChange={(e) => setRegistryFilters((prev) => ({ ...prev, family: e.target.value }))}><option value="">Semua keluarga</option>{familyOptions.map((item) => <option key={item.family} value={item.family}>{item.label}</option>)}</Select>
          <Select label="Tahun" value={registryFilters.year} onChange={(e) => setRegistryFilters((prev) => ({ ...prev, year: e.target.value }))}><option value="">Semua tahun</option>{catalog.registryFilters.years.map((item) => <option key={item} value={item}>{item}</option>)}</Select>
          <Select label="Bucket sumber" value={registryFilters.sourceBucket} onChange={(e) => setRegistryFilters((prev) => ({ ...prev, sourceBucket: e.target.value }))}><option value="">Semua bucket</option>{catalog.registryFilters.sourceBuckets.map((item) => <option key={item} value={item}>{item}</option>)}</Select>
          <Input label="Cari file" placeholder="mis. kelapa, kupang, 2025" value={registryFilters.search} onChange={(e) => setRegistryFilters((prev) => ({ ...prev, search: e.target.value }))} />
        </div>
        <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">Menampilkan <span className="font-semibold text-slate-900">{registryEntries.length}</span> dari <span className="font-semibold text-slate-900">{registrySummary?.total || 0}</span> dokumen yang sudah ditanam di aplikasi.</div>
        <div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-3 py-2 font-semibold">Nama file</th><th className="px-3 py-2 font-semibold">Keluarga</th><th className="px-3 py-2 font-semibold">Tahun</th><th className="px-3 py-2 font-semibold">Wilayah</th><th className="px-3 py-2 font-semibold">Status</th><th className="px-3 py-2 font-semibold">Dipakai</th><th className="px-3 py-2 font-semibold">Catatan</th></tr></thead><tbody>{registryEntries.slice(0, 120).map((item) => <tr key={item.id} className="border-t border-slate-100 align-top"><td className="px-3 py-3"><div className="font-medium text-slate-900">{item.fileName}</div><div className="mt-1 text-xs text-slate-500">{item.sourceBucket} · {item.mappedResource}</div></td><td className="px-3 py-3 text-slate-700">{item.familyLabel}</td><td className="px-3 py-3 text-slate-700">{item.year || "-"}</td><td className="px-3 py-3 text-slate-700">{item.regionName || item.scope}</td><td className="px-3 py-3"><Badge tone={toneForStatus(item.status)}>{item.statusLabel}</Badge></td><td className="px-3 py-3">{item.activeSource ? <Badge tone="emerald">Aktif</Badge> : <Badge tone="slate">Tidak</Badge>}</td><td className="px-3 py-3 text-xs leading-6 text-slate-500">{item.duplicateOfName ? <div className="mb-1 text-red-600">Duplikat dari: {item.duplicateOfName}</div> : null}{item.recommendation}</td></tr>)}</tbody></table></div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="p-5">
          <h3 className="text-lg font-semibold text-slate-900">Analisis cepat daftar nama file</h3>
          <p className="mt-1 text-sm text-slate-500">Tempel daftar nama file PDF untuk melihat keluarga dokumen, wilayah, dan potensi duplikat sebelum file masuk ke staging.</p>
          <div className="mt-4 space-y-4"><Textarea label="Daftar nama file" placeholder={"Alor 2025.pdf\nATAP BUN 2020 KELAPA.pdf\nATAP TP 2022.pdf"} value={manifestText} onChange={(e) => setManifestText(e.target.value)} /><div className="flex gap-3"><Button onClick={onAnalyzeManifest}><ScanSearch size={16} />Analisis daftar</Button><Button variant="secondary" onClick={() => { setManifestText(""); setManifestResult(null); }}>Bersihkan</Button></div></div>
          {manifestResult ? <div className="mt-5 space-y-4"><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-emerald-50 p-4 text-emerald-700"><div className="text-xs font-semibold uppercase">Aktif</div><div className="mt-2 text-2xl font-bold">{manifestResult.summary.activeSource}</div></div><div className="rounded-2xl bg-red-50 p-4 text-red-700"><div className="text-xs font-semibold uppercase">Duplikat</div><div className="mt-2 text-2xl font-bold">{manifestResult.summary.duplicates}</div></div><div className="rounded-2xl bg-amber-50 p-4 text-amber-700"><div className="text-xs font-semibold uppercase">Perlu klasifikasi</div><div className="mt-2 text-2xl font-bold">{manifestResult.summary.needsClassification}</div></div></div><div className="max-h-[320px] overflow-auto rounded-2xl border border-slate-100"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-3 py-2 font-semibold">Nama file</th><th className="px-3 py-2 font-semibold">Keluarga</th><th className="px-3 py-2 font-semibold">Status</th></tr></thead><tbody>{manifestResult.entries.map((item) => <tr key={item.id} className="border-t border-slate-100 align-top"><td className="px-3 py-2"><div className="font-medium text-slate-900">{item.fileName}</div><div className="mt-1 text-xs text-slate-500">{item.recommendation}</div></td><td className="px-3 py-2 text-slate-700">{item.familyLabel}</td><td className="px-3 py-2"><Badge tone={toneForStatus(item.status)}>{item.statusLabel}</Badge>{item.duplicateOfName ? <div className="mt-1 text-xs text-red-600">{item.duplicateOfName}</div> : null}</td></tr>)}</tbody></table></div></div> : null}
        </Card>

        <Card className="p-5">
          <h3 className="text-lg font-semibold text-slate-900">Katalog file resmi dan acuan template</h3>
          <div className="mt-4 space-y-3">{catalog.datasets.map((item) => <div key={item.id} className="rounded-2xl border border-slate-100 p-4"><div className="flex items-center justify-between gap-3"><div className="font-semibold text-slate-900">{item.title}</div><div className={`rounded-full px-3 py-1 text-[11px] font-semibold ${item.authoritative ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{item.authoritative ? 'resmi' : 'template'}</div></div><div className="mt-2 text-sm text-slate-500">{item.note}</div><div className="mt-3 grid gap-2 text-xs text-slate-400 sm:grid-cols-2"><div>Tahun: {item.year || '-'}</div><div>Resource: {item.mappedResource}</div><div>Cakupan: {item.scope}</div><div>Jenis: {item.datasetType}</div></div></div>)}</div>
          <div className="mt-5 space-y-3 border-t border-slate-100 pt-5"><div className="text-sm font-semibold text-slate-900">Acuan struktur Tabel.xlsx</div>{catalog.templateCatalog.map((item) => <div key={item.id} className="rounded-2xl border border-slate-100 p-4"><div className="flex items-center gap-2 font-semibold text-slate-900"><FileSpreadsheet size={16} />{item.sheetName}</div><div className="mt-2 text-sm text-slate-500">{item.purpose}</div><div className="mt-3 text-xs text-slate-400">Kolom inti: {item.columns.join(", ")}</div></div>)}</div>
        </Card>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
