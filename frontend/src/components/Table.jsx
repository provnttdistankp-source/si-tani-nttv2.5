import { ArrowUpDown, Eye, MapPinned, Pencil, Search, Trash2 } from "lucide-react";
import { Button, Card, EmptyState, Input } from "./UI";

export function DataTable({ title, columns, rows, search, onSearch, onAdd, onEdit, onDelete, onDetail, onSort, pagination, onPageChange, filtersSlot, rowActions = [] }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-100 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">Kelola data, lakukan pencarian, filter, dan aksi detail dari satu halaman.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input placeholder="Cari data..." value={search} onChange={(e) => onSearch(e.target.value)} className="pl-9" />
            </div>
            {onAdd && <Button onClick={onAdd}>Tambah Data</Button>}
          </div>
        </div>
        {filtersSlot ? <div className="mt-4">{filtersSlot}</div> : null}
      </div>

      {rows.length === 0 ? (
        <div className="p-5"><EmptyState /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className="px-4 py-3 font-semibold">
                    <button className="inline-flex items-center gap-2" onClick={() => onSort?.(column.key)} type="button">
                      {column.label}
                      {column.sortable !== false && <ArrowUpDown size={14} className="text-slate-400" />}
                    </button>
                  </th>
                ))}
                <th className="px-4 py-3 font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 hover:bg-emerald-50/40">
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3 text-slate-700">{column.render ? column.render(row) : row[column.key] ?? "-"}</td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {rowActions.map((action) => {
                        const Icon = action.icon || MapPinned;
                        return (
                          <button
                            key={action.key}
                            type="button"
                            title={action.label}
                            className={`rounded-xl p-2 text-slate-500 hover:bg-slate-100 ${action.className || ""}`}
                            onClick={() => action.onClick(row)}
                          >
                            <Icon size={16} />
                          </button>
                        );
                      })}
                      {onDetail && <button type="button" title="Detail" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" onClick={() => onDetail(row)}><Eye size={16} /></button>}
                      {onEdit && <button type="button" title="Edit" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" onClick={() => onEdit(row)}><Pencil size={16} /></button>}
                      {onDelete && <button type="button" title="Hapus" className="rounded-xl p-2 text-red-500 hover:bg-red-50" onClick={() => onDelete(row)}><Trash2 size={16} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination ? (
        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>Menampilkan halaman {pagination.page} dari {pagination.totalPages} · Total {pagination.total} data</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => onPageChange(Math.max(1, pagination.page - 1))} disabled={pagination.page <= 1}>Sebelumnya</Button>
            <Button variant="secondary" onClick={() => onPageChange(Math.min(pagination.totalPages, pagination.page + 1))} disabled={pagination.page >= pagination.totalPages}>Berikutnya</Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
