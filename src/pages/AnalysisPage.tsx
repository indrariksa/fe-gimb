import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/atoms/Button";
import { Icon } from "../components/atoms/Icon";

const steps = [
  { label: "Mengumpulkan Data", start: 0 },
  { label: "Menganalisis Permasalahan", start: 25 },
  { label: "Menghitung Skor", start: 50 },
  { label: "Menyiapkan Dashboard", start: 75 },
];

export function AnalysisPage() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 5200;
    const startedAt = performance.now();

    const frame = window.setInterval(() => {
      const elapsed = performance.now() - startedAt;
      const nextProgress = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(nextProgress);

      if (nextProgress >= 100) {
        window.clearInterval(frame);
      }
    }, 80);

    return () => window.clearInterval(frame);
  }, []);

  const activeStepIndex = useMemo(() => {
    return steps.reduce((currentIndex, step, index) => progress >= step.start ? index : currentIndex, 0);
  }, [progress]);

  return (
    <main className="analysis-page">
      <div className="analysis-orbits" aria-hidden="true" />

      <aside className="analysis-float analysis-float--left">
        <span>Data Processing</span>
        <div className="analysis-bars">
          {Array.from({ length: 6 }).map((_, index) => <i key={index} />)}
        </div>
      </aside>

      <aside className="analysis-float analysis-float--right">
        <span>AI Confidence</span>
        <div className="confidence-bars">
          {Array.from({ length: 6 }).map((_, index) => <i key={index} className={index < Math.ceil(progress / 20) ? "active" : ""} />)}
        </div>
      </aside>

      <aside className="analysis-float analysis-float--score">
        <span>Score Analysis</span>
        <strong>{progress}%</strong>
      </aside>

      <section className="analysis-card">
        <div className="analysis-ring" style={{ "--analysis-progress": `${progress}%` } as CSSProperties}>
          <strong>{progress}%</strong>
          <span>{progress === 100 ? "Selesai" : "Selesai"}</span>
        </div>

        <h1>{progress === 100 ? "Analisis Data Selesai" : "Sedang Menganalisis Data Bisnis Anda"}</h1>
        <p>
          {progress === 100
            ? "Diagnosis awal sudah siap. Buka dashboard untuk melihat skor kesehatan bisnis dan prioritas perbaikan."
            : "Sistem AI kami sedang memproses informasi bisnis untuk menghasilkan diagnosis yang akurat dan personal."}
        </p>

        <div className="analysis-steps">
          {steps.map((step, index) => {
            const isDone = progress >= (steps[index + 1]?.start ?? 100);
            const isCurrent = !isDone && index === activeStepIndex;
            const rowProgress = isDone ? 100 : isCurrent ? Math.min(100, ((progress - step.start) / 25) * 100) : 0;

            return (
              <article key={step.label} className={`analysis-step ${isDone ? "done" : ""} ${isCurrent ? "current" : ""}`}>
                <span className="analysis-step__icon">{isDone ? "✓" : isCurrent ? "•" : ""}</span>
                <strong>{step.label}</strong>
                {isCurrent && <em><i /><i /><i /></em>}
                <b style={{ width: `${rowProgress}%` }} />
              </article>
            );
          })}
        </div>

        {progress === 100 && (
          <Button className="analysis-cta" onClick={() => navigate("/dashboard")}>
            Masuk ke Dashboard <Icon name="arrow" size={18} />
          </Button>
        )}
      </section>
    </main>
  );
}
