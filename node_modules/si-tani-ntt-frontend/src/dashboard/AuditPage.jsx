import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { Card, LoadingState, PageHeader, Select, Input, Button, Toast } from "../components/UI";

const RESOURCE_LABELS = {
  auth: "auth",
  users: "Pengguna",
  farmers: "Petani",
  farmerGroups: "Kelompok Tani",
  lands: "Lahan",
  activities: "Kegiatan",
  fieldOfficers: "Penyuluh",
  commodities: "Komoditas",
  productionData: "Data Produksi",
  regions: "Wilayah",
  mapLocations: "Titik Peta",
  audit: "Audit Log"
};

function resourceLabel(value) {
  return RESOURCE_LABELS[value] || value || "-";
}

function localizeDescription(text = "") {
  return Object.entries(RESOURCE_LABELS).reduce((result, [key, label]) => {
    if (key === "auth") return result;
    return result.replace(new RegExp(key, "g"), label);
  }, text);
}

export default function AuditPage() {
  const [summary, setSummary] = useState(null);
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [toast, setToast] = useState(null);
  const [filters, setFilters] = useState({ page: 1, limit: 12, search: "", action: "", status: "", resource: "", sortBy: "timestamp", order: "desc" });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
    return params.toString();
  }, [filters]);

  const fetchAll = async () => {
    try {
      const [summaryData, logsData] = await Promise.all([
        api.get("/api/audit/summary"),
        api.get(`/api/audit/logs?${queryString}`)
      ]);
      setSummary(summaryData);
      setLogs(logsData.data);
      setPagination(logsData.pagination);
    } catch (error) {
      setToast({ type: "error", message: error.message });
    }
  };

  useEffect(() => {
    fetchAll();
  }, [queryString]);

  if (!summary) return <LoadingState text="Memuat audit log admin..." />;

  return (
    <div className="space-y-6">
      <PageHeader title="Audit log admin" subtitle="Pantau siapa yang login, login terakhir, perubahan data terakhir, dan histori create, update, delete." action={<Button variant="secondary" onClick={fetchAll}>Refresh</Button>} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total Log", summary.stats.totalLogs],
          ["Login Berhasil", summary.stats.successfulLogins],
          ["Login Gagal", summary.stats.failedLogins],
          ["Perubahan 24 Jam", summary.stats.dataChanges24h]
        ].map(([label, value]) => (
          <Card key={label} className="p-5">
            <p className="text-sm text-slate-500">{label}</p>
            <h3 className="mt-3 text-3xl font-bold text-slate-900">{value}</h3>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5">
          <h3 className="text-lg font-semibold text-slate-900">Login terakhir per pengguna</h3>
          <div className="mt-4 space-y-3">
            {summary.latestUserLogins.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-100 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.email} · {item.role}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-700">{new Date(item.lastLoginAt).toLocaleString("id-ID")}</p>
                    <p className="text-xs text-slate-500">IP terakhir: {item.lastLoginIp}</p>
                  </div>
                </div>
              </div>
            ))}
            {!summary.latestUserLogins.length ? <p className="text-sm text-slate-500">Belum ada riwayat login tersimpan.</p> : null}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-lg font-semibold text-slate-900">Perubahan data terbaru</h3>
          <div className="mt-4 space-y-3">
            {summary.recentChanges.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-100 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900">{item.actorName}</p>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{item.action}</span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{localizeDescription(item.description)}</p>
                <p className="mt-1 text-xs text-slate-500">{resourceLabel(item.resource)} · {item.entityName || item.entityId || "-"}</p>
                <p className="mt-1 text-xs text-slate-500">{new Date(item.timestamp).toLocaleString("id-ID")}</p>
              </div>
            ))}
            {!summary.recentChanges.length ? <p className="text-sm text-slate-500">Belum ada perubahan data tercatat.</p> : null}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Input placeholder="Cari pengguna, email, resource" value={filters.search} onChange={(e) => setFilters((s) => ({ ...s, search: e.target.value, page: 1 }))} />
          <Select value={filters.action} onChange={(e) => setFilters((s) => ({ ...s, action: e.target.value, page: 1 }))}>
            <option value="">Semua aksi</option>
            {['login', 'register', 'create', 'update', 'delete'].map((item) => <option key={item} value={item}>{item}</option>)}
          </Select>
          <Select value={filters.status} onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value, page: 1 }))}>
            <option value="">Semua status</option>
            {['success', 'failed'].map((item) => <option key={item} value={item}>{item}</option>)}
          </Select>
          <Select value={filters.resource} onChange={(e) => setFilters((s) => ({ ...s, resource: e.target.value, page: 1 }))}>
            <option value="">Semua resource</option>
            {['auth', 'users', 'farmers', 'farmerGroups', 'lands', 'activities', 'fieldOfficers', 'commodities'].map((item) => <option key={item} value={item}>{resourceLabel(item)}</option>)}
          </Select>
          <Select value={filters.order} onChange={(e) => setFilters((s) => ({ ...s, order: e.target.value, page: 1 }))}>
            <option value="desc">Terbaru dulu</option>
            <option value="asc">Terlama dulu</option>
          </Select>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                {['Waktu', 'Aktor', 'Aksi', 'Resource', 'Target', 'Status', 'Ringkasan'].map((label) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}
              </tr>
            </thead>
            <tbody>
              {logs.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-700">{new Date(item.timestamp).toLocaleString("id-ID")}</td>
                  <td className="px-4 py-3 text-slate-700">{item.actorName}<div className="text-xs text-slate-500">{item.actorEmail}</div></td>
                  <td className="px-4 py-3 text-slate-700">{item.action}</td>
                  <td className="px-4 py-3 text-slate-700">{resourceLabel(item.resource)}</td>
                  <td className="px-4 py-3 text-slate-700">{item.entityName || item.entityId || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{item.status}</td>
                  <td className="px-4 py-3 text-slate-700">{localizeDescription(item.description)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination ? (
          <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
            <p>Menampilkan halaman {pagination.page} dari {pagination.totalPages} · Total {pagination.total} log</p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setFilters((s) => ({ ...s, page: Math.max(1, pagination.page - 1) }))} disabled={pagination.page <= 1}>Sebelumnya</Button>
              <Button variant="secondary" onClick={() => setFilters((s) => ({ ...s, page: Math.min(pagination.totalPages, pagination.page + 1) }))} disabled={pagination.page >= pagination.totalPages}>Berikutnya</Button>
            </div>
          </div>
        ) : null}
      </Card>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
