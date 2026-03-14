import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Database, FileStack, Filter, MapPinned, PackageSearch, Sprout, Waves } from "lucide-react";
import CommodityChoroplethMap from "../components/CommodityChoroplethMap";
import { Button, Card, LoadingState, PageHeader, Select, Input } from "../components/UI";
import { api } from "../lib/api";

const tones = ["#14532d", "#166534", "#15803d", "#16a34a", "#22c55e", "#65a30d", "#0f766e", "#0ea5e9"];

function formatNumber(value, digits = 2) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: digits }).format(Number(value || 0));
}

function buildQuery(params) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") qs.set(key, value);
  });
  return qs.toString();
}

function MetricCard({ label, value, hint, icon: Icon }) {
  return (
    <Card className="overflow-hidden border-slate-200/80 bg-white/95 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
          <div className="mt-3 text-3xl font-bold text-slate-900">{value}</div>
          <p className="mt-2 text-sm text-slate-500">{hint}</p>
        </div>
        <div className="rounded-3xl bg-emerald-50 p-3 text-emerald-700 shadow-inner shadow-emerald-100">
          <Icon size={22} />
        </div>
      </div>
    </Card>
  );
}

export default function CommodityPage() {
  const [lookups, setLookups] = useState(null);
  const [payload, setPayload] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const filters = useMemo(() => ({
    category: searchParams.get("category") || "",
    subcategory: searchParams.get("subcategory") || "",
    year: searchParams.get("year") || "",
    regencyCode: searchParams.get("regencyCode") || "",
    metric: searchParams.get("metric") || "production",
    commodityId: searchParams.get("commodityId") || "",
    search: searchParams.get("search") || ""
  }), [searchParams]);

  const qs = useMemo(() => buildQuery(filters), [filters]);

  useEffect(() => {
    api.get("/api/lookups").then(setLookups).catch(console.error);
  }, []);

  useEffect(() => {
    api.get(`/api/dashboard/commodity-explorer?${qs}`).then(setPayload).catch(console.error);
  }, [qs]);

  const updateFilters = (patch) => {
    const next = { ...filters, ...patch };
    Object.keys(next).forEach((key) => {
      if (next[key] === null || next[key] === undefined) next[key] = "";
    });
    setSearchParams(next);
  };

  if (!payload || !lookups) return <LoadingState text="Menyiapkan analisis komoditas..." />;

  const topCommodities = payload.charts.commodityRanking.slice(0, 10);
  const topRegencies = payload.charts.regencyRanking.slice(0, 10);
  const tableRows = payload.table.slice(0, 120);
  const selectedRegion = payload.regionDetail;
  const unitNote = payload.summary.isMixedUnit ? `Nilai ${payload.summary.metricLabel.toLowerCase()} memuat beberapa satuan. Baca kolom satuan pada tabel untuk interpretasi teknis.` : `Satuan dominan: ${payload.summary.metricUnit}.`;
  const districtOptions = lookups.regencies;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analisis Komoditas"
        subtitle="Modul teknis untuk membaca komoditas, wilayah sentra, indikator, dan sumber data resmi per tahun."
        action={<Button variant="secondary" onClick={() => updateFilters({ category: "", subcategory: "", year: "", regencyCode: "", metric: "production", commodityId: "", search: "" })}><Filter size={16} />Reset filter</Button>}
      />

      <Card className="p-5">
        <div className="grid gap-4 xl:grid-cols-7">
          <Select label="Kategori" value={filters.category} onChange={(e) => updateFilters({ category: e.target.value, subcategory: "", regencyCode: "" })}>
            <option value="">Semua kategori</option>
            {payload.filters.categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </Select>
          <Select label="Subkategori" value={filters.subcategory} onChange={(e) => updateFilters({ subcategory: e.target.value, regencyCode: "" })}>
            <option value="">Semua subkategori</option>
            {payload.filters.subcategories.map((item) => <option key={item} value={item}>{item}</option>)}
          </Select>
          <Select label="Kabupaten/Kota" value={filters.regencyCode} onChange={(e) => updateFilters({ regencyCode: e.target.value })}>
            <option value="">Semua wilayah</option>
            {districtOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </Select>
          <Select label="Tahun Data" value={filters.year} onChange={(e) => updateFilters({ year: e.target.value })}>
            <option value="">Tahun terbaru tersedia</option>
            {payload.filters.years.map((item) => <option key={item} value={item}>{item}</option>)}
          </Select>
          <Select label="Indikator" value={filters.metric} onChange={(e) => updateFilters({ metric: e.target.value })}>
            {payload.filters.metrics.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </Select>
          <Select label="Komoditas" value={filters.commodityId} onChange={(e) => updateFilters({ commodityId: e.target.value })}>
            <option value="">Semua komoditas</option>
            {lookups.commodities.filter((item) => !filters.category || item.category === filters.category).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </Select>
          <Input label="Cari" value={filters.search} onChange={(e) => updateFilters({ search: e.target.value })} placeholder="Cari komoditas atau sumber..." />
        </div>
        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">{unitNote}</div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Komoditas terdata" value={formatNumber(payload.summary.commodityCount)} hint="Komoditas yang cocok dengan filter aktif" icon={PackageSearch} />
        <MetricCard label={`Total ${payload.summary.metricLabel}`} value={payload.summary.totalValueDisplay} hint="Akumulasi indikator pada cakupan terpilih" icon={Sprout} />
        <MetricCard label="Wilayah terdata" value={formatNumber(payload.summary.regencyCount)} hint="Kabupaten/kota yang memiliki data untuk filter ini" icon={MapPinned} />
        <MetricCard label="Komoditas tertinggi" value={payload.summary.topCommodityName} hint={`${formatNumber(payload.summary.topCommodityValue)} ${payload.summary.metricUnit}`} icon={Database} />
        <MetricCard label="Wilayah tertinggi" value={payload.summary.topRegencyName} hint={`${formatNumber(payload.summary.topRegencyValue)} ${payload.summary.metricUnit}`} icon={Waves} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Top komoditas</h3>
              <p className="mt-1 text-sm text-slate-500">Ranking komoditas berdasarkan indikator yang dipilih.</p>
            </div>
            <Button variant="ghost" onClick={() => navigate(`/dashboard?category=${encodeURIComponent(filters.category || "")}&commodityId=${encodeURIComponent(filters.commodityId || "")}`)}>Buka ringkasan</Button>
          </div>
          <div className="mt-5 h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCommodities} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={118} tick={{ fill: '#334155', fontSize: 12 }} />
                <Tooltip formatter={(value) => [`${formatNumber(value, 2)} ${payload.summary.metricUnit}`, payload.summary.metricLabel]} />
                <Bar dataKey="value" radius={[0, 10, 10, 0]} onClick={(entry) => {
                  const match = lookups.commodities.find((item) => item.label === entry.name);
                  updateFilters({ commodityId: match?.value || "" });
                }}>
                  {topCommodities.map((item, index) => <Cell key={item.name} fill={tones[index % tones.length]} cursor="pointer" />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-lg font-semibold text-slate-900">Top kabupaten/kota</h3>
          <p className="mt-1 text-sm text-slate-500">Klik bar untuk memfokuskan wilayah dan memperbarui peta analitik.</p>
          <div className="mt-5 h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topRegencies} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis type="category" dataKey="regencyName" width={118} tick={{ fill: '#334155', fontSize: 12 }} />
                <Tooltip formatter={(value) => [`${formatNumber(value, 2)} ${payload.summary.metricUnit}`, payload.summary.metricLabel]} />
                <Bar dataKey="value" radius={[0, 10, 10, 0]} onClick={(entry) => updateFilters({ regencyCode: entry.regencyCode })}>
                  {topRegencies.map((item, index) => <Cell key={item.regencyCode} fill={tones[(index + 2) % tones.length]} cursor="pointer" />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden p-4">
          <div className="mb-4 flex items-end justify-between gap-3 px-1">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Peta analitik komoditas NTT</h3>
              <p className="mt-1 text-sm text-slate-500">Klik titik wilayah kabupaten/kota untuk melihat nilai {payload.summary.metricLabel.toLowerCase()} dan komoditas dominan.</p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{payload.summary.metricLabel} • {payload.summary.metricUnit}</div>
          </div>
          <CommodityChoroplethMap
            regencies={payload.map.regencies}
            metricLabel={payload.map.metricLabel}
            unitLabel={payload.map.unitLabel}
            selectedRegencyCode={payload.map.selectedRegencyCode}
            onSelectRegency={(code) => updateFilters({ regencyCode: code })}
            note={payload.summary.coverageNote}
          />
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="text-lg font-semibold text-slate-900">Drilldown wilayah</h3>
            {selectedRegion ? (
              <div className="mt-4 space-y-4 text-sm text-slate-600">
                <div className="rounded-2xl bg-emerald-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Wilayah aktif</div>
                  <div className="mt-2 text-xl font-bold text-emerald-950">{selectedRegion.regencyName}</div>
                  <div className="mt-1">Top komoditas: <span className="font-semibold text-slate-900">{selectedRegion.topCommodity}</span></div>
                  <div className="mt-1">Total indikator: <span className="font-semibold text-slate-900">{formatNumber(selectedRegion.totalValue)} {selectedRegion.unitLabel}</span></div>
                </div>
                <div className="space-y-2">
                  {selectedRegion.rows.map((row, index) => (
                    <button key={`${row.commodityName}-${index}`} type="button" className="w-full rounded-2xl border border-slate-100 px-4 py-3 text-left hover:bg-slate-50" onClick={() => {
                      const match = lookups.commodities.find((item) => item.label === row.commodityName);
                      updateFilters({ commodityId: match?.value || "", regencyCode: selectedRegion.regencyCode });
                    }}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-900">{row.commodityName}</div>
                          <div className="text-xs text-slate-500">{row.subcategory} • {row.sourceLabel}</div>
                        </div>
                        <div className="text-right text-sm font-semibold text-slate-900">{formatNumber(row.value, 2)} {row.unit}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">Klik titik wilayah pada peta untuk melihat uraian komoditas.</div>}
          </Card>

          <Card className="p-5">
            <h3 className="text-lg font-semibold text-slate-900">Komposisi subkategori</h3>
            <p className="mt-1 text-sm text-slate-500">Membantu melihat apakah data didominasi BST, SBS, TBF, TH, tanaman pangan, atau perkebunan.</p>
            <div className="mt-5 h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={payload.charts.subcategoryBreakdown.slice(0, 6)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} angle={-15} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip formatter={(value) => [`${formatNumber(value, 2)} ${payload.summary.metricUnit}`, payload.summary.metricLabel]} />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                    {payload.charts.subcategoryBreakdown.slice(0, 6).map((item, index) => <Cell key={item.name} fill={tones[(index + 1) % tones.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-5">
          <h3 className="text-lg font-semibold text-slate-900">Tren tahun data</h3>
          <p className="mt-1 text-sm text-slate-500">Garis tren ini menunjukkan akumulasi indikator untuk filter aktif per tahun rilis data.</p>
          <div className="mt-5 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={payload.charts.yearTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip formatter={(value) => [`${formatNumber(value, 2)} ${payload.summary.metricUnit}`, payload.summary.metricLabel]} />
                <Line dataKey="value" stroke="#166534" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-lg font-semibold text-slate-900">Tabel teknis komoditas</h3>
            <p className="mt-1 text-sm text-slate-500">Tabel ini menjaga detail indikator, satuan, dan sumber data agar pembacaan tetap valid.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Komoditas</th>
                  <th className="px-4 py-3 font-semibold">Kategori</th>
                  <th className="px-4 py-3 font-semibold">Wilayah</th>
                  <th className="px-4 py-3 font-semibold">Tahun</th>
                  <th className="px-4 py-3 font-semibold">Produksi</th>
                  <th className="px-4 py-3 font-semibold">Luas/Areal</th>
                  <th className="px-4 py-3 font-semibold">Produktivitas</th>
                  <th className="px-4 py-3 font-semibold">Sumber</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 align-top hover:bg-emerald-50/40">
                    <td className="px-4 py-3">
                      <button type="button" className="text-left" onClick={() => {
                        const match = lookups.commodities.find((item) => item.label === row.commodityName);
                        updateFilters({ commodityId: match?.value || "", regencyCode: row.regencyCode });
                      }}>
                        <div className="font-semibold text-slate-900">{row.commodityName}</div>
                        <div className="text-xs text-slate-500">{row.subcategory}</div>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.category}</td>
                    <td className="px-4 py-3 text-slate-600">{row.regencyName}</td>
                    <td className="px-4 py-3 text-slate-600">{row.year}</td>
                    <td className="px-4 py-3 text-slate-600">{row.productionValue ? `${formatNumber(row.productionValue, 2)} ${row.productionUnit}` : "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{row.areaValue ? `${formatNumber(row.areaValue, 2)} ${row.areaUnit}` : "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{row.productivityValue ? `${formatNumber(row.productivityValue, 2)} ${row.productivityUnit}` : "-"}</td>
                    <td className="px-4 py-3 text-slate-500">
                      <div>{row.sourceLabel}</div>
                      <div className="text-xs">{row.qualityLabel}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <h3 className="text-lg font-semibold text-slate-900">Catatan validitas</h3>
          <p className="mt-2 text-sm leading-7 text-slate-600">{payload.sourceNotes.officialOnly}</p>
        </Card>
        <Card className="p-5">
          <h3 className="text-lg font-semibold text-slate-900">Kesiapan impor berikutnya</h3>
          <p className="mt-2 text-sm leading-7 text-slate-600">{payload.sourceNotes.importReadiness}</p>
        </Card>
      </div>
    </div>
  );
}
