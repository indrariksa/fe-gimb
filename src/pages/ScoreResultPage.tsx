import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/atoms/Button";
import { Icon } from "../components/atoms/Icon";
import { DashboardShell } from "../components/organisms/DashboardShell";
import * as businessApi from "../services/api/businesses";
import type { Business, InventorySubmission } from "../services/api/types";

function formatDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, score));
}

function getScoreInsights(submission: InventorySubmission) {
  const scores = submission.analysis.sub_scores;
  const dimensions = [
    { label: "Profitabilitas", score: scores.profitability },
    { label: "Cashflow", score: scores.cashflow },
    { label: "Marketing", score: scores.marketing },
    { label: "Retensi", score: scores.retention },
    { label: "Operasional", score: scores.operational },
    { label: "SDM", score: scores.hr },
  ];

  const strongest = [...dimensions].sort((a, b) => b.score - a.score)[0]?.label ?? "-";
  const priority = [...dimensions].sort((a, b) => a.score - b.score)[0]?.label ?? "-";
  return { strongest, priority };
}

export function ScoreResultPage() {
  const navigate = useNavigate();
  const { businessId = "" } = useParams();
  const [business, setBusiness] = useState<Business | null>(null);
  const [submission, setSubmission] = useState<InventorySubmission | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadScore() {
      setIsLoading(true);
      setError("");
      try {
        const [businessDetail, latestSubmission] = await Promise.all([
          businessApi.getBusiness(businessId),
          businessApi.latestBusinessInventory(businessId),
        ]);
        if (isMounted) {
          setBusiness(businessDetail);
          setSubmission(latestSubmission);
        }
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : "Gagal memuat hasil skor");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    if (businessId) loadScore();
    return () => {
      isMounted = false;
    };
  }, [businessId]);

  const score = submission?.analysis.overall_score ?? 0;
  const progress = clampScore(score);
  const status = submission?.analysis.status ?? "Belum Ada Data";
  const insights = submission ? getScoreInsights(submission) : { strongest: "-", priority: "-" };

  return (
    <DashboardShell activeView="score" title="Hasil Skor">
      <section className="score-result-page">
        {isLoading && <article className="panel empty-state">Memuat hasil diagnosis...</article>}
        {error && <article className="panel empty-state">{error}</article>}

        {!isLoading && !error && submission && (
          <>
            <div className="score-result-hero">
              <div className="score-orb score-orb--one" />
              <div className="score-orb score-orb--two" />
              <div className="score-gridlines" />

              <div className="score-result-copy">
                <span>Diagnosis selesai</span>
                <h2>Skor kesehatan bisnis {business?.name ?? submission.business_name} sudah siap.</h2>
                <p>Berikut ringkasan performa bisnis berdasarkan inventarisasi terakhir pada {formatDate(submission.created_at)}.</p>
              </div>

              <div className="score-result-ring-wrap">
                <div className="score-result-ring" style={{ "--score-progress": `${progress}%` } as CSSProperties}>
                  <strong>{score}</strong>
                  <span>{status}</span>
                </div>
                <div className="score-result-pulse" />
              </div>
            </div>

            <div className="score-result-panel panel">
              <div className="score-result-panel__message">
                <Icon name="bulb" />
                <p>
                  Bisnis berada di zona <strong>{status}</strong>. Pertahankan dimensi terbaik dan pantau area prioritas agar performa tetap stabil pada periode berikutnya.
                </p>
              </div>
              <div className="score-result-stats">
                <article><span>Dimensi Terkuat</span><strong>{insights.strongest}</strong></article>
                <article><span>Area Prioritas</span><strong>{insights.priority}</strong></article>
                <article><span>Target Berikutnya</span><strong>Pertahankan 90+</strong></article>
              </div>
              <div className="score-result-actions">
                <Button onClick={() => navigate(`/businesses/${businessId}/sub-scores`)}>
                  Lihat Sub Skor <Icon name="arrow" size={18} />
                </Button>
                <Button variant="secondary" onClick={() => navigate(`/businesses/${businessId}/dashboard`)}>
                  Buka Dashboard
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
    </DashboardShell>
  );
}
