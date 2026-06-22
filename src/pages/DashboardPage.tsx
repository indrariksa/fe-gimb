import { Button } from "../components/atoms/Button";
import { Icon } from "../components/atoms/Icon";
import { ScoreCard } from "../components/molecules/ScoreCard";
import { RadarProfile } from "../components/organisms/RadarProfile";
import { TrendChart } from "../components/organisms/TrendChart";
import { DashboardShell } from "../components/organisms/DashboardShell";
import { scoreCards } from "../data/dashboardData";
import { useThemeSettings } from "../theme/ThemeContext";

export function DashboardPage() {
  const { theme } = useThemeSettings();

  return (
    <DashboardShell activeView="dashboard">
      <section className="dashboard">
        <div className="dashboard__intro">
          <div>
            <h2>Selamat Siang, {theme.ownerName}</h2>
            <p>{theme.businessName} - Diagnosa terakhir: 26 Mei 2026</p>
          </div>
          <div className="dashboard__actions">
            <Button variant="secondary">Sub Skor</Button>
            <Button>Rekomendasi <Icon name="arrow" size={18} /></Button>
            <Button variant="dark"><Icon name="download" size={18} /> Excel</Button>
            <Button variant="dark"><Icon name="file" size={18} /> PDF</Button>
          </div>
        </div>

        <div className="dashboard-grid">
          <section className="health-card panel">
            <p>Skor Kesehatan Keseluruhan</p>
            <div className="health-ring"><strong>42</strong><span>Cukup Sehat</span></div>
            <div className="health-scale"><span>Buruk</span><b>Cukup</b><span>Sehat</span></div>
            <p>Skor <strong>42</strong> berada di kisaran 40-64. Terdapat beberapa titik kritis yang memerlukan perhatian strategis.</p>
          </section>
          <div className="score-grid">
            {scoreCards.map((card) => (
              <ScoreCard key={card.label} {...card} />
            ))}
          </div>
          <TrendChart />
          <RadarProfile />
          <div className="insight-grid">
            <article className="insight-card insight-card--dark">
              <span><Icon name="alert" /></span>
              <h3>Prioritas Perbaikan</h3>
              <p>Cashflow memerlukan perhatian segera. Skor <strong>42</strong> berada di zona risiko yang perlu ditangani melalui efisiensi operasional.</p>
              <button>Detail Masalah <Icon name="arrow" size={18} /></button>
            </article>
            <article className="insight-card">
              <span><Icon name="chart" /></span>
              <h3>Kekuatan Utama</h3>
              <p>Retensi pelanggan <strong>(72)</strong> dan marketing <strong>(65)</strong> adalah pilar terkuat stabilitas bisnis saat ini.</p>
              <button>Analisis Data <Icon name="arrow" size={18} /></button>
            </article>
            <article className="insight-card insight-card--warm">
              <span><Icon name="bulb" /></span>
              <h3>Rekomendasi Kunci</h3>
              <p><strong>6 rekomendasi</strong> strategis tersedia untuk meningkatkan skor ke target <strong>65+</strong> dalam 6 bulan ke depan.</p>
              <button>Lihat Strategi <Icon name="arrow" size={18} /></button>
            </article>
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}
