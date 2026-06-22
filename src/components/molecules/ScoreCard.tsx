type ScoreCardProps = {
  label: string;
  score: number;
  status: string;
  tone: "success" | "warning" | "danger";
  icon: string;
};

export function ScoreCard({ label, score, status, tone, icon }: ScoreCardProps) {
  return (
    <article className={`score-card score-card--${tone}`}>
      <div className="score-card__top">
        <span className="score-card__icon">{icon}</span>
        <span className="pill">{status}</span>
      </div>
      <strong>{score}</strong>
      <span>{label}</span>
      <div className="meter">
        <i style={{ width: `${score}%` }} />
      </div>
    </article>
  );
}
