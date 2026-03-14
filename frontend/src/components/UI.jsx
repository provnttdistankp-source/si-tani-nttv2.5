import { AlertCircle, LoaderCircle, Trash2, X } from "lucide-react";

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ className = "", children }) {
  return <div className={`rounded-3xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>;
}

export function StatCard({ title, value, icon: Icon, hint }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <h3 className="mt-3 text-3xl font-bold text-slate-900">{value}</h3>
          {hint && <p className="mt-2 text-xs text-emerald-600">{hint}</p>}
        </div>
        {Icon ? (
          <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
            <Icon size={22} />
          </div>
        ) : null}
      </div>
    </Card>
  );
}

export function Button({ variant = "primary", className = "", ...props }) {
  const styles = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-700",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "text-slate-600 hover:bg-slate-100"
  };

  return (
    <button className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${styles[variant]} ${className}`} {...props} />
  );
}

export function Input({ label, error, className = "", ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>}
      <input className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 ${className}`} {...props} />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

export function Select({ label, children, error, className = "", ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>}
      <select className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-emerald-500 ${className}`} {...props}>
        {children}
      </select>
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

export function Textarea({ label, error, className = "", ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>}
      <textarea className={`min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 ${className}`} {...props} />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

export function LoadingState({ text = "Memuat data..." }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-slate-500">
      <LoaderCircle className="animate-spin" size={20} />
      <span>{text}</span>
    </div>
  );
}

export function EmptyState({ title = "Belum ada data", description = "Tambahkan data baru untuk mulai bekerja." }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500"><AlertCircle /></div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

export function Modal({ open, title, children, onClose, size = "max-w-3xl" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className={`w-full ${size} rounded-3xl bg-white shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto p-6 custom-scrollbar">{children}</div>
      </div>
    </div>
  );
}

export function Toast({ toast, onClose }) {
  if (!toast) return null;
  return (
    <div className={`fixed right-4 top-4 z-[60] min-w-72 rounded-2xl px-4 py-3 text-sm shadow-lg ${toast.type === "error" ? "bg-red-600 text-white" : "bg-emerald-600 text-white"}`}>
      <div className="flex items-start justify-between gap-4">
        <div>{toast.message}</div>
        <button onClick={onClose}><X size={16} /></button>
      </div>
    </div>
  );
}

export function ConfirmDelete({ open, itemName, onCancel, onConfirm }) {
  return (
    <Modal open={open} title="Konfirmasi hapus" onClose={onCancel} size="max-w-md">
      <p className="text-sm text-slate-600">
        Data <span className="font-semibold text-slate-900">{itemName}</span> akan dihapus dari sistem. Tindakan ini bisa memengaruhi tampilan dashboard dan laporan.
      </p>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>Batal</Button>
        <Button variant="danger" onClick={onConfirm}><Trash2 size={16} />Hapus</Button>
      </div>
    </Modal>
  );
}
