import { Icon } from "../atoms/Icon";
import type { BusinessActionPlan } from "../../services/api/types";

type ActionPlanProps = {
  priorityIssues: string[];
  recommendations: string[];
  actionPlan?: BusinessActionPlan[];
};

const fallbackSteps = [
  "Rapikan arus kas dan pisahkan biaya operasional utama.",
  "Perkuat penjualan dari pelanggan yang sudah pernah membeli.",
  "Evaluasi biaya promosi agar setiap rupiah menghasilkan transaksi.",
];

function buildSteps(priorityIssues: string[], recommendations: string[], actionPlan?: BusinessActionPlan[]) {
  if (actionPlan?.length) {
    return actionPlan.slice(0, 3);
  }
  const merged = [...(priorityIssues ?? []), ...(recommendations ?? [])].filter(Boolean);
  return (merged.length ? merged : fallbackSteps).slice(0, 3).map((description, index) => ({
    period: ["Minggu 1", "Minggu 2", "Minggu 3-4"][index],
    title: `Fokus ${index + 1}`,
    description,
  }));
}

export function TrendChart({ priorityIssues, recommendations, actionPlan }: ActionPlanProps) {
  const steps = buildSteps(priorityIssues, recommendations, actionPlan);
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
          <article key={`${step.period}-${step.title}-${index}`}>
            <span>{index + 1}</span>
            <div>
              <small>{step.period}</small>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
            <Icon name="arrow" size={18} />
          </article>
        ))}
      </div>
    </section>
  );
}
