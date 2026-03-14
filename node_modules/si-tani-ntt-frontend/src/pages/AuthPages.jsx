import { Link, Navigate, useNavigate } from "react-router-dom";
import { Sprout } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { Button, Card, Input, Toast } from "../components/UI";

function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_35%),linear-gradient(180deg,#f8fafc,#f1f5f9)] p-6 lg:grid-cols-2 lg:gap-10 lg:p-10">
      <div className="flex flex-col justify-between rounded-[2rem] bg-emerald-600 p-8 text-white shadow-2xl">
        <div>
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-white/15"><Sprout size={28} /></div>
          <h1 className="mt-6 text-4xl font-bold">SI Tani NTT</h1>
          <p className="mt-4 max-w-xl text-emerald-50">Sistem Informasi Tani berbasis web untuk memantau petani, kelompok tani, lahan, komoditas, kegiatan, laporan, dan peta sebaran pertanian di Nusa Tenggara Timur.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            ["22", "Kabupaten/Kota"],
            ["314", "Kecamatan seed demo"],
            ["120", "Kegiatan aktif"],
            ["180", "Lahan terpetakan"]
          ].map(([value, label]) => (
            <div key={label} className="rounded-3xl bg-white/10 p-4">
              <div className="text-3xl font-bold">{value}</div>
              <div className="text-sm text-emerald-50">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center">
        <Card className="w-full max-w-xl p-8">
          <h2 className="text-3xl font-bold text-slate-900">{title}</h2>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer ? <div className="mt-6 text-sm text-slate-500">{footer}</div> : null}
        </Card>
      </div>
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [form, setForm] = useState({ email: "admin.ntt@sitani.local", password: "demo12345" });
  const [toast, setToast] = useState(null);

  if (user) return <Navigate to="/dashboard" replace />;

  const submit = async (e) => {
    e.preventDefault();
    try {
      await login(form.email, form.password);
      navigate("/dashboard");
    } catch (error) {
      setToast({ type: "error", message: error.message });
    }
  };

  return (
    <AuthShell title="Masuk ke dashboard" subtitle="Gunakan akun demo bawaan atau daftar akun baru." footer={<p>Belum punya akun? <Link className="font-semibold text-emerald-600" to="/register">Daftar sekarang</Link></p>}>
      <form className="space-y-4" onSubmit={submit}>
        <Input label="Email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
        <Input label="Kata sandi" type="password" value={form.password} onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} />
        <div className="flex items-center justify-between text-sm">
          <Link className="font-medium text-emerald-600" to="/forgot-password">Lupa kata sandi</Link>
          <Link className="font-medium text-slate-500" to="/">Kembali ke beranda</Link>
        </div>
        <Button type="submit" className="w-full">Masuk</Button>
      </form>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </AuthShell>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "user" });

  const submit = async (e) => {
    e.preventDefault();
    try {
      await register(form);
      setToast({ type: "success", message: "Registrasi berhasil. Silakan login dengan akun baru Anda." });
      setTimeout(() => navigate("/login"), 800);
    } catch (error) {
      setToast({ type: "error", message: error.message });
    }
  };

  return (
    <AuthShell title="Daftarkan akun baru" subtitle="Akun baru dapat masuk sebagai pengguna umum untuk mengeksplorasi sistem." footer={<p>Sudah punya akun? <Link className="font-semibold text-emerald-600" to="/login">Masuk di sini</Link></p>}>
      <form className="space-y-4" onSubmit={submit}>
        <Input label="Nama lengkap" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
        <Input label="Email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
        <Input label="Kata sandi" type="password" value={form.password} onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} />
        <Button type="submit" className="w-full">Buat akun</Button>
      </form>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [toast, setToast] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const data = await api.post("/api/auth/forgot-password", { email });
      setToast({ type: "success", message: data.message });
    } catch (error) {
      setToast({ type: "error", message: error.message });
    }
  };

  return (
    <AuthShell title="Reset kata sandi" subtitle="Halaman ini mensimulasikan alur reset kata sandi untuk preview aplikasi." footer={<Link className="font-semibold text-emerald-600" to="/login">Kembali ke login</Link>}>
      <form className="space-y-4" onSubmit={submit}>
        <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button type="submit" className="w-full">Kirim instruksi reset</Button>
      </form>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </AuthShell>
  );
}
