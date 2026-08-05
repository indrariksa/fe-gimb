import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/atoms/Button";
import { Icon } from "../components/atoms/Icon";
import { LoadingState } from "../components/atoms/LoadingState";
import { DashboardShell } from "../components/organisms/DashboardShell";
import * as businessApi from "../services/api/businesses";
import * as adminApi from "../services/api/admin";
import type { Business, InventorySubmission } from "../services/api/types";
import { useAuth } from "../context/AuthContext";
import { formatJakartaDate } from "../utils/dateTime";
import { clampPercent, formatScore } from "../utils/number";

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
  const { isAdmin } = useAuth();
  const { businessId = "" } = useParams();
  const [business, setBusiness] = useState<Business | null>(null);
  const [submission, setSubmission] = useState<InventorySubmission | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadScore() {
      setIsLoading(true);
      setError("");
      try {
        const getBusiness = isAdmin ? adminApi.adminBusiness : businessApi.getBusiness;
        const getLatestInventory = isAdmin ? adminApi.adminLatestBusinessInventory : businessApi.latestBusinessInventory;
        const [businessDetail, latestSubmission] = await Promise.all([
          getBusiness(businessId),
          getLatestInventory(businessId),
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
  }, [businessId, isAdmin, reloadKey]);

  const score = submission?.analysis.overall_score ?? 0;
  const progress = clampPercent(score);
  const scoreText = formatScore(score);
  const status = submission?.analysis.status ?? "Belum Ada Data";
  const insights = submission ? getScoreInsights(submission) : { strongest: "-", priority: "-" };

  return (
    <DashboardShell activeView="score" title="Hasil Skor">
      <section className="score-result-page">
        {isLoading && <LoadingState>Memuat hasil diagnosis...</LoadingState>}
        {error && (
          <article className="panel empty-state retry-state">
            <span>{error}</span>
            <Button className="btn--dashboard-hover" onClick={() => setReloadKey((current) => current + 1)}>
              Coba lagi <Icon name="refresh" size={18} />
            </Button>
          </article>
        )}

        {!isLoading && !error && submission && (
          <>
            <div className="score-result-hero">
              <div className="score-orb score-orb--one" />
              <div className="score-orb score-orb--two" />
              <div className="score-gridlines" />

              <div className="score-result-copy">
                <span>Diagnosis selesai</span>
                <h2>Skor kesehatan bisnis {business?.name ?? submission.business_name} sudah siap.</h2>
                <p>Berikut ringkasan performa bisnis berdasarkan inventarisasi terakhir pada {formatJakartaDate(submission.created_at)}.</p>
              </div>

              <div className="score-result-ring-wrap">
                <div className="score-result-ring" style={{ "--score-progress": `${progress}%` } as CSSProperties}>
                  <strong>{scoreText}</strong>
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
                <Button className="btn--shiny-dashboard" onClick={() => navigate(`/businesses/${businessId}/sub-scores`)}>
                  Lihat Sub Skor <Icon name="arrow" size={18} />
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
    </DashboardShell>
  );
}
