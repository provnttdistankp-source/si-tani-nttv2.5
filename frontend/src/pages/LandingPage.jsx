import { ArrowRight, BarChart3, Map, ShieldCheck, Sprout, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Card, Button, LoadingState } from "../components/UI";
import { MapView } from "../components/MapView";

export default function LandingPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/api/public/home").then(setData).catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white"><Sprout /></div>
            <div>
              <h1 className="font-bold text-slate-900">SI Tani NTT</h1>
              <p className="text-xs text-slate-500">Sistem Informasi Tani Nusa Tenggara Timur</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Login</Link>
            <Link to="/register" className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Daftar</Link>
          </div>
        </div>
      </header>

      <section className="bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.15),_transparent_30%)]">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <span className="inline-flex rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">Fullstack web application • interaktif • siap dikembangkan</span>
            <h2 className="mt-6 max-w-4xl text-5xl font-black leading-tight text-slate-900">Kendalikan data pertanian NTT dari dashboard, peta, hingga laporan.</h2>
            <p className="mt-6 max-w-2xl text-lg text-slate-600">Kelola pengguna, petani, kelompok tani, lahan, komoditas, kegiatan, data utama pertanian, dan sebaran kegiatan pada satu sistem yang bersih, responsif, dan mudah dipahami.</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/login"><Button className="px-6 py-3 text-base">Masuk ke dashboard<ArrowRight size={18} /></Button></Link>
              <a href="#fitur" className="rounded-2xl border border-slate-200 px-6 py-3 text-base font-semibold text-slate-700">Lihat fitur</a>
            </div>
          </div>

          <Card className="overflow-hidden p-6">
            {!data ? <LoadingState text="Menyiapkan ringkasan dashboard..." /> : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  {[["Petani", data.stats.farmers],["Kelompok Tani", data.stats.farmerGroups],["Lahan", data.stats.lands],["Kegiatan", data.stats.activities]].map(([label, value]) => (
                    <div key={label} className="rounded-3xl bg-slate-50 p-5">
                      <p className="text-sm text-slate-500">{label}</p>
                      <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 h-[280px]"><MapView markers={data.mapPreview} height="280px" /></div>
              </>
            )}
          </Card>
        </div>
      </section>

      <section id="fitur" className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10 text-center">
          <h3 className="text-3xl font-bold text-slate-900">Fitur utama aplikasi</h3>
          <p className="mt-2 text-slate-500">Dirancang untuk instansi pertanian, dinas, penyuluh, dan tim lapangan.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {[
            [Users, "Manajemen data master", "Kelola pengguna, petani, kelompok tani, penyuluh, wilayah, dan komoditas."],
            [Map, "Peta interaktif", "Lihat sebaran kegiatan, kelompok tani, lahan, dan filter berdasarkan wilayah."],
            [BarChart3, "Dashboard dan grafik", "Pantau tren produksi, distribusi komoditas, dan aktivitas bulanan."],
            [ShieldCheck, "Autentikasi berperan", "Admin, petugas lapangan, penyuluh, dan user memiliki alur akses masing-masing."]
          ].map(([Icon, title, desc]) => (
            <Card key={title} className="p-6">
              <div className="inline-flex rounded-2xl bg-emerald-50 p-3 text-emerald-600"><Icon /></div>
              <h4 className="mt-5 text-lg font-semibold text-slate-900">{title}</h4>
              <p className="mt-2 text-sm text-slate-500">{desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            <Card className="p-6">
              <h3 className="text-xl font-bold text-slate-900">Manfaat utama</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                <li>Memusatkan data pertanian dari banyak modul dalam satu sistem.</li>
                <li>Mempercepat pemantauan kegiatan lapangan melalui peta dan filter wilayah.</li>
                <li>Memudahkan ekspor laporan ke Excel dan PDF untuk kebutuhan rapat atau evaluasi.</li>
                <li>Menyediakan seed NTT untuk preview dashboard yang langsung hidup.</li>
              </ul>
            </Card>
            <Card className="p-6">
              {!data ? <LoadingState text="Memuat statistik produksi..." /> : (
                <>
                  <h3 className="text-xl font-bold text-slate-900">Ringkasan wilayah teratas</h3>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {data.featuredRegions.map((item) => (
                      <div key={item.id} className="rounded-3xl border border-slate-100 p-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-slate-900">{item.regencyName}</h4>
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{item.topCommodity}</span>
                        </div>
                        <p className="mt-3 text-sm text-slate-500">Total area {item.totalAreaHa} Ha • Petani {item.farmersCount} • Poktan {item.groupsCount}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-100">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>© 2026 SI Tani NTT. Demo aplikasi fullstack untuk pengelolaan data pertanian Nusa Tenggara Timur.</p>
          <div className="flex gap-4">
            <Link to="/login" className="font-semibold text-emerald-600">Login</Link>
            <Link to="/register" className="font-semibold text-emerald-600">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
