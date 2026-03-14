import {
  Activity,
  ArrowRight,
  BarChart3,
  Database,
  FileSpreadsheet,
  FileText,
  Layers3,
  Leaf,
  MapPinned,
  ShieldCheck,
  Sprout,
  Tractor,
  Trees,
  Users,
  Waves,
  Wheat,
  LandPlot
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import CommodityChoroplethMap from "../components/CommodityChoroplethMap";
import { Button, Card, LoadingState, PageHeader, Select } from "../components/UI";
import { api } from "../lib/api";

const chartColors = ["#14532d", "#166534", "#16a34a", "#22c55e", "#4ade80", "#84cc16", "#65a30d", "#15803d"];

function formatNumber(value, digits = 0) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: digits }).format(Number(value || 0));
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function queryString(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return params.toString();
}

function toneClasses(tone) {
  const map = {
    emerald: "from-emerald-600 to-green-700 border-emerald-200 text-emerald-950",
    amber: "from-amber-500 to-orange-500 border-amber-200 text-amber-950",
    teal: "from-teal-600 to-cyan-700 border-teal-200 text-teal-950",
    violet: "from-violet-600 to-fuchsia-700 border-violet-200 text-violet-950",
    rose: "from-rose-500 to-pink-600 border-rose-200 text-rose-950",
    slate: "from-slate-700 to-slate-900 border-slate-200 text-slate-950"
  };
  return map[tone] || map.slate;
}

function HeroStat({ item }) {
  return (
    <div className="rounded-[28px] border border-white/15 bg-white/8 p-4 shadow-lg shadow-slate-950/10 backdrop-blur-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/85">{item.label}</p>
      <div className="mt-3 text-2xl font-bold text-white">{item.value}</div>
      <p className="mt-2 text-sm text-emerald-100/75">{item.detail}</p>
    </div>
  );
}

function KpiCard({ item, icon: Icon }) {
  return (
    <Card className="overflow-hidden border-slate-200/80 bg-white/95 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
          <div className="mt-3 text-3xl font-bold text-slate-900">{item.value}</div>
          <p className="mt-2 text-sm text-slate-500">{item.hint}</p>
        </div>
        <div className="rounded-3xl bg-emerald-50 p-3 text-emerald-700 shadow-inner shadow-emerald-100">
          <Icon size={22} />
        </div>
      </div>
    </Card>
  );
}

function InsightCard({ item }) {
  return (
    <Card className="p-5">
      <div className="flex h-full flex-col justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{item.title}</p>
          <h3 className="mt-3 text-xl font-bold text-slate-900">{item.value}</h3>
        </div>
        <p className="text-sm leading-6 text-slate-500">{item.detail}</p>
      </div>
    </Card>
  );
}

