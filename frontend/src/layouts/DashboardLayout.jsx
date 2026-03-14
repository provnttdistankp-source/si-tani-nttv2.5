import { Bell, ChartColumn, FileSpreadsheet, FileText, Home, LandPlot, Leaf, LogOut, Map, ShieldCheck, Sprout, Tractor, User, Users, Wheat } from "lucide-react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const menu = [
  { to: "/dashboard", label: "Ringkasan", icon: Home },
  { to: "/dashboard/users", label: "Pengguna", icon: User },
  { to: "/dashboard/petani", label: "Petani", icon: Users },
  { to: "/dashboard/kelompok-tani", label: "Kelompok Tani", icon: Tractor },
  { to: "/dashboard/lahan", label: "Lahan", icon: LandPlot },
  { to: "/dashboard/komoditas", label: "Komoditas", icon: Wheat },
  { to: "/dashboard/kegiatan", label: "Kegiatan", icon: Sprout },
  { to: "/dashboard/penyuluh", label: "Penyuluh", icon: Leaf },
  { to: "/dashboard/wilayah", label: "Wilayah", icon: Map },
  { to: "/dashboard/data-utama", label: "Data Utama", icon: ChartColumn },
  { to: "/dashboard/peta", label: "Peta Interaktif", icon: Map },
  { to: "/dashboard/laporan", label: "Laporan", icon: FileText },
  { to: "/dashboard/impor-data", label: "Impor Data", icon: FileSpreadsheet },
  { to: "/dashboard/audit-log", label: "Audit Log", icon: ShieldCheck }
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="hidden border-r border-slate-200 bg-white px-5 py-6 lg:block">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white">
              <Sprout />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">SI Tani NTT</h2>
              <p className="text-xs text-slate-500">Dashboard pertanian terpadu</p>
            </div>
          </Link>

          <nav className="mt-8 space-y-1">
            {menu.filter((item) => (item.to !== "/dashboard/audit-log" && item.to !== "/dashboard/impor-data") || user?.role === "admin").map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/dashboard"}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                      isActive ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
                    }`
                  }
                >
                  <Icon size={18} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur md:px-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">Selamat datang</p>
                <h1 className="text-lg font-semibold text-slate-900">{user?.name || "Pengguna"}</h1>
              </div>
              <div className="flex items-center gap-3">
                <Link to="/profile" className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
                  <span className="inline-flex items-center gap-2"><Bell size={16} />Notifikasi</span>
                </Link>
                <div className="hidden rounded-2xl bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 md:block">{user?.role}</div>
                <button onClick={onLogout} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
                  <span className="inline-flex items-center gap-2"><LogOut size={16} />Keluar</span>
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
