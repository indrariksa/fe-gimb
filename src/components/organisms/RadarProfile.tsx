import type { HealthMetrics, InventorySubmission } from "../../services/api/types";
import { Icon } from "../atoms/Icon";

type RadarProfileProps = {
  submission: InventorySubmission;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
    notation: Math.abs(value) >= 1_000_000_000 ? "compact" : "standard",
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(Math.round(value));
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value * 100)}%`;
}

function snapshotItems(submission: InventorySubmission, metrics: HealthMetrics) {
  return [
    { label: "Omzet 6 bulan", value: formatCurrency(submission.six_month_revenue), icon: "$" },
    { label: "Estimasi laba bersih", value: formatCurrency(metrics.net_profit), icon: "↗" },
    { label: "Total transaksi", value: formatNumber(submission.six_month_transactions), icon: "☷" },
    { label: "Rata-rata transaksi", value: formatCurrency(metrics.average_transaction_value), icon: "▣" },
    { label: "Repeat ratio", value: formatPercent(metrics.repeat_to_new_ratio), icon: "↯" },
  ];
}

export function RadarProfile({ submission }: RadarProfileProps) {
  const metrics = submission.analysis.metrics;
  const items = snapshotItems(submission, metrics);

  return (
    <section className="panel radar-card snapshot-card">
      <div>
        <span className="snapshot-card__icon"><Icon name="chart" /></span>
        <h2>Business Snapshot</h2>
        <p>Ringkasan angka utama dari data inventarisasi terakhir.</p>
      </div>
      <div className="snapshot-list">
        {items.map((item) => (
          <article key={item.label}>
            <span>{item.icon}</span>
            <div>
              <small>{item.label}</small>
              <strong>{item.value}</strong>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
