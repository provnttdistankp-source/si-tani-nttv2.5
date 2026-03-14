import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { MapView } from "../components/MapView";
import { Card, LoadingState, PageHeader, Select, Input } from "../components/UI";

export default function MapPage() {
  const [lookups, setLookups] = useState(null);
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ category: "", regencyCode: "", districtCode: "", status: "", commodityId: "", search: "", waterSourceType: "" });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
    return params.toString();
  }, [filters]);

  useEffect(() => {
    api.get("/api/lookups").then(setLookups).catch(console.error);
  }, []);

  useEffect(() => {
    api.get(`/api/map?${queryString}`).then(setData).catch(console.error);
  }, [queryString]);

  if (!data || !lookups) return <LoadingState text="Memuat peta interaktif..." />;

  const districtOptions = lookups.districts.filter((x) => !filters.regencyCode || x.regencyCode === filters.regencyCode);

  return (
    <div className="space-y-6">
      <PageHeader title="Peta interaktif" subtitle="Sebaran kegiatan pertanian, kelompok tani, lahan, titik wilayah, dan sumber air dengan mode satelit serta analisis kedekatan air." />
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card className="space-y-4 p-5">
          <h3 className="text-lg font-semibold text-slate-900">Filter peta</h3>
          <Input placeholder="Cari nama lokasi, wilayah, atau sumber air" value={filters.search} onChange={(e) => setFilters((s) => ({ ...s, search: e.target.value }))} />
          <Select value={filters.category} onChange={(e) => setFilters((s) => ({ ...s, category: e.target.value }))}>
            <option value="">Semua kategori</option>
            {["Petani", "Kegiatan", "Kelompok Tani", "Lahan", "Wilayah"].map((item) => <option key={item} value={item}>{item}</option>)}
          </Select>
          <Select value={filters.regencyCode} onChange={(e) => setFilters((s) => ({ ...s, regencyCode: e.target.value, districtCode: "" }))}>
            <option value="">Semua kabupaten/kota</option>
            {lookups.regencies.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </Select>
          <Select value={filters.districtCode} onChange={(e) => setFilters((s) => ({ ...s, districtCode: e.target.value }))}>
            <option value="">Semua kecamatan</option>
            {districtOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </Select>
          <Select value={filters.commodityId} onChange={(e) => setFilters((s) => ({ ...s, commodityId: e.target.value }))}>
            <option value="">Semua komoditas</option>
            {lookups.commodities.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </Select>
          <Select value={filters.waterSourceType} onChange={(e) => setFilters((s) => ({ ...s, waterSourceType: e.target.value }))}>
            <option value="">Semua jenis sumber air</option>
            {lookups.waterSourceTypes.map((item) => <option key={item} value={item}>{item}</option>)}
          </Select>
          <Select value={filters.status} onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value }))}>
            <option value="">Semua status</option>
            {["aktif", "pendampingan", "Produktif", "Perlu Pendampingan", "Siap Tanam", "Panen", "Terjadwal", "Berlangsung", "Selesai", "Ditunda", "active", "monitoring"].map((item) => <option key={item} value={item}>{item}</option>)}
          </Select>

          <div className="rounded-3xl bg-slate-50 p-4">
            <h4 className="font-semibold text-slate-900">Statistik peta</h4>
            <p className="mt-2 text-sm text-slate-500">Total marker pertanian: {data.stats.total}</p>
            <p className="text-sm text-slate-500">Total sumber air: {data.stats.totalWaterSources}</p>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              {Object.entries(data.stats.categories).map(([key, value]) => <div key={key} className="flex justify-between"><span>{key}</span><span className="font-semibold text-slate-900">{value}</span></div>)}
            </div>
          </div>

          <div className="rounded-3xl bg-slate-50 p-4">
            <h4 className="font-semibold text-slate-900">Sebaran jenis sumber air</h4>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              {Object.entries(data.stats.waterSourceTypes).length ? Object.entries(data.stats.waterSourceTypes).map(([key, value]) => (
                <div key={key} className="flex justify-between"><span>{key}</span><span className="font-semibold text-slate-900">{value}</span></div>
              )) : <p className="text-sm text-slate-500">Belum ada sumber air pada filter ini.</p>}
            </div>
          </div>

          <div className="rounded-3xl bg-emerald-50 p-4">
            <h4 className="font-semibold text-slate-900">Mode citra asli</h4>
            <p className="mt-2 text-sm text-slate-600">Layer satelit memakai citra nyata, sehingga hamparan lahan, pepohonan, tutupan vegetasi, jalan, dan pola kebun lebih mudah dikenali. Overlay jaringan air internet dibuat manual dan baru ringan dipakai saat Anda aktifkan sendiri lalu memperbesar peta ke zoom 12 ke atas.</p>
          </div>

          <div className="rounded-3xl bg-slate-50 p-4">
            <h4 className="font-semibold text-slate-900">Legenda</h4>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              {data.legends.map((item) => <div key={item.category} className="flex justify-between"><span>{item.label}</span><span>{item.category}</span></div>)}
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden p-3">
          <MapView markers={data.markers} waterSources={data.waterSources} height="calc(100vh - 220px)" />
        </Card>
      </div>
    </div>
  );
}
