import { useState } from "react";
import { Button, Card, Input, PageHeader, Toast } from "../components/UI";

export default function SettingsPage() {
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ appTitle: "SI Tani NTT", accent: "Hijau", mapProvider: "OpenStreetMap", dashboardMode: "Ringkas" });

  const save = (e) => {
    e.preventDefault();
    setToast({ type: "success", message: "Pengaturan tampilan berhasil disimpan untuk sesi preview." });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Pengaturan" subtitle="Simulasi pengaturan tampilan, branding, dan preferensi dashboard." />
      <Card className="p-6">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={save}>
          <Input label="Judul aplikasi" value={form.appTitle} onChange={(e) => setForm((s) => ({ ...s, appTitle: e.target.value }))} />
          <Input label="Warna aksen" value={form.accent} onChange={(e) => setForm((s) => ({ ...s, accent: e.target.value }))} />
          <Input label="Provider peta" value={form.mapProvider} onChange={(e) => setForm((s) => ({ ...s, mapProvider: e.target.value }))} />
          <Input label="Mode dashboard" value={form.dashboardMode} onChange={(e) => setForm((s) => ({ ...s, dashboardMode: e.target.value }))} />
          <div className="md:col-span-2 flex justify-end"><Button type="submit">Simpan perubahan</Button></div>
        </form>
      </Card>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
