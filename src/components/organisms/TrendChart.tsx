import { trend } from "../../data/dashboardData";

export function TrendChart() {
  const points = trend
    .map((item, index) => {
      const x = 8 + index * 17;
      const y = 78 - item.value;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <section className="panel trend-card">
      <div className="panel__header">
        <div>
          <h2>Tren Skor Kesehatan</h2>
          <p>Visualisasi perkembangan 6 bulan terakhir</p>
        </div>
        <div className="segmented"><span>1B</span><span>3B</span><strong>6B</strong></div>
      </div>
      <svg viewBox="0 0 100 64" preserveAspectRatio="none" className="trend-svg" aria-hidden="true">
        {[12, 24, 36, 48].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} />)}
        <polyline points={points} />
        {trend.map((item, index) => (
          <circle key={item.month} cx={8 + index * 17} cy={78 - item.value} r={index === trend.length - 1 ? 1.9 : 1.2} />
        ))}
      </svg>
      <div className="trend-months">{trend.map((item) => <span key={item.month}>{item.month}</span>)}</div>
    </section>
  );
}
