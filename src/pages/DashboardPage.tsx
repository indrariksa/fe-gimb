import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/atoms/Button";
import { Icon } from "../components/atoms/Icon";
import { ScoreCard } from "../components/molecules/ScoreCard";
import { RadarProfile } from "../components/organisms/RadarProfile";
import { TrendChart } from "../components/organisms/TrendChart";
import { DashboardShell } from "../components/organisms/DashboardShell";
import { scoreCards } from "../data/dashboardData";
import * as businessApi from "../services/api/businesses";
import * as adminApi from "../services/api/admin";
import type { Business, InventorySubmission } from "../services/api/types";
import { useThemeSettings } from "../theme/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { clampPercent, formatScore } from "../utils/number";

function statusTone(score: number): "success" | "warning" | "danger" {
  if (score >= 60) return "success";
  if (score >= 40) return "warning";
  return "danger";
}

function statusLabel(score: number) {
  if (score >= 80) return "Sangat Sehat";
  if (score >= 60) return "Sehat";
  if (score >= 40) return "Cukup Sehat";
  if (score >= 20) return "Buruk";
  return "Sangat Buruk";
}

function formatDate(value?: string) {
  if (!value) return "Belum ada diagnosis";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
}

export function DashboardPage() {
  const { theme } = useThemeSettings();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { businessId = "" } = useParams();
  const [business, setBusiness] = useState<Business | null>(null);
  const [submission, setSubmission] = useState<InventorySubmission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      setError("");
      try {
        const getBusiness = isAdmin ? adminApi.adminBusiness : businessApi.getBusiness;
        const getLatestInventory = isAdmin ? adminApi.adminLatestBusinessInventory : businessApi.latestBusinessInventory;
        const businessDetail = await getBusiness(businessId);
        let latest: InventorySubmission | null = null;
        try {
          latest = await getLatestInventory(businessId);
        } catch {
          latest = null;
        }
        if (isMounted) {
          setBusiness(businessDetail);
          setSubmission(latest);
        }
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : "Gagal memuat dashboard");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    if (businessId) loadDashboard();
    return () => {
      isMounted = false;
    };
  }, [businessId, isAdmin]);

  const cards = useMemo(() => {
    if (!submission?.analysis?.sub_scores) return scoreCards;
    const scores = submission.analysis.sub_scores;
    return [
      { label: "Profitabilitas", score: scores.profitability, status: statusLabel(scores.profitability), tone: statusTone(scores.profitability), icon: "$" },
      { label: "Cashflow", score: scores.cashflow, status: statusLabel(scores.cashflow), tone: statusTone(scores.cashflow), icon: "↯" },
      { label: "Marketing", score: scores.marketing, status: statusLabel(scores.marketing), tone: statusTone(scores.marketing), icon: "↗" },
      { label: "Retensi Pelanggan", score: scores.retention, status: statusLabel(scores.retention), tone: statusTone(scores.retention), icon: "☷" },
      { label: "Operasional", score: scores.operational, status: statusLabel(scores.operational), tone: statusTone(scores.operational), icon: "▣" },
      { label: "SDM", score: scores.hr, status: statusLabel(scores.hr), tone: statusTone(scores.hr), icon: "♙" },
    ];
  }, [submission]);

  const overallScore = submission?.analysis.overall_score ?? 0;
  const overallProgress = clampPercent(overallScore);
  const overallScoreText = formatScore(overallScore);
  const overallStatus = submission?.analysis.status ?? "Belum Ada Data";
  const primaryIssue = submission?.analysis.priority_issues?.[0] ?? "Belum ada prioritas perbaikan. Isi inventarisasi agar sistem dapat membaca area kritis bisnis.";
  const strength = submission?.analysis.strengths?.[0] ?? "Kekuatan utama akan muncul setelah data inventarisasi pertama selesai dianalisis.";
  const recommendation = submission?.analysis.recommendations?.[0] ?? "Rekomendasi strategis akan tersedia setelah proses diagnosis selesai.";

  return (
    <DashboardShell activeView="dashboard">
      <section className="dashboard">
        <div className="dashboard__intro">
          <div>
            <h2>Selamat Siang, {theme.ownerName}</h2>
            <p>{business?.name ?? theme.businessName} - Diagnosa terakhir: {formatDate(submission?.created_at)}</p>
          </div>
          <div className="dashboard__actions">
            <Button className="btn--shiny-dashboard" variant="secondary" onClick={() => navigate(`/businesses/${businessId}/sub-scores`)}>Sub Skor</Button>
            <Button className="btn--dashboard-hover">Rekomendasi <Icon name="arrow" size={18} /></Button>
            <Button className="btn--dashboard-hover btn--dashboard-export" variant="dark"><Icon name="download" size={18} /> Excel</Button>
            <Button className="btn--dashboard-hover btn--dashboard-export" variant="dark"><Icon name="file" size={18} /> PDF</Button>
          </div>
        </div>

        {isLoading && <article className="panel empty-state">Memuat dashboard bisnis...</article>}
        {error && <article className="panel empty-state">{error}</article>}
        {!isLoading && !error && !submission && (
          <article className="panel dashboard-empty">
            <span><Icon name="alert" /></span>
            <h3>Belum ada hasil diagnosis</h3>
            <p>Masukkan data inventarisasi pertama untuk menghitung skor kesehatan bisnis {business?.name ?? "toko ini"}.</p>
            <Button onClick={() => navigate(`/businesses/${businessId}/inventory/new`)}>Mulai Inventarisasi <Icon name="arrow" size={18} /></Button>
          </article>
        )}

        {!isLoading && !error && submission && (
        <div className="dashboard-grid">
          <section className="health-card panel">
            <p>Skor Kesehatan Keseluruhan</p>
            <div className="health-ring" style={{ "--health-progress": `${overallProgress}%` } as CSSProperties}>
              <strong>{overallScoreText}</strong>
              <span>{overallStatus}</span>
            </div>
            <p>Skor <strong>{overallScoreText}</strong> menunjukkan bisnis berada pada kategori <strong>{overallStatus}</strong> berdasarkan data terakhir.</p>
          </section>
          <div className="score-grid">
            {cards.map((card) => (
              <ScoreCard key={card.label} {...card} />
            ))}
          </div>
          <TrendChart priorityIssues={submission.analysis.priority_issues} recommendations={submission.analysis.recommendations} />
          <RadarProfile submission={submission} />
          <div className="insight-grid">
            <article className="insight-card insight-card--dark">
              <span><Icon name="alert" /></span>
              <h3>Prioritas Perbaikan</h3>
              <p>{primaryIssue}</p>
              <button>Detail Masalah <Icon name="arrow" size={18} /></button>
            </article>
            <article className="insight-card">
              <span><Icon name="chart" /></span>
              <h3>Kekuatan Utama</h3>
              <p>{strength}</p>
              <button>Analisis Data <Icon name="arrow" size={18} /></button>
            </article>
            <article className="insight-card insight-card--warm">
              <span><Icon name="bulb" /></span>
              <h3>Rekomendasi Kunci</h3>
              <p>{recommendation}</p>
              <button>Lihat Strategi <Icon name="arrow" size={18} /></button>
            </article>
          </div>
        </div>
        )}
      </section>
    </DashboardShell>
  );
}
