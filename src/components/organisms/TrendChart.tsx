import { Icon } from "../atoms/Icon";

type ActionPlanProps = {
  priorityIssues: string[];
  recommendations: string[];
};

const fallbackSteps = [
  "Rapikan arus kas dan pisahkan biaya operasional utama.",
  "Perkuat penjualan dari pelanggan yang sudah pernah membeli.",
  "Evaluasi biaya promosi agar setiap rupiah menghasilkan transaksi.",
];

function buildSteps(priorityIssues: string[], recommendations: string[]) {
  const merged = [...(priorityIssues ?? []), ...(recommendations ?? [])].filter(Boolean);
  return (merged.length ? merged : fallbackSteps).slice(0, 3);
}

export function TrendChart({ priorityIssues, recommendations }: ActionPlanProps) {
  const steps = buildSteps(priorityIssues, recommendations);
  const labels = ["Minggu 1", "Minggu 2", "Minggu 3-4"];
  return (
    <section className="panel trend-card action-plan-card">
      <div className="panel__header">
        <div>
          <h2>Action Plan 30 Hari</h2>
          <p>Langkah prioritas yang bisa langsung dikerjakan dari hasil diagnosis.</p>
        </div>
        <span className="action-plan-card__badge">3 Fokus</span>
      </div>
      <div className="action-plan">
        {steps.map((step, index) => (
          <article key={`${labels[index]}-${step}`}>
            <span>{index + 1}</span>
            <div>
              <small>{labels[index]}</small>
              <p>{step}</p>
            </div>
            <Icon name="arrow" size={18} />
          </article>
        ))}
      </div>
    </section>
  );
}
