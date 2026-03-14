import { useEffect, useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { CalendarDays, Eye, FileSpreadsheet, Files, Filter, FileText, MapPinned, Printer, ShieldCheck } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Button, Card, LoadingState, PageHeader, Select, Toast } from "../components/UI";
import pemprovLogo from "../assets/pemprov-ntt.png";

const reportTypes = [
  { value: "commodity", label: "Laporan Komoditas" },
  { value: "region", label: "Laporan Wilayah" },
  { value: "group", label: "Laporan Kelompok Tani" },
  { value: "activity", label: "Laporan Kegiatan" }
];

const metricOptions = [
  { value: "production", label: "Produksi" },
  { value: "area", label: "Luas / Areal" },
  { value: "productivity", label: "Produktivitas" }
];

const yearOptions = ["", "2025", "2024", "2023", "2022", "2021", "2020"];

function formatNumber(value, digits = 2) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: digits }).format(Number(value || 0));
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Makassar"
  }).format(new Date(value));
}

function buildQuery(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return params.toString();
}

async function assetToDataUrl(src) {
  const response = await fetch(src);
  const blob = await response.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function Letterhead({ agency }) {
  return (
    <div className="border-b-[3px] border-slate-900 pb-4">
      <div className="grid grid-cols-[78px_1fr] items-center gap-4 md:grid-cols-[92px_1fr]">
        <div className="flex items-center justify-center">
          <img src={pemprovLogo} alt="Logo Pemerintah Provinsi Nusa Tenggara Timur" className="h-16 w-16 object-contain md:h-20 md:w-20" />
        </div>
        <div className="text-center">
          <div className="text-[14px] font-black uppercase leading-tight tracking-[0.04em] text-slate-950 md:text-[17px]">{agency?.province}</div>
          <div className="mt-1 text-[16px] font-black uppercase leading-tight text-slate-950 md:text-[24px]">{agency?.office}</div>
          <div className="mt-1 text-[11px] text-slate-700 md:text-[13px]">{agency?.address}</div>
          <div className="text-[11px] text-slate-700 md:text-[13px]">Pos-el : {agency?.email} &nbsp; Laman : {agency?.website}</div>
        </div>
      </div>
    </div>
  );
}

function PreviewTable({ table }) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-slate-950">{table.title}</h3>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-100">
            <tr>
              {table.columns.map((column) => (
                <th key={column.key} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {table.rows.slice(0, 18).map((row, rowIndex) => (
              <tr key={rowIndex}>
                {table.columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 align-top text-slate-700">{String(row[column.key] ?? "-")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {table.rows.length > 18 ? <div className="mt-2 text-xs text-slate-500">Preview menampilkan 18 baris pertama dari total {table.rows.length} baris.</div> : null}
    </div>
  );
}

function DocumentPreview({ payload, currentUser }) {
  if (!payload) return null;

  return (
    <div className="print-report-shell">
      <Card className="overflow-hidden border-slate-300 shadow-[0_20px_60px_rgba(15,23,42,0.08)] print:shadow-none">
        <div className="report-screen-only bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Preview dokumen</div>
        <div className="bg-white p-6 md:p-8 print:p-0">
          <Letterhead agency={payload.meta.agency} />

          <div className="mt-6 text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{payload.meta.typeLabel}</div>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">{payload.meta.title}</h2>
            <div className="mt-2 text-sm text-slate-500">Nomor Dokumen: {payload.meta.documentNumber}</div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5 print:grid-cols-5">
            {Object.entries(payload.filters || {}).map(([key, value]) => (
              <div key={key} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 print:bg-white">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{key}</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{String(value || "-")}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4 print:grid-cols-4">
            {(payload.summaryCards || []).map((item) => (
              <div key={item.label} className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50 px-4 py-4 print:bg-white">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">{item.label}</div>
                <div className="mt-3 text-2xl font-bold text-slate-950">{item.value}</div>
                <div className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</div>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500"><ShieldCheck size={16} />Ringkasan eksekutif</div>
            <div className="mt-3 space-y-3 text-sm leading-7 text-slate-700">
              {(payload.executiveSummary || []).map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </div>

          <div className="mt-8 space-y-6">
            {(payload.tables || []).map((table) => <PreviewTable key={table.title} table={table} />)}
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4 print:bg-white">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Catatan laporan</div>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
              {(payload.notes || []).map((note, index) => <li key={index}>• {note}</li>)}
            </ul>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-4 text-xs text-slate-500 md:flex-row md:items-center md:justify-between print:mt-10 print:pt-3">
            <div>Diunduh dari aplikasi SI Tani NTT pada {formatDateTime(payload.meta.generatedAt)}.</div>
            <div>Pengguna: {payload.meta.generatedBy || currentUser?.name || "-"} • {payload.meta.generatedByEmail || currentUser?.email || "-"}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function drawFooter(doc, meta, pageNumber) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(180, 188, 197);
  doc.line(12, pageHeight - 14, pageWidth - 12, pageHeight - 14);
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Diunduh dari aplikasi SI Tani NTT pada ${formatDateTime(meta.generatedAt)}`, 12, pageHeight - 8);
  doc.text(`Pengguna: ${meta.generatedBy || "-"}`, pageWidth / 2, pageHeight - 8, { align: "center" });
  doc.text(`Halaman ${pageNumber}`, pageWidth - 12, pageHeight - 8, { align: "right" });
  doc.setTextColor(15, 23, 42);
}

async function drawLetterhead(doc, agency, logoDataUrl) {
  const pageWidth = doc.internal.pageSize.getWidth();
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", 12, 10, 22, 22);
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(agency?.province || "", pageWidth / 2, 14, { align: "center" });
  doc.setFontSize(15);
  doc.text(agency?.office || "", pageWidth / 2, 21, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(agency?.address || "", pageWidth / 2, 27, { align: "center" });
  doc.text(`Pos-el : ${agency?.email || "-"}    Laman : ${agency?.website || "-"}`, pageWidth / 2, 32, { align: "center" });
  doc.setLineWidth(0.8);
  doc.line(12, 36, pageWidth - 12, 36);
}

async function exportPdf(payload) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const logoDataUrl = await assetToDataUrl(pemprovLogo).catch(() => null);
  let pageNumber = 1;
  let cursorY = 42;

  const ensureSpace = async (height = 8) => {
    if (cursorY + height <= pageHeight - 20) return;
    drawFooter(doc, payload.meta, pageNumber);
    doc.addPage();
    pageNumber += 1;
    await drawLetterhead(doc, payload.meta.agency, logoDataUrl);
    cursorY = 42;
  };

  const addWrappedText = async (text, fontSize = 10, indent = 14) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(String(text || "-"), pageWidth - indent * 2);
    await ensureSpace(lines.length * 5 + 2);
    doc.text(lines, indent, cursorY);
    cursorY += lines.length * 5 + 2;
  };

  const addTable = async (table) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    await ensureSpace(12);
    doc.text(table.title, 14, cursorY);
    cursorY += 6;

    const columns = table.columns || [];
    const colCount = Math.max(columns.length, 1);
    const colWidth = (pageWidth - 28) / colCount;

    await ensureSpace(10);
    doc.setFillColor(241, 245, 249);
    doc.rect(14, cursorY - 4, pageWidth - 28, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    columns.forEach((column, index) => {
      doc.text(String(column.label || ""), 16 + index * colWidth, cursorY + 1);
    });
    cursorY += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    for (const row of table.rows) {
      const cellLines = columns.map((column) => doc.splitTextToSize(String(row[column.key] ?? "-"), colWidth - 3));
      const rowHeight = Math.max(...cellLines.map((lines) => Math.max(lines.length, 1))) * 4 + 3;
      await ensureSpace(rowHeight + 2);
      doc.setDrawColor(226, 232, 240);
      doc.rect(14, cursorY - 4, pageWidth - 28, rowHeight, "S");
      cellLines.forEach((lines, index) => {
        doc.text(lines, 16 + index * colWidth, cursorY);
      });
      cursorY += rowHeight;
    }
    cursorY += 4;
  };

  await drawLetterhead(doc, payload.meta.agency, logoDataUrl);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(payload.meta.typeLabel, pageWidth / 2, cursorY, { align: "center" });
  cursorY += 6;
  doc.setFontSize(15);
  doc.text(payload.meta.title, pageWidth / 2, cursorY, { align: "center" });
  cursorY += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Nomor Dokumen: ${payload.meta.documentNumber}`, pageWidth / 2, cursorY, { align: "center" });
  cursorY += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Parameter laporan", 14, cursorY);
  cursorY += 5;
  for (const [key, value] of Object.entries(payload.filters || {})) {
    await addWrappedText(`${key}: ${value}`, 9, 16);
  }

  cursorY += 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  await ensureSpace(10);
  doc.text("Ringkasan eksekutif", 14, cursorY);
  cursorY += 5;
  for (const paragraph of payload.executiveSummary || []) {
    await addWrappedText(paragraph, 9, 16);
  }

  await ensureSpace(10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Kartu ringkasan", 14, cursorY);
  cursorY += 5;
  for (const item of payload.summaryCards || []) {
    await addWrappedText(`${item.label}: ${item.value} — ${item.detail}`, 9, 16);
  }
  cursorY += 2;

  for (const table of payload.tables || []) {
    await addTable(table);
  }

  if (payload.notes?.length) {
    await ensureSpace(10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Catatan", 14, cursorY);
    cursorY += 5;
    for (const note of payload.notes) {
      await addWrappedText(`• ${note}`, 9, 16);
    }
  }

  drawFooter(doc, payload.meta, pageNumber);
  doc.save(`${payload.meta.documentNumber.replace(/[^A-Za-z0-9-]/g, "_")}.pdf`);
}

function exportExcel(payload) {
  const workbook = XLSX.utils.book_new();

  const summaryRows = [
    { bagian: "Nomor Dokumen", nilai: payload.meta.documentNumber },
    { bagian: "Jenis Laporan", nilai: payload.meta.typeLabel },
    { bagian: "Judul Laporan", nilai: payload.meta.title },
    { bagian: "Dibuat Oleh", nilai: payload.meta.generatedBy },
    { bagian: "Waktu Dokumen", nilai: formatDateTime(payload.meta.generatedAt) },
    ...Object.entries(payload.filters || {}).map(([key, value]) => ({ bagian: key, nilai: value })),
    ...((payload.summaryCards || []).map((item) => ({ bagian: item.label, nilai: item.value, keterangan: item.detail })))
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), "Ringkasan");

  (payload.tables || []).forEach((table, index) => {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(table.rows), `${String(index + 1).padStart(2, "0")}-${table.title.slice(0, 20)}`);
  });

  const metadataRows = [
    { field: "Sistem", value: "SI Tani NTT" },
    { field: "Instansi", value: payload.meta.agency.office },
    { field: "Provinsi", value: payload.meta.agency.province },
    { field: "Alamat", value: payload.meta.agency.address },
    { field: "Email", value: payload.meta.agency.email },
    { field: "Website", value: payload.meta.agency.website },
    { field: "Waktu Unduh", value: formatDateTime(payload.meta.generatedAt) },
    ...(payload.notes || []).map((note, index) => ({ field: `Catatan ${index + 1}`, value: note }))
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(metadataRows), "Metadata");

  XLSX.writeFile(workbook, `${payload.meta.documentNumber.replace(/[^A-Za-z0-9-]/g, "_")}.xlsx`);
}

function SmallStat({ item }) {
  return (
    <Card className="p-5">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{item.label}</div>
      <div className="mt-3 text-3xl font-bold text-slate-950">{item.value}</div>
      <div className="mt-2 text-sm leading-6 text-slate-500">{item.detail}</div>
    </Card>
  );
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [lookups, setLookups] = useState(null);
  const [payload, setPayload] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    reportType: "commodity",
    regencyCode: "",
    districtCode: "",
    commodityId: "",
    farmerGroupId: "",
    year: "",
    category: "",
    metric: "production",
    activityStatus: ""
  });
  const previewRef = useRef(null);

  const districtOptions = useMemo(() => (lookups?.districts || []).filter((item) => !filters.regencyCode || item.regencyCode === filters.regencyCode), [lookups, filters.regencyCode]);
  const farmerGroupOptions = useMemo(() => (lookups?.farmerGroups || []).filter((item) => !filters.regencyCode || item.regencyCode === filters.regencyCode), [lookups, filters.regencyCode]);

  const fetchPreview = async () => {
    setLoading(true);
    try {
      const query = buildQuery(filters);
      const nextPayload = await api.get(`/api/reports/summary?${query}`);
      setPayload(nextPayload);
    } catch (error) {
      setToast({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get("/api/lookups").then(setLookups).catch((error) => setToast({ type: "error", message: error.message }));
  }, []);

  useEffect(() => {
    if (!lookups) return;
    fetchPreview().catch(console.error);
  }, [lookups, filters.reportType, filters.regencyCode, filters.districtCode, filters.commodityId, filters.farmerGroupId, filters.year, filters.category, filters.metric, filters.activityStatus]);

  if (!lookups) return <LoadingState text="Menyiapkan modul laporan profesional..." />;

  return (
    <div className="space-y-6 report-page-root">
      <PageHeader
        title="Laporan profesional"
        subtitle="Susun dokumen resmi berdasarkan data terpilih. Preview, PDF, dan Excel dibangun dari data aplikasi yang aktif, dengan kop surat resmi, footer sistem, dan struktur yang siap dicetak maupun disimpan untuk arsip digital."
        action={
          <div className="report-screen-only flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => window.print()}><Printer size={16} />Cetak</Button>
            <Button variant="secondary" onClick={() => payload && exportPdf(payload)} disabled={!payload}><FileText size={16} />Unduh PDF</Button>
            <Button onClick={() => payload && exportExcel(payload)} disabled={!payload}><FileSpreadsheet size={16} />Unduh Excel</Button>
          </div>
        }
      />

      <Card className="report-screen-only p-5">
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"><Filter size={16} />Parameter laporan</div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Select label="Jenis laporan" value={filters.reportType} onChange={(e) => setFilters((prev) => ({ ...prev, reportType: e.target.value }))}>
            {reportTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </Select>
          <Select label="Kabupaten/Kota" value={filters.regencyCode} onChange={(e) => setFilters((prev) => ({ ...prev, regencyCode: e.target.value, districtCode: "", farmerGroupId: "" }))}>
            <option value="">Semua kabupaten/kota</option>
            {lookups.regencies.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </Select>
          <Select label="Kecamatan" value={filters.districtCode} onChange={(e) => setFilters((prev) => ({ ...prev, districtCode: e.target.value }))}>
            <option value="">Semua kecamatan</option>
            {districtOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </Select>
          <Select label="Komoditas" value={filters.commodityId} onChange={(e) => setFilters((prev) => ({ ...prev, commodityId: e.target.value }))}>
            <option value="">Semua komoditas</option>
            {lookups.commodities.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </Select>
          <Select label="Kelompok Tani" value={filters.farmerGroupId} onChange={(e) => setFilters((prev) => ({ ...prev, farmerGroupId: e.target.value }))}>
            <option value="">Semua kelompok tani</option>
            {farmerGroupOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </Select>
          <Select label="Tahun data" value={filters.year} onChange={(e) => setFilters((prev) => ({ ...prev, year: e.target.value }))}>
            {yearOptions.map((item) => <option key={item || "all"} value={item}>{item || "Semua tahun"}</option>)}
          </Select>
          <Select label="Kategori komoditas" value={filters.category} onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}>
            <option value="">Semua kategori</option>
            {lookups.commodityCategories.map((item) => <option key={item} value={item}>{item}</option>)}
          </Select>
          <Select label="Indikator" value={filters.metric} onChange={(e) => setFilters((prev) => ({ ...prev, metric: e.target.value }))}>
            {metricOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </Select>
          <Select label="Status kegiatan" value={filters.activityStatus} onChange={(e) => setFilters((prev) => ({ ...prev, activityStatus: e.target.value }))}>
            <option value="">Semua status</option>
            {lookups.activityStatuses.map((item) => <option key={item} value={item}>{item}</option>)}
          </Select>
          <div className="flex items-end">
            <Button className="w-full" onClick={() => fetchPreview()} disabled={loading}><Eye size={16} />{loading ? "Menyusun..." : "Refresh Preview"}</Button>
          </div>
        </div>
      </Card>

      {loading || !payload ? <LoadingState text="Menyusun preview laporan profesional..." /> : (
        <>
          <div className="report-screen-only grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {(payload.summaryCards || []).slice(0, 4).map((item) => <SmallStat key={item.label} item={item} />)}
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.86fr_1.14fr] print:grid-cols-1">
            <div className="report-screen-only space-y-6 print:hidden">
              <Card className="p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"><Files size={16} />Metadata dokumen</div>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Nomor dokumen</div><div className="mt-1 font-semibold text-slate-900">{payload.meta.documentNumber}</div></div>
                  <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Jenis laporan</div><div className="mt-1 font-semibold text-slate-900">{payload.meta.typeLabel}</div></div>
                  <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Waktu dokumen</div><div className="mt-1 font-semibold text-slate-900">{formatDateTime(payload.meta.generatedAt)}</div></div>
                  <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Pengguna</div><div className="mt-1 font-semibold text-slate-900">{payload.meta.generatedBy || user?.name || "-"}</div><div className="text-xs text-slate-500">{payload.meta.generatedByEmail || user?.email || "-"}</div></div>
                </div>
              </Card>

              <Card className="p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"><CalendarDays size={16} />Standar dokumen</div>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                  <li>• Layout disusun untuk preview layar, cetak browser, PDF, dan Excel dengan isi yang konsisten.</li>
                  <li>• Kop surat dibangun dengan code dan aset logo resmi Pemprov NTT yang disimpan lokal agar tetap aman saat offline.</li>
                  <li>• Footer dokumen selalu memuat nama aplikasi, waktu unduh, dan pengguna yang mengunduh.</li>
                  <li>• Label wilayah ditampilkan penuh agar tidak rancu antara Kabupaten Kupang dan Kota Kupang.</li>
                </ul>
              </Card>

              <Card className="p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"><MapPinned size={16} />Ringkasan isi</div>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  {(payload.tables || []).map((table) => (
                    <div key={table.title} className="rounded-2xl border border-slate-100 px-4 py-3">
                      <div className="font-semibold text-slate-900">{table.title}</div>
                      <div className="mt-1 text-xs text-slate-500">{table.rows.length} baris • {table.columns.length} kolom</div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div ref={previewRef}>
              <DocumentPreview payload={payload} currentUser={user} />
            </div>
          </div>
        </>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