function RankingList({ title, subtitle, items, valueSuffix = "", color = "bg-emerald-500", onSelect }) {
  return (
    <Card className="p-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="mt-5 space-y-3">
        {items.length ? items.map((item, index) => (
          <button type="button" key={`${item.name}-${index}`} className="w-full rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50/70" onClick={() => onSelect?.(item)}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${color}`}>{index + 1}</div>
                <div>
                  <div className="font-semibold text-slate-900">{item.name}</div>
                  {item.category ? <div className="text-xs text-slate-500">{item.category}</div> : null}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-slate-900">{formatNumber(item.total ?? item.value, 2)}{valueSuffix}</div>
              </div>
            </div>
          </button>
        )) : <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">Belum ada data pada filter ini.</div>}
      </div>
    </Card>
  );
}

function OfficialPanel({ item, onOpen }) {
  return (
    <button type="button" className="w-full text-left" onClick={() => onOpen?.(item)}>
      <Card className="overflow-hidden border-slate-200/80 p-0 transition hover:-translate-y-0.5 hover:shadow-lg">
        <div className={`bg-gradient-to-br ${toneClasses(item.tone)} p-[1px]`}>
          <div className="rounded-[23px] bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{item.categoryGroup}</p>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-500">{item.description}</p>
              </div>
              <div className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">{item.year || "-"}</div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Komoditas</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(item.count)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Komoditas tertinggi</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{item.topCommodity}</p>
                <p className="mt-1 text-sm text-slate-500">{formatNumber(item.topValue, 2)} {item.topUnit}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </button>
  );
}

export default function DashboardHome() {
  const [lookups, setLookups] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [commodityExplorer, setCommodityExplorer] = useState(null);
  const [filters, setFilters] = useState({ year: "", category: "", regencyCode: "", districtCode: "", commodityId: "", activityStatus: "" });

  const qs = useMemo(() => queryString(filters), [filters]);

  useEffect(() => {
    api.get("/api/lookups").then(setLookups).catch(console.error);
  }, []);

  useEffect(() => {
    api.get(`/api/dashboard/stats?${qs}`).then(setDashboard).catch(console.error);
    api.get(`/api/dashboard/commodity-explorer?${qs}`).then(setCommodityExplorer).catch(console.error);
  }, [qs]);

  const navigate = useNavigate();

  if (!dashboard || !lookups || !commodityExplorer) return <LoadingState text="Menyiapkan dashboard analitik premium..." />;

  const districtOptions = lookups.districts.filter((item) => !filters.regencyCode || item.regencyCode === filters.regencyCode);

  const goCommodity = (patch = {}) => {
    const params = new URLSearchParams();
    const next = { ...filters, ...patch };
    Object.entries(next).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    navigate(`/dashboard/komoditas?${params.toString()}`);
  };

  const kpiIcons = [Users, Tractor, LandPlot, Database, Sprout, FileText, Activity, Layers3];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard premium"
        subtitle="Visualisasi data resmi pertanian NTT yang dirancang untuk analisis, monitoring, dan presentasi eksekutif."
        action={
          <div className="hidden items-center gap-2 lg:flex">
            <Link to="/dashboard/peta"><Button variant="secondary"><MapPinned size={16} />Peta</Button></Link>
            <Link to="/dashboard/komoditas"><Button variant="secondary"><Wheat size={16} />Komoditas</Button></Link>
            <Link to="/dashboard/laporan"><Button variant="secondary"><FileText size={16} />Laporan</Button></Link>
            <Link to="/dashboard/impor-data"><Button><FileSpreadsheet size={16} />Impor Data</Button></Link>
          </div>
        }
      />

      <Card className="overflow-hidden border-none bg-gradient-to-br from-slate-950 via-emerald-900 to-green-700 p-0 shadow-[0_28px_80px_rgba(15,23,42,0.24)]">
        <div className="grid gap-8 p-6 lg:grid-cols-[1.15fr_1fr] lg:p-8">
          <div className="text-white">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">
              <ShieldCheck size={14} />Executive BI Dashboard
            </div>
            <h2 className="mt-5 text-3xl font-bold leading-tight lg:text-5xl">{dashboard.hero.title}</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-emerald-50/80 lg:text-base">{dashboard.hero.subtitle}</p>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-emerald-50/85">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5"><Database size={14} />{dashboard.sourceCatalog.officialDatasets.filter((item) => item.authoritative).length} sumber resmi aktif</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5"><FileSpreadsheet size={14} />{dashboard.sourceCatalog.templateCatalog.length} template impor</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5"><Sprout size={14} />Diperbarui {formatDateTime(dashboard.hero.lastUpdatedAt)}</span>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {dashboard.hero.highlights.map((item) => <HeroStat key={item.id} item={item} />)}
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="grid gap-4 lg:grid-cols-6">
          <Select label="Tahun" value={filters.year} onChange={(e) => setFilters((prev) => ({ ...prev, year: e.target.value }))}>
            <option value="">Semua tahun</option>
            {dashboard.filters.years.map((item) => <option key={item} value={item}>{item}</option>)}
          </Select>
          <Select label="Kategori" value={filters.category} onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}>
            <option value="">Semua kategori</option>
            {lookups.commodityCategories.map((item) => <option key={item} value={item}>{item}</option>)}
            {['Buah Sayuran Tahunan', 'Sayuran Buah Semusim', 'Tanaman Biofarmaka', 'Florikultura'].map((item) => <option key={item} value={item}>{item}</option>)}
          </Select>
          <Select label="Kabupaten/Kota" value={filters.regencyCode} onChange={(e) => setFilters((prev) => ({ ...prev, regencyCode: e.target.value, districtCode: "" }))}>
            <option value="">Semua wilayah</option>
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
          <Select label="Status kegiatan" value={filters.activityStatus} onChange={(e) => setFilters((prev) => ({ ...prev, activityStatus: e.target.value }))}>
            <option value="">Semua status</option>
            {lookups.activityStatuses.map((item) => <option key={item} value={item}>{item}</option>)}
          </Select>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboard.kpis.map((item, index) => <KpiCard key={item.id} item={item} icon={kpiIcons[index % kpiIcons.length]} />)}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Tren produksi</h3>
              <p className="mt-1 text-sm text-slate-500">Tonase produksi berdasarkan data produksi terintegrasi dan filter aktif.</p>
            </div>
            <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">12 periode terakhir</div>
          </div>
          <div className="mt-5 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dashboard.charts.productionTrend}>
                <defs>
                  <linearGradient id="premiumProd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16a34a" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#16a34a" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip formatter={(value) => [`${formatNumber(value, 2)} ton`, 'Produksi']} />
                <Area type="monotone" dataKey="total" stroke="#166534" strokeWidth={3} fill="url(#premiumProd)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-lg font-semibold text-slate-900">Komposisi kategori komoditas</h3>
          <p className="mt-1 text-sm text-slate-500">Sebaran master komoditas yang saat ini aktif di sistem.</p>
          <div className="mt-5 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dashboard.charts.categoryDistribution} dataKey="total" nameKey="name" innerRadius={70} outerRadius={112} paddingAngle={3} onClick={(entry) => goCommodity({ category: entry.name })} cursor="pointer">
                  {dashboard.charts.categoryDistribution.map((item, index) => <Cell key={item.name} fill={chartColors[index % chartColors.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => [formatNumber(value), 'Jumlah komoditas']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {dashboard.charts.categoryDistribution.map((item, index) => (
              <button type="button" key={item.name} className="flex w-full items-center justify-between rounded-2xl border border-slate-100 px-3 py-2 text-left transition hover:border-emerald-200 hover:bg-emerald-50/50" onClick={() => goCommodity({ category: item.name })}>
                <div className="flex items-center gap-2 text-sm text-slate-600"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />{item.name}</div>
                <span className="font-semibold text-slate-900">{formatNumber(item.total)}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <RankingList title="Top kabupaten produksi" subtitle="Klik untuk membuka analisis komoditas wilayah terkait." items={dashboard.charts.regencyRanking.map((item) => ({ ...item, total: item.total, name: item.name, regencyCode: item.regencyCode }))} valueSuffix=" ton" color="bg-emerald-600" onSelect={(item) => goCommodity({ regencyCode: item.regencyCode })} />
        <RankingList title="Top komoditas di sistem" subtitle="Klik untuk mengurai komoditas pada modul teknis." items={dashboard.charts.commodityRanking.map((item) => ({ ...item, total: item.total }))} valueSuffix=" ton" color="bg-amber-500" onSelect={(item) => { const match = lookups.commodities.find((row) => row.label === item.name); goCommodity({ commodityId: match?.value || "" }); }} />
        <Card className="p-5">
          <h3 className="text-lg font-semibold text-slate-900">Tren kegiatan aplikasi</h3>
          <p className="mt-1 text-sm text-slate-500">Aktivitas lapangan yang dicatat pada aplikasi.</p>
          <div className="mt-5 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard.charts.activityTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} allowDecimals={false} />
                <Tooltip formatter={(value) => [`${formatNumber(value)} kegiatan`, 'Jumlah']} />
                <Bar dataKey="total" fill="#166534" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="text-2xl font-semibold text-slate-900">Pusat data resmi dan panel kategori</h3>
            <p className="mt-1 text-sm text-slate-500">Panel ini menandai file PDF resmi yang sudah dipakai sebagai dasar data aplikasi dan impor berikutnya.</p>
          </div>
          <Link to="/dashboard/impor-data" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">Lihat pusat impor <ArrowRight size={16} /></Link>
        </div>
        <div className="grid gap-5 xl:grid-cols-2 2xl:grid-cols-3">
          {dashboard.officialPanels.map((item) => <OfficialPanel key={item.id} item={item} onOpen={(panel) => goCommodity({ subcategory: panel.categoryGroup === "Perkebunan" ? "Perkebunan Kabupaten" : panel.categoryGroup, year: panel.year })} />)}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden p-4">
          <div className="mb-4 flex items-end justify-between gap-3 px-1">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Peta analitik komoditas NTT</h3>
              <p className="mt-1 text-sm text-slate-500">Klik titik wilayah kabupaten/kota untuk mengurai komoditas dan membuka modul teknis secara kontekstual.</p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{commodityExplorer.summary.metricLabel} • {commodityExplorer.summary.metricUnit}</div>
          </div>
          <CommodityChoroplethMap
            regencies={commodityExplorer.map.regencies}
            metricLabel={commodityExplorer.map.metricLabel}
            unitLabel={commodityExplorer.map.unitLabel}
            selectedRegencyCode={commodityExplorer.map.selectedRegencyCode}
            onSelectRegency={(code) => goCommodity({ regencyCode: code, metric: commodityExplorer.map.metric })}
            note={commodityExplorer.summary.coverageNote}
            height="560px"
          />
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="text-lg font-semibold text-slate-900">Drilldown wilayah terpilih</h3>
            <p className="mt-1 text-sm text-slate-500">Panel ini berubah saat area peta diklik atau saat filter wilayah aktif.</p>
            {commodityExplorer.regionDetail ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-950">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Wilayah aktif</div>
                  <div className="mt-2 text-xl font-bold">{commodityExplorer.regionDetail.regencyName}</div>
                  <div className="mt-1">Top komoditas: <span className="font-semibold">{commodityExplorer.regionDetail.topCommodity}</span></div>
                  <div className="mt-1">Total indikator: <span className="font-semibold">{formatNumber(commodityExplorer.regionDetail.totalValue, 2)} {commodityExplorer.regionDetail.unitLabel}</span></div>
                </div>
                {commodityExplorer.regionDetail.rows.map((row, index) => (
                  <button key={`${row.commodityName}-${index}`} type="button" className="w-full rounded-2xl border border-slate-100 px-4 py-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50/70" onClick={() => {
                    const match = lookups.commodities.find((item) => item.label === row.commodityName);
                    goCommodity({ commodityId: match?.value || "", regencyCode: commodityExplorer.regionDetail.regencyCode, metric: commodityExplorer.map.metric });
                  }}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">{row.commodityName}</div>
                        <div className="text-xs text-slate-500">{row.subcategory} • {row.sourceLabel}</div>
                      </div>
                      <div className="text-right font-semibold text-slate-900">{formatNumber(row.value, 2)} {row.unit}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">Belum ada wilayah terpilih.</div>}
          </Card>

          <Card className="p-5">
            <h3 className="text-lg font-semibold text-slate-900">Top komoditas resmi berbasis indikator aktif</h3>
            <p className="mt-1 text-sm text-slate-500">Klik bar untuk membuka analisis komoditas yang lebih rinci.</p>
            <div className="mt-5 h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={commodityExplorer.charts.commodityRanking.slice(0, 8)} layout="vertical" margin={{ left: 28 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fill: '#334155', fontSize: 12 }} />
                  <Tooltip formatter={(value) => [`${formatNumber(value, 2)} ${commodityExplorer.summary.metricUnit}`, commodityExplorer.summary.metricLabel]} />
                  <Bar dataKey="value" radius={[0, 10, 10, 0]} onClick={(entry) => { const match = lookups.commodities.find((row) => row.label === entry.name); goCommodity({ commodityId: match?.value || "", metric: commodityExplorer.map.metric }); }}>
                    {commodityExplorer.charts.commodityRanking.slice(0, 8).map((item, index) => <Cell key={item.name} fill={chartColors[index % chartColors.length]} cursor="pointer" />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-2xl font-semibold text-slate-900">Advanced insight</h3>
          <p className="mt-1 text-sm text-slate-500">Ringkasan cepat untuk membaca wilayah sentra, dominasi komoditas, kesiapan sumber data, dan dasar impor berikutnya.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {dashboard.insights.map((item) => <InsightCard key={item.id} item={item} />)}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-5">
          <h3 className="text-lg font-semibold text-slate-900">Ranking kecamatan dan program</h3>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Kecamatan dengan poktan terbanyak</p>
              <div className="mt-3 space-y-2">
                {dashboard.charts.districtRanking.slice(0, 5).map((item, index) => (
                  <div key={item.districtCode} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 text-sm">
                    <span className="font-medium text-slate-700">{index + 1}. {item.name}</span>
                    <span className="font-semibold text-slate-900">{formatNumber(item.total)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Wilayah dokumen program 2025</p>
              <div className="mt-3 space-y-2">
                {dashboard.charts.programRanking.slice(0, 5).map((item, index) => (
                  <div key={item.regencyCode} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 text-sm">
                    <span className="font-medium text-slate-700">{index + 1}. {item.name}</span>
                    <span className="font-semibold text-slate-900">{formatNumber(item.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-lg font-semibold text-slate-900">Executive ranking dan drilldown wilayah</h3>
            <p className="mt-1 text-sm text-slate-500">Tabel ringkas ini memadukan produksi, petani, poktan, dan catatan program resmi per wilayah.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Wilayah</th>
                  <th className="px-4 py-3 font-semibold">Komoditas utama</th>
                  <th className="px-4 py-3 font-semibold">Produksi</th>
                  <th className="px-4 py-3 font-semibold">Poktan</th>
                  <th className="px-4 py-3 font-semibold">Petani</th>
                  <th className="px-4 py-3 font-semibold">Aktivitas</th>
                  <th className="px-4 py-3 font-semibold">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.regencyTable.map((row) => (
                  <tr key={row.regencyCode} className="border-t border-slate-100 align-top transition hover:bg-emerald-50/40 cursor-pointer" onClick={() => goCommodity({ regencyCode: row.regencyCode })}>
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.regencyName}</td>
                    <td className="px-4 py-3 text-slate-600">{row.mainCommodity}</td>
                    <td className="px-4 py-3 text-slate-600">{formatNumber(row.productionTon, 2)} ton</td>
                    <td className="px-4 py-3 text-slate-600">{formatNumber(row.farmerGroups)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatNumber(row.farmers)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatNumber(row.activities)}</td>
                    <td className="px-4 py-3 text-slate-500">{row.statusNote}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Data freshness dan activity feed</h3>
              <p className="mt-1 text-sm text-slate-500">Menampilkan perubahan data terakhir, login terbaru, dan pembaruan program.</p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{formatDateTime(dashboard.dataFreshness.lastUpdatedAt)}</div>
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Perubahan data terbaru</p>
              <div className="mt-3 space-y-3">
                {dashboard.dataFreshness.recentAudit.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-100 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-slate-900">{item.action}</div>
                      <div className="text-xs text-slate-400">{formatDateTime(item.timestamp)}</div>
                    </div>
                    <div className="mt-1 text-sm text-slate-500">{item.description}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Program resmi terbaru</p>
              <div className="mt-3 space-y-3">
                {dashboard.dataFreshness.latestPrograms.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-100 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-slate-900">{item.activityName}</div>
                      <div className="text-xs text-slate-400">{item.year}</div>
                    </div>
                    <div className="mt-1 text-sm text-slate-500">{item.regencyName} • {item.fundingSource}</div>
                    <div className="mt-1 text-xs text-slate-400">{item.volume}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Katalog sumber dan dasar impor</h3>
              <p className="mt-1 text-sm text-slate-500">Dashboard ini membedakan jelas antara file resmi rilis dan file template format.</p>
            </div>
            <Link to="/dashboard/impor-data" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">Buka pusat impor <ArrowRight size={16} /></Link>
          </div>
          <div className="mt-5 space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">File resmi aktif</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {dashboard.sourceCatalog.officialDatasets.slice(0, 8).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-100 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-slate-900">{item.title}</div>
                      <div className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.authoritative ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{item.authoritative ? 'resmi' : 'template'}</div>
                    </div>
                    <div className="mt-2 text-sm text-slate-500">{item.note}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Acuan tabel impor</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {dashboard.sourceCatalog.templateCatalog.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-100 p-4">
                    <div className="flex items-center gap-2 font-semibold text-slate-900"><FileSpreadsheet size={16} />{item.sheetName}</div>
                    <div className="mt-2 text-sm text-slate-500">{item.purpose}</div>
                    <div className="mt-3 text-xs text-slate-400">Map ke resource: {item.mappedResource}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
