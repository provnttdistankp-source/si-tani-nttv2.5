import { useEffect, useMemo, useState } from "react";
import { MapPinned } from "lucide-react";
import { api } from "../lib/api";
import { DataTable } from "../components/Table";
import { Button, ConfirmDelete, LoadingState, Modal, PageHeader, Select, Toast, Card } from "../components/UI";
import { DynamicForm } from "../components/Forms";
import { MapView } from "../components/MapView";
import { moduleConfig } from "./moduleConfig";
import { useLocation } from "react-router-dom";

const numericFields = new Set(["age", "membersCount", "areaHa", "latitude", "longitude", "formedYear"]);

function buildLocationMarker(row, lookups, config) {
  const district = lookups.districts?.find((item) => item.value === row.districtCode);
  const regency = lookups.regencies?.find((item) => item.value === row.regencyCode);
  const latitude = Number(row.latitude ?? district?.latitude ?? regency?.latitude ?? -8.657);
  const longitude = Number(row.longitude ?? district?.longitude ?? regency?.longitude ?? 121.079);

  return {
    id: `preview-${row.id}`,
    name: row.name || row.title || row.id,
    category: config.locationCategory || config.title,
    latitude,
    longitude,
    regencyCode: row.regencyCode,
    districtCode: row.districtCode,
    regencyName: row.regencyName || regency?.label,
    districtName: row.districtName || district?.label,
    status: row.status,
    village: row.village,
    location: row.location,
    nik: row.nik,
    chairman: row.chairman,
    chairmanNik: row.chairmanNik,
    source: row.latitude && row.longitude ? "exact" : "region-center",
    nearestWaterSource: row.nearestWaterSource,
    nearestWaterDistanceKm: row.nearestWaterDistanceKm,
    nearbyWaterSources: row.nearbyWaterSources || [],
    waterSupportLevel: row.waterSupportLevel
  };
}

function preparePayload(fields, values) {
  const payload = {};
  for (const field of fields) {
    if (field.type === "map-picker") continue;
    let value = values[field.name];
    if (typeof value === "string") value = value.trim();
    if (numericFields.has(field.name)) {
      payload[field.name] = value === "" || value === undefined ? null : Number(value);
      continue;
    }
    payload[field.name] = value ?? "";
  }
  return payload;
}

