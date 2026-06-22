import { ThemeCustomizer } from "../components/molecules/ThemeCustomizer";
import { DashboardShell } from "../components/organisms/DashboardShell";

export function SettingsPage() {
  return (
    <DashboardShell activeView="settings" title="Pengaturan">
      <section className="settings-page">
        <div className="form-hero">
          <h2>Pengaturan aplikasi</h2>
          <p>Atur identitas aplikasi, informasi toko, dan warna tema. Semua perubahan sementara disimpan lokal.</p>
        </div>
        <ThemeCustomizer />
      </section>
    </DashboardShell>
  );
}
