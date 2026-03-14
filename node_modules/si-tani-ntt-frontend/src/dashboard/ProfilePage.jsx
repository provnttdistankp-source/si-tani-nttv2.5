import { useAuth } from "../context/AuthContext";
import { Card, PageHeader } from "../components/UI";

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader title="Profil pengguna" subtitle="Informasi akun yang sedang aktif di sistem." />
      <Card className="p-6">
        <div className="grid gap-5 md:grid-cols-2">
          {[["Nama", user?.name],["Email", user?.email],["Role", user?.role],["Kode wilayah", user?.regionCode],["Login terakhir", user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("id-ID") : "-"]].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
              <p className="mt-2 text-sm text-slate-700">{value || "-"}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
