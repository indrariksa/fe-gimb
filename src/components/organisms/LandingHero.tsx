import { useNavigate } from "react-router-dom";
import { Button } from "../atoms/Button";
import { Icon } from "../atoms/Icon";
import { Brand } from "../molecules/Brand";
import { PublicThemeToggle } from "../molecules/PublicThemeToggle";
import { useThemeSettings } from "../../theme/ThemeContext";

export function LandingHero() {
  const { theme } = useThemeSettings();
  const navigate = useNavigate();

  return (
    <section className="landing">
      <header className="landing__nav">
        <Brand name="SBD" compact />
        <nav>
          <a href="#beranda">Beranda</a>
          <a href="#tentang">Tentang</a>
          <a href="#fitur">Fitur</a>
          <button onClick={() => navigate("/dashboard")}>Dashboard</button>
        </nav>
        <div className="landing__nav-actions">
          <PublicThemeToggle />
          <Button variant="dark" onClick={() => navigate("/dashboard")}>Login</Button>
        </div>
      </header>

      <div className="landing__content" id="beranda">
        <div className="landing__copy">
          <span className="eyebrow"><i /> Platform Analitik Bisnis #1 untuk UMKM Indonesia</span>
          <p className="product-kicker"><span><Icon name="chart" /></span> Smart Business Dashboard</p>
          <h1>Diagnosa Kesehatan <strong>Bisnis</strong> untuk <em>UMKM</em> Indonesia</h1>
          <p className="lead">
            Sistem diagnostik berbasis data yang membantu mengidentifikasi masalah bisnis, mengukur performa secara objektif, dan memberi rekomendasi prioritas yang tepat sasaran.
          </p>
          <div className="landing__actions">
            <Button onClick={() => navigate("/inventory")}>Mulai Diagnosa <Icon name="arrow" size={20} /></Button>
            <Button variant="secondary" onClick={() => navigate("/dashboard")}>Lihat Demo</Button>
          </div>
          <dl className="landing__stats">
            <div><dt>2,400+</dt><dd>UMKM Terdaftar</dd></div>
            <div><dt>98%</dt><dd>Akurasi Analisis</dd></div>
            <div><dt>3 Menit</dt><dd>Waktu Diagnosa</dd></div>
          </dl>
        </div>
        <div className="hero-visual" aria-label={`Preview ${theme.appName}`}>
          <div className="hero-visual__panel">
            <span>Skor Kesehatan Bisnis</span>
            <div className="hero-score">
              <div><small>Total Skor</small><strong>42</strong><b>Cukup Sehat</b></div>
              <div className="donut">42%</div>
            </div>
            <div className="hero-mini-grid">
              {["Profit", "Cashflow", "Marketing"].map((label, index) => (
                <div key={label}>
                  <small>{label}</small>
                  <strong>{[55, 40, 65][index]}</strong>
                  <i style={{ width: `${[55, 40, 65][index]}%` }} />
                </div>
              ))}
            </div>
            <div className="hero-bars">{Array.from({ length: 6 }).map((_, index) => <i key={index} />)}</div>
          </div>
          <aside className="float-card float-card--top">Retensi <strong>+18% ↑</strong></aside>
          <aside className="float-card float-card--bottom">UMKM Terdiagnosa <strong>2,400+</strong></aside>
        </div>
      </div>
    </section>
  );
}
