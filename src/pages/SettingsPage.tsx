import { ThemeCustomizer } from "../components/molecules/ThemeCustomizer";
import { DashboardShell } from "../components/organisms/DashboardShell";
import { useAuth } from "../context/AuthContext";

export function SettingsPage() {
  const { isAdmin } = useAuth();

  return (
    <DashboardShell activeView="settings" title="Pengaturan">
      <section className="settings-page">
        <div className="form-hero">
          <h2>Pengaturan aplikasi</h2>
          <p>
            {isAdmin
              ? "Atur warna tema dashboard. Semua perubahan sementara disimpan lokal."
              : "Atur warna tampilan dashboard sesuai preferensi Anda."}
          </p>
        </div>
        <ThemeCustomizer scope="colors" />
      </section>
    </DashboardShell>
  );
}
