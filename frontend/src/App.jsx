import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import { LoginPage, RegisterPage, ForgotPasswordPage } from "./pages/AuthPages";
import DashboardLayout from "./layouts/DashboardLayout";
import DashboardHome from "./dashboard/DashboardHome";
import ModulePage from "./dashboard/ModulePage";
import CommodityPage from "./dashboard/CommodityPage";
import MapPage from "./dashboard/MapPage";
import ReportsPage from "./dashboard/ReportsPage";
import ProfilePage from "./dashboard/ProfilePage";
import SettingsPage from "./dashboard/SettingsPage";
import AuditPage from "./dashboard/AuditPage";
import ImportPage from "./dashboard/ImportPage";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LoadingState } from "./components/UI";

function ProtectedRoute({ children }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) return <LoadingState text="Menyiapkan sesi Anda..." />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<DashboardHome />} />
        <Route path="users" element={<ModulePage />} />
        <Route path="petani" element={<ModulePage />} />
        <Route path="kelompok-tani" element={<ModulePage />} />
        <Route path="lahan" element={<ModulePage />} />
        <Route path="komoditas" element={<CommodityPage />} />
        <Route path="kegiatan" element={<ModulePage />} />
        <Route path="penyuluh" element={<ModulePage />} />
        <Route path="wilayah" element={<ModulePage />} />
        <Route path="data-utama" element={<ModulePage />} />
        <Route path="peta" element={<MapPage />} />
        <Route path="laporan" element={<ReportsPage />} />
        <Route path="audit-log" element={<AuditPage />} />
        <Route path="impor-data" element={<ImportPage />} />
      </Route>
      <Route path="/profile" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}><Route index element={<ProfilePage />} /></Route>
      <Route path="/settings" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}><Route index element={<SettingsPage />} /></Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return <AuthProvider><AppRoutes /></AuthProvider>;
}
