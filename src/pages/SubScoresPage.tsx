import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useParams } from "react-router-dom";
import { Button } from "../components/atoms/Button";
import { Icon } from "../components/atoms/Icon";
import { DashboardShell } from "../components/organisms/DashboardShell";
import * as businessApi from "../services/api/businesses";
import type { Business, InventorySubmission } from "../services/api/types";
import { clampPercent, formatScore } from "../utils/number";

type SubScoreItem = {
  key: string;
  label: string;
  shortLabel: string;
  score: number;
  description: string;
  color: string;
  icon: string;
};

function statusShort(score: number) {
  if (score >= 80) return "Sangat Sehat";
  if (score >= 60) return "Sehat";
  if (score >= 40) return "Cukup";
  if (score >= 20) return "Buruk";
  return "Sangat Buruk";
}

function statusClass(score: number) {
  if (score >= 80) return "excellent";
  if (score >= 60) return "success";
  if (score >= 40) return "warning";
  if (score >= 20) return "danger";
  return "danger";
}

function radarPoint(index: number, score: number) {
  const center = 115;
  const maxRadius = 82;
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / 6;
  const radius = (clampPercent(score) / 100) * maxRadius;
  return `${center + Math.cos(angle) * radius},${center + Math.sin(angle) * radius}`;
}

function axisPoint(index: number, radius: number) {
  const center = 115;
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / 6;
  return `${center + Math.cos(angle) * radius},${center + Math.sin(angle) * radius}`;
}