export default function ModulePage() {
  const location = useLocation();
  const key = location.pathname.split("/").pop();
  const config = moduleConfig[key];
  const [lookups, setLookups] = useState({ regencies: [], districts: [], farmerGroups: [], fieldOfficers: [], commodities: [], users: [], farmers: [], roles: [], waterSources: [] });
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [query, setQuery] = useState({ page: 1, limit: 10, search: "", sortBy: config?.columns?.[0]?.key || "id", order: "asc", regencyCode: "" });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detailRow, setDetailRow] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [locationPreview, setLocationPreview] = useState(null);
  const [liveNearbyWater, setLiveNearbyWater] = useState(null);
  const [liveNearbyWaterLoading, setLiveNearbyWaterLoading] = useState(false);

  const endpoint = config?.endpoint;
  const title = config?.title;

  const fetchData = async () => {
    if (!endpoint) return;
    setLoading(true);
    try {
      const searchParams = new URLSearchParams();
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") searchParams.set(k, v);
      });
      const [tableData, lookupData] = await Promise.all([api.get(`/api/${endpoint}?${searchParams.toString()}`), api.get("/api/lookups")]);
      setRows(tableData.data);
      setPagination(tableData.pagination);
      setLookups(lookupData);
    } catch (error) {
      setToast({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [key, query.page, query.search, query.sortBy, query.order, query.regencyCode]);

  useEffect(() => {
    setQuery((s) => ({
      ...s,
      page: 1,
      search: "",
      regencyCode: "",
      sortBy: config?.columns?.[0]?.key || "id",
      order: "asc"
    }));
  }, [key]);

  const openCreate = () => {
    setEditRow(null);
    setFormValues({});
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditRow(row);
    setFormValues(row);
    setFormOpen(true);
  };

  const openLocationPreview = (row) => {
    setLocationPreview(buildLocationMarker(row, lookups, config));
  };

  const saveRow = async (e) => {
    e.preventDefault();
    try {
      const payload = preparePayload(config.fields, formValues);
      if (editRow) {
        await api.put(`/api/${endpoint}/${editRow.id}`, payload);
        setToast({ type: "success", message: "Data berhasil diperbarui." });
      } else {
        await api.post(`/api/${endpoint}`, payload);
        setToast({ type: "success", message: "Data berhasil ditambahkan." });
      }
      setFormOpen(false);
      fetchData();
    } catch (error) {
      setToast({ type: "error", message: error.message });
    }
  };

  const removeRow = async () => {
    if (!deleteRow) return;
    try {
      await api.delete(`/api/${endpoint}/${deleteRow.id}`);
      setToast({ type: "success", message: "Data berhasil dihapus." });
      setDeleteRow(null);
      fetchData();
    } catch (error) {
      setToast({ type: "error", message: error.message });
    }
  };

  const filtersSlot = useMemo(() => (
    <div className="flex flex-wrap gap-3">
      <div className="min-w-60">
        <Select value={query.regencyCode} onChange={(e) => setQuery((s) => ({ ...s, regencyCode: e.target.value, page: 1 }))}>
          <option value="">Semua kabupaten/kota</option>
          {lookups.regencies?.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </Select>
      </div>
    </div>
  ), [lookups.regencies, query.regencyCode]);

  useEffect(() => {
    let active = true;
    if (!locationPreview) {
      setLiveNearbyWater(null);
      setLiveNearbyWaterLoading(false);
      return () => {
        active = false;
      };
    }

    setLiveNearbyWaterLoading(true);
    api
      .get(`/api/map/nearby-water?lat=${locationPreview.latitude}&lng=${locationPreview.longitude}&radiusMeters=4000`)
      .then((result) => {
        if (active) setLiveNearbyWater(result);
      })
      .catch((error) => {
        if (active) setLiveNearbyWater({ error: error.message, features: [], stats: { total: 0, byType: {} } });
      })
      .finally(() => {
        if (active) setLiveNearbyWaterLoading(false);
      });

    return () => {
      active = false;
    };
  }, [locationPreview]);

  const rowActions = useMemo(() => {
    if (!config?.enableLocationPreview) return [];
    return [{ key: "location", label: "Lihat lokasi", icon: MapPinned, onClick: openLocationPreview }];
  }, [config, lookups]);

  if (!config) {
    return <Card className="p-8">Modul tidak ditemukan.</Card>;
  }

  const previewWaterSources = locationPreview?.nearbyWaterSources?.length
    ? locationPreview.nearbyWaterSources
    : locationPreview?.nearestWaterSource
      ? [locationPreview.nearestWaterSource]
      : [];

  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle="Tabel mendukung pencarian, filter, sorting, pagination, dan aksi detail." action={!config.readOnly ? <Button onClick={openCreate}>Tambah</Button> : null} />
      {loading ? (
        <LoadingState />
      ) : (
        <DataTable
          title={title}
          columns={config.columns}
          rows={rows}
          search={query.search}
          onSearch={(value) => setQuery((s) => ({ ...s, search: value, page: 1 }))}
          onAdd={!config.readOnly ? openCreate : null}
          onEdit={!config.readOnly ? openEdit : null}
          onDelete={!config.readOnly ? setDeleteRow : null}
          onDetail={setDetailRow}
          onSort={(sortKey) => setQuery((s) => ({ ...s, sortBy: sortKey, order: s.sortBy === sortKey && s.order === "asc" ? "desc" : "asc" }))}
          pagination={pagination}
          onPageChange={(page) => setQuery((s) => ({ ...s, page }))}
          filtersSlot={filtersSlot}
          rowActions={rowActions}
        />
      )}

      <Modal open={formOpen} title={editRow ? `Edit ${title}` : `Tambah ${title}`} onClose={() => setFormOpen(false)}>
        <DynamicForm fields={config.fields} values={formValues} lookups={lookups} onChange={(name, value) => setFormValues((s) => ({ ...s, [name]: value }))} onSubmit={saveRow} submitLabel={editRow ? "Perbarui data" : "Simpan data"} />
      </Modal>

      <Modal open={Boolean(detailRow)} title={`Detail ${title}`} onClose={() => setDetailRow(null)}>
        {detailRow ? (
          key === "komoditas" ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Kategori", detailRow.category],
                  ["Tahun data", detailRow.latestYear || detailRow.sourceYear || "-"],
                  ["Total produksi", detailRow.totalProductionDisplay || "-"],
                  ["Sebaran", detailRow.coverageDisplay || "-"],
                  ["Kabupaten tertinggi", detailRow.topRegencyName || "-"],
                  ["Dataset", detailRow.sourceSummary || detailRow.sourceDataset || "-"],
                  ["Sumber institusi", detailRow.sourceInstitution || "-"],
                  ["Deskripsi", detailRow.description || "-"]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                    <p className="mt-2 break-words text-sm text-slate-700">{String(value ?? "-")}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-3xl overflow-hidden border border-slate-200">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h4 className="text-lg font-semibold text-slate-900">Sebaran komoditas per kabupaten/kota</h4>
                  <p className="mt-1 text-sm text-slate-500">Ringkasan wilayah dengan produksi tertinggi pada tahun data terbaru.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Kabupaten/Kota</th>
                        <th className="px-4 py-3 font-semibold">Tahun</th>
                        <th className="px-4 py-3 font-semibold">Produksi</th>
                        <th className="px-4 py-3 font-semibold">Luas</th>
                        <th className="px-4 py-3 font-semibold">Produktivitas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detailRow.regionalSpread || []).map((item) => (
                        <tr key={`${item.regencyCode}-${item.year}`} className="border-t border-slate-100">
                          <td className="px-4 py-3 text-slate-700">{item.regencyName}</td>
                          <td className="px-4 py-3 text-slate-700">{item.year}</td>
                          <td className="px-4 py-3 text-slate-700">{item.productionTon} ton</td>
                          <td className="px-4 py-3 text-slate-700">{item.areaValue} {item.areaUnit}</td>
                          <td className="px-4 py-3 text-slate-700">{item.productivityValue} {item.productivityUnit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {Object.entries(detailRow).map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{k}</p>
                  <p className="mt-2 break-words text-sm text-slate-700">{typeof v === "object" ? JSON.stringify(v) : String(v ?? "-")}</p>
                </div>
              ))}
            </div>
          )
        ) : null}
      </Modal>

      <Modal open={Boolean(locationPreview)} title={`Lokasi ${locationPreview?.name || title}`} onClose={() => setLocationPreview(null)} size="max-w-6xl">
        {locationPreview ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Kategori</p>
                <p className="mt-2 text-sm text-slate-700">{locationPreview.category}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Kabupaten/Kota</p>
                <p className="mt-2 text-sm text-slate-700">{locationPreview.regencyName || "-"}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Kecamatan</p>
                <p className="mt-2 text-sm text-slate-700">{locationPreview.districtName || "-"}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Koordinat</p>
                <p className="mt-2 text-sm text-slate-700">{locationPreview.latitude.toFixed(6)}, {locationPreview.longitude.toFixed(6)}</p>
              </div>
              <div className="rounded-2xl bg-sky-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Air Terdekat</p>
                <p className="mt-2 text-sm font-semibold text-slate-800">{locationPreview.nearestWaterSource?.name || "Belum ada"}</p>
                <p className="mt-1 text-xs text-slate-600">{locationPreview.nearestWaterSource ? `${locationPreview.nearestWaterSource.type} · ${locationPreview.nearestWaterDistanceKm} km` : "Analisis belum tersedia"}</p>
              </div>
              <div className="rounded-2xl bg-sky-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Dukungan Air</p>
                <p className="mt-2 text-sm font-semibold text-slate-800">{locationPreview.waterSupportLevel || "Belum dihitung"}</p>
                <p className="mt-1 text-xs text-slate-600">Radius overlay menampilkan titik sumber air terdekat untuk analisis lapangan.</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
              <MapView markers={[locationPreview]} waterSources={previewWaterSources} center={[locationPreview.latitude, locationPreview.longitude]} zoom={12} height="460px" autoOpenFirst showWaterLines />
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Analisis air internet sekitar lokasi</p>
                  {liveNearbyWaterLoading ? <p className="mt-3 text-sm text-slate-500">Memuat sungai, mata air, dan badan air nyata dari internet...</p> : null}
                  {!liveNearbyWaterLoading && liveNearbyWater?.error ? <p className="mt-3 text-sm text-rose-600">{liveNearbyWater.error}</p> : null}
                  {!liveNearbyWaterLoading && !liveNearbyWater?.error ? (
                    <>
                      <p className="mt-3 text-sm text-slate-600">Total fitur air internet di radius 4 km: <span className="font-semibold text-slate-900">{liveNearbyWater?.stats?.total || 0}</span></p>
                      <p className="mt-1 text-sm text-slate-600">Fitur terdekat: <span className="font-semibold text-slate-900">{liveNearbyWater?.nearest?.name || "Belum ditemukan"}</span></p>
                      {liveNearbyWater?.nearest ? <p className="mt-1 text-xs text-slate-500">{liveNearbyWater.nearest.waterType} · {liveNearbyWater.nearest.distanceKm} km · sumber OpenStreetMap Live</p> : null}
                    </>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Jenis fitur air internet</p>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    {Object.entries(liveNearbyWater?.stats?.byType || {}).length ? Object.entries(liveNearbyWater?.stats?.byType || {}).map(([group, value]) => (
                      <div key={group} className="flex items-center justify-between gap-3"><span>{group}</span><span className="font-semibold text-slate-900">{value}</span></div>
                    )) : <p className="text-sm text-slate-500">Belum ada fitur air internet yang masuk radius ini.</p>}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Daftar air terdekat</p>
                  <div className="mt-3 space-y-3">
                    {(liveNearbyWater?.features || []).slice(0, 6).map((item) => (
                      <div key={item.id} className="rounded-2xl bg-white p-3 shadow-sm">
                        <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                        <p className="mt-1 text-xs text-slate-600">{item.waterType} · {item.distanceKm} km</p>
                      </div>
                    ))}
                    {!liveNearbyWaterLoading && !(liveNearbyWater?.features || []).length ? <p className="text-sm text-slate-500">Tidak ada daftar air internet pada radius ini.</p> : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDelete open={Boolean(deleteRow)} itemName={deleteRow?.name || deleteRow?.title || deleteRow?.id} onCancel={() => setDeleteRow(null)} onConfirm={removeRow} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