export function SubScoresPage() {
  const { businessId = "" } = useParams();
  const [business, setBusiness] = useState<Business | null>(null);
  const [submission, setSubmission] = useState<InventorySubmission | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadSubScores() {
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
        if (isMounted) setError(err instanceof Error ? err.message : "Gagal memuat sub skor");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    if (businessId) loadSubScores();
    return () => {
      isMounted = false;
    };
  }, [businessId]);

  const items = useMemo<SubScoreItem[]>(() => {
    const scores = submission?.analysis.sub_scores;
    return [
      { key: "profitability", label: "Skor Profitabilitas", shortLabel: "Profitabilitas", score: scores?.profitability ?? 0, description: "Kemampuan bisnis menghasilkan laba dari operasional.", color: "#3b82f6", icon: "$" },
      { key: "cashflow", label: "Skor Kesehatan Cashflow", shortLabel: "Cashflow", score: scores?.cashflow ?? 0, description: "Keseimbangan arus kas masuk dan keluar bisnis.", color: "#ef4444", icon: "↯" },
      { key: "marketing", label: "Skor Efisiensi Marketing", shortLabel: "Marketing", score: scores?.marketing ?? 0, description: "Efektivitas pemasaran dalam menarik pelanggan baru.", color: "#10b981", icon: "↗" },
      { key: "retention", label: "Skor Retensi Customer", shortLabel: "Retensi", score: scores?.retention ?? 0, description: "Kemampuan mempertahankan dan meningkatkan loyalitas pelanggan.", color: "#8b5cf6", icon: "☷" },
      { key: "operational", label: "Skor Efisiensi Operasional", shortLabel: "Operasional", score: scores?.operational ?? 0, description: "Optimalisasi proses dan sumber daya operasional bisnis.", color: "#d97706", icon: "▣" },
      { key: "hr", label: "Skor Pengelolaan SDM", shortLabel: "SDM", score: scores?.hr ?? 0, description: "Kualitas manajemen dan produktivitas sumber daya manusia.", color: "#ec4899", icon: "♙" },
    ];
  }, [submission]);

  const radarPoints = items.map((item, index) => radarPoint(index, item.score)).join(" ");

  return (
    <DashboardShell activeView="subscores" title="Dashboard 6 Sub Skor Bisnis">
      <section className="subscores-page">
        {isLoading && <article className="panel empty-state">Memuat sub skor...</article>}
        {error && <article className="panel empty-state">{error}</article>}

        {!isLoading && !error && submission && (
          <>
            <div className="subscores-hero">
              <div>
                <span>Sub Dimensi</span>
                <h2>{business?.name ?? submission.business_name}</h2>
                <p>Enam dimensi utama dari hasil analisis inventarisasi terbaru.</p>
              </div>
              <div className="subscores-actions">
                <Button variant="secondary"><Icon name="download" size={18} /> PDF</Button>
                <Button><Icon name="download" size={18} /> Excel</Button>
              </div>
            </div>

            <div className="subscore-card-grid">
              {items.map((item) => (
                <article className={`subscore-card subscore-card--${statusClass(item.score)}`} key={item.key} style={{ "--subscore-color": item.color, "--subscore-width": `${clampPercent(item.score)}%` } as CSSProperties}>
                  <div className="subscore-card__top">
                    <span>{item.icon}</span>
                    <b>{statusShort(item.score)}</b>
                  </div>
                  <strong>{formatScore(item.score)}</strong>
                  <h3>{item.label}</h3>
                  <p>{item.description}</p>
                  <div className="subscore-meter"><i /></div>
                  <div className="subscore-scale"><span>0</span><span>100</span></div>
                </article>
              ))}
            </div>

            <div className="subscore-visual-grid">
              <section className="panel subscore-radar">
                <h3>Radar Performa Bisnis</h3>
                <p>Distribusi 6 dimensi bisnis</p>
                <svg viewBox="0 0 230 230" aria-label="Radar performa bisnis">
                  {[82, 55, 28].map((radius) => (
                    <polygon key={radius} points={items.map((_, index) => axisPoint(index, radius)).join(" ")} />
                  ))}
                  {items.map((_, index) => (
                    <line key={index} x1="115" y1="115" x2={axisPoint(index, 82).split(",")[0]} y2={axisPoint(index, 82).split(",")[1]} />
                  ))}
                  <polygon className="subscore-radar__area" points={radarPoints} />
                  {items.map((item, index) => {
                    const [x, y] = radarPoint(index, item.score).split(",");
                    const [tx, ty] = axisPoint(index, 102).split(",");
                    const tooltipX = index === 0 ? Number(x) + 16 : Number(x) - 24;
                    const tooltipY = index === 0 ? Number(y) - 20 : Number(y) - 40;
                    return (
                      <g className="subscore-radar__point" key={item.key}>
                        <circle cx={x} cy={y} r="5" />
                        <circle className="subscore-radar__hit" cx={x} cy={y} r="15" />
                        <title>{item.shortLabel}: {formatScore(item.score)}</title>
                        <text x={tx} y={ty}>{item.shortLabel}</text>
                        <foreignObject x={tooltipX} y={tooltipY} width="48" height="28">
                          <div className="subscore-tooltip">{formatScore(item.score)}</div>
                        </foreignObject>
                      </g>
                    );
                  })}
                </svg>
              </section>

              <section className="panel subscore-bars">
                <h3>Perbandingan Skor Sub Dimensi</h3>
                <p>Skor saat ini dibanding target ideal 80</p>
                <div className="subscore-chart">
                  <div className="subscore-chart__axis" aria-hidden="true">
                    {[100, 75, 50, 25, 0].map((value) => <span key={value}>{value}</span>)}
                  </div>
                  {items.map((item) => (
                    <div className="subscore-chart__bar" key={item.key} style={{ "--bar-height": `${clampPercent(item.score)}%`, "--bar-color": item.color } as CSSProperties}>
                      <b>{formatScore(item.score)}</b>
                      <i />
                      <span>{item.shortLabel}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <section className="panel score-legend">
              <h3>Interpretasi & Skala Skor</h3>
              <div>
                <article className="critical"><strong>Skor 0 - 19 - Sangat Buruk</strong><p>Kondisi bisnis sangat kritis dan membutuhkan tindakan pemulihan segera.</p></article>
                <article className="danger"><strong>Skor 20 - 39 - Buruk</strong><p>Kondisi bisnis berisiko tinggi dan perlu tindakan cepat.</p></article>
                <article className="warning"><strong>Skor 40 - 59 - Cukup Sehat</strong><p>Bisnis masih berjalan, tetapi ada area penting yang harus diperbaiki.</p></article>
                <article className="success"><strong>Skor 60 - 79 - Sehat</strong><p>Bisnis relatif stabil dengan beberapa peluang optimasi.</p></article>
                <article className="excellent"><strong>Skor 80 - 100 - Sangat Sehat</strong><p>Bisnis berada dalam kondisi kuat dan siap dikembangkan.</p></article>
              </div>
            </section>
          </>
        )}
      </section>
    </DashboardShell>
  );
}
