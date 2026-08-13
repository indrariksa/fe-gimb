import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "../components/atoms/Button";
import { Icon } from "../components/atoms/Icon";
import { LoadingState } from "../components/atoms/LoadingState";
import { ConfirmDialog } from "../components/molecules/ConfirmDialog";
import { DashboardShell } from "../components/organisms/DashboardShell";
import { AIReportChart, statusLabel } from "../components/organisms/AIReportChart";
import { FinancialAnalysisTiles } from "../components/organisms/FinancialAnalysisTiles";
import * as businessApi from "../services/api/businesses";
import * as adminApi from "../services/api/admin";
import type { AIReport } from "../services/api/types";
import { useAuth } from "../context/AuthContext";
import { ApiError, getFriendlyApiError } from "../services/api/client";
import { formatJakartaDateTime } from "../utils/dateTime";
import { downloadPdfReport, downloadWorkbook, formatRupiah, reportFilename } from "../utils/exportReport";
import { formatScore } from "../utils/number";

const pollIntervalMs = 5000;

// Same glyphs as the dimension cards on the Sub Skor page, so the two views read as one system.
const dimensionIcon: Record<string, string> = {
  profitability: "$",
  cashflow: "↯",
  marketing: "↗",
  retention: "☷",
  operational: "▣",
  hr: "♙",
};

// One shared color scale by health status (not by dimension), so a user can tell at a glance
// which dimension is weak just from color: red = worst, blue = best.
function statusColor(score: number) {
  if (score >= 80) return "#3b82f6"; // Sangat Sehat
  if (score >= 60) return "#14b8a6"; // Sehat
  if (score >= 40) return "#eab308"; // Perlu Perbaikan
  if (score >= 20) return "#f97316"; // Berisiko Tinggi
  return "#ef4444"; // Kritis
}

function riskLevelClass(level: string) {
  return level.toLowerCase();
}

export function AIReportPage() {
  const { businessId = "" } = useParams();
  const { isAdmin } = useAuth();
  const [report, setReport] = useState<AIReport | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [notGenerated, setNotGenerated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportError, setExportError] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const pollTimer = useRef(0);

  const load = useCallback(async () => {
    const getReport = isAdmin ? adminApi.adminBusinessAIReport : businessApi.getBusinessAIReport;
    const getBusiness = isAdmin ? adminApi.adminBusiness : businessApi.getBusiness;
    try {
      const [data, business] = await Promise.all([getReport(businessId), getBusiness(businessId)]);
      setReport(data);
      setBusinessName(business.name);
      setIndustry(business.industry);
      setNotGenerated(false);
      setError("");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setReport(null);
        setNotGenerated(true);
        setError("");
      } else {
        setError(getFriendlyApiError(err, "Gagal memuat laporan kesehatan bisnis"));
      }
    } finally {
      setIsLoading(false);
    }
  }, [businessId, isAdmin]);

  useEffect(() => {
    if (!businessId) return;
    setIsLoading(true);
    load();
  }, [businessId, load]);

  useEffect(() => {
    window.clearTimeout(pollTimer.current);
    if (report?.status === "processing") {
      pollTimer.current = window.setTimeout(load, pollIntervalMs);
    }
    return () => window.clearTimeout(pollTimer.current);
  }, [report, load]);

  const confirmGenerate = async () => {
    setIsRegenerating(true);
    try {
      const generate = isAdmin ? adminApi.adminRegenerateBusinessAIReport : businessApi.regenerateBusinessAIReport;
      const data = await generate(businessId);
      setReport(data);
      setNotGenerated(false);
      setError("");
    } catch (err) {
      setError(getFriendlyApiError(err, "Gagal memulai laporan kesehatan bisnis"));
    } finally {
      setIsRegenerating(false);
      setIsConfirmOpen(false);
    }
  };

  const content = report?.report;

  const exportPdf = async () => {
    if (!content) return;
    setExportError("");
    try {
      await downloadPdfReport({
        filename: reportFilename("business-health-report", businessId, "pdf"),
        title: "Laporan Kesehatan Bisnis",
        subtitle: content.meta.disclaimer,
        summary: [
          ["Ringkasan Eksekutif", content.executive_summary],
          ["Tingkat Risiko", content.risk_assessment.level],
          ["Versi Scoring", content.meta.scoring_version],
          ["Dibuat", formatJakartaDateTime(content.meta.generated_at)],
        ],
        scores: content.sub_score_analysis.map((item) => ({ label: item.title, score: item.score })),
        sections: [
          { title: "Profil Bisnis", headers: ["Narasi"], rows: [[content.business_profile.narrative]] },
          ...(content.financial_analysis?.points?.length
            ? [
                {
                  title: "Analisis Keuangan",
                  headers: ["Metrik", "Nilai"],
                  rows: [
                    ["CAPEX", formatRupiah(content.financial_analysis.capex)],
                    ["BEP per Bulan", formatRupiah(content.financial_analysis.bep_per_month)],
                    ["Payback Period", content.financial_analysis.payback_months > 0 ? `${formatScore(content.financial_analysis.payback_months)} bulan` : "Belum Profit"],
                    ["ROI 6 Bulan", `${formatScore(content.financial_analysis.roi)}%`],
                    ...content.financial_analysis.points.map((point, index) => [`Poin ${index + 1}`, point]),
                  ],
                },
              ]
            : []),
          ...content.sub_score_analysis.map((item) => ({
            title: `Analisis ${item.title}`,
            headers: ["Bagian", "Isi"],
            rows: [
              ["Narasi", item.narrative],
              ...item.score_drivers.map((driver) => [`Faktor (${driver.effect})`, driver.factor]),
              ...item.alternative_solutions.map((solution) => [`Solusi: ${solution.title}`, `${solution.description} (${solution.trade_off})`]),
            ],
          })),
          { title: "Kekuatan Utama", headers: ["Narasi"], rows: [[content.key_strengths?.narrative ?? "-"]] },
          { title: "Penilaian Risiko", headers: ["Narasi", "Level"], rows: [[content.risk_assessment.narrative, content.risk_assessment.level]] },
          { title: "Rekomendasi", headers: ["No", "Rekomendasi"], rows: content.recommendations.map((item, index) => [index + 1, item]) },
          { title: "Kesimpulan", headers: ["Narasi"], rows: [[content.conclusion]] },
        ],
      });
    } catch (err) {
      setExportError(getFriendlyApiError(err, "Gagal membuat PDF"));
    }
  };

  const exportExcel = async () => {
    if (!content) return;
    setExportError("");
    try {
      await downloadWorkbook(reportFilename("business-health-report", businessId, "xlsx"), [
        {
          name: "Ringkasan",
          rows: [
            ["Laporan Kesehatan Bisnis"],
            ["Ringkasan Eksekutif", content.executive_summary],
            ["Kekuatan Utama", content.key_strengths?.narrative ?? "-"],
            ["Tingkat Risiko", content.risk_assessment.level],
            ["Kesimpulan", content.conclusion],
          ],
        },
        {
          name: "Analisis Keuangan",
          rows: [
            ["Metrik", "Nilai"],
            ["CAPEX", content.financial_analysis?.capex ?? 0],
            ["BEP per Bulan", content.financial_analysis?.bep_per_month ?? 0],
            ["Payback Period", content.financial_analysis && content.financial_analysis.payback_months > 0 ? `${formatScore(content.financial_analysis.payback_months)} bulan` : "Belum Profit"],
            ["ROI 6 Bulan", content.financial_analysis ? `${formatScore(content.financial_analysis.roi)}%` : "-"],
            ...(content.financial_analysis?.points?.length
              ? content.financial_analysis.points.map((point, index) => [`Poin ${index + 1}`, point])
              : [["Poin", "-"]]),
          ],
          currencyColumns: [1],
        },
        {
          name: "Sub Skor",
          rows: [
            ["Dimensi", "Skor", "Narasi"],
            ...content.sub_score_analysis.map((item) => [item.title, item.score, item.narrative]),
          ],
        },
        {
          name: "Solusi Alternatif",
          rows: [
            ["Dimensi", "Solusi", "Deskripsi", "Trade-off"],
            ...content.sub_score_analysis.flatMap((item) =>
              item.alternative_solutions.map((solution) => [item.title, solution.title, solution.description, solution.trade_off]),
            ),
          ],
        },
        {
          name: "Rekomendasi",
          rows: [["No", "Rekomendasi"], ...content.recommendations.map((item, index) => [index + 1, item])],
        },
      ]);
    } catch (err) {
      setExportError(getFriendlyApiError(err, "Gagal membuat Excel"));
    }
  };

  return (
    <DashboardShell activeView="aiReport" title="Laporan Kesehatan Bisnis">
      <section className="ai-report">
        {businessName && (
          <p className="ai-report__business-identity">
            {businessName}
            {industry && <span> · {industry}</span>}
          </p>
        )}
        <nav className="page-nav">
          <Link className="page-nav__link" to={`/businesses/${businessId}/sub-scores`}><Icon name="chart" size={16} /> Sub Skor</Link>
          <Link className="page-nav__link" to={`/businesses/${businessId}/inventory-input`}><Icon name="file" size={16} /> Lihat Input</Link>
        </nav>
        {isLoading && <LoadingState>Memuat laporan kesehatan bisnis...</LoadingState>}

        {!isLoading && notGenerated && (
          <article className="panel empty-state">
            <span><Icon name="bulb" /></span>
            <h3>{isAdmin ? "Laporan Kesehatan Bisnis belum dibuat" : "Ungkap Kesehatan Bisnis Anda Lebih Dalam"}</h3>
            <p>
              {isAdmin
                ? "Pemilik usaha belum membuat laporan kesehatan bisnis untuk data inventarisasi ini."
                : "Dapatkan skor per dimensi, analisis keuangan (BEP, ROI, payback period), dan rekomendasi actionable yang siap dipakai untuk evaluasi, presentasi tim, atau pengajuan modal."}
            </p>
            {!isAdmin && (
              <div className="empty-state__cta">
                <small className="field__example">Setelah laporan dibuat, data inventarisasi usaha ini akan terkunci. Pastikan datanya sudah benar sebelum lanjut.</small>
                <Button className="btn--report-highlight btn--wiggle" onClick={() => setIsConfirmOpen(true)} disabled={isRegenerating}>
                  {isRegenerating ? "Memulai..." : "Buat Laporan Sekarang"} <span className="btn--wiggle__icon"><Icon name="bulb" size={18} /></span>
                </Button>
              </div>
            )}
          </article>
        )}

        {!isLoading && error && (
          <article className="panel empty-state retry-state">
            <span>{error}</span>
            <Button
              className="btn--dashboard-hover"
              onClick={() => {
                setIsLoading(true);
                load();
              }}
            >
              Coba lagi <Icon name="refresh" size={18} />
            </Button>
          </article>
        )}

        {!isLoading && !error && !notGenerated && report?.status === "processing" && (
          <LoadingState>Laporan Kesehatan Bisnis sedang diproses, biasanya butuh beberapa saat...</LoadingState>
        )}

        {!isLoading && !error && !notGenerated && report?.status === "failed" && (
          <article className="panel empty-state retry-state">
            <span><Icon name="alert" /></span>
            <strong>Laporan Kesehatan Bisnis gagal dibuat.</strong>
            <Button className="btn--dashboard-hover" onClick={() => setIsConfirmOpen(true)} disabled={isRegenerating}>
              {isRegenerating ? "Memulai ulang..." : "Generate Ulang"} <Icon name="refresh" size={18} />
            </Button>
          </article>
        )}

        {!isLoading && !error && !notGenerated && report?.status === "ready" && content && (
          <>
            <div className="ai-report__actions">
              <Button className="btn--dashboard-hover" variant="dark" onClick={exportExcel}>
                <Icon name="download" size={18} /> Excel
              </Button>
              <Button className="btn--dashboard-hover" variant="dark" onClick={exportPdf}>
                <Icon name="file" size={18} /> PDF
              </Button>
            </div>
            {exportError && <p className="form-error">{exportError}</p>}
            <article className="panel admin-inventory-note ai-report__summary">
              <span><Icon name="bulb" /></span>
              <h3>Ringkasan Eksekutif</h3>
              <div className="ai-report__callout">
                <p>{content.executive_summary}</p>
              </div>
              <p className="ai-report__disclaimer">{content.meta.disclaimer}</p>
            </article>
            <article className="panel admin-inventory-note">
              <span><Icon name="home" /></span>
              <h3>Profil Bisnis</h3>
              <p>{content.business_profile.narrative}</p>
            </article>
            {content.financial_analysis && content.financial_analysis.points && content.financial_analysis.points.length > 0 && (
              <article className="panel admin-inventory-note">
                <span><Icon name="chart" /></span>
                <h3>Analisis Keuangan</h3>
                <FinancialAnalysisTiles
                  bepPerMonth={content.financial_analysis.bep_per_month}
                  capex={content.financial_analysis.capex}
                  paybackMonths={content.financial_analysis.payback_months}
                  roi={content.financial_analysis.roi}
                  capitalInvestment={content.financial_analysis.capital_investment}
                  monthlyRevenue={content.financial_analysis.monthly_revenue}
                  monthlyNetProfit={content.financial_analysis.monthly_net_profit}
                  netProfit={content.financial_analysis.net_profit}
                />
                <ul className="financial-tiles__points">
                  {content.financial_analysis.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </article>
            )}
            <div className="ai-report__charts inventory-insight-grid">
              {content.charts.map((chart) => (
                <AIReportChart key={chart.id} chart={chart} />
              ))}
            </div>
            <article className="panel admin-inventory-note">
              <span><Icon name="grid" /></span>
              <h3>Analisis 6 Sub Skor</h3>
              <div className="ai-subscore-list">
                {content.sub_score_analysis.map((item) => (
                  <article
                    key={item.dimension}
                    className="ai-subscore-card"
                    style={{
                      "--subscore-color": statusColor(item.score),
                      "--subscore-width": `${Math.max(0, Math.min(100, item.score))}%`,
                    } as CSSProperties}
                  >
                    <div className="ai-subscore-card__head">
                      <span className="ai-subscore-card__icon">{dimensionIcon[item.dimension] ?? "★"}</span>
                      <div className="ai-subscore-card__heading">
                        <h4>{item.title}</h4>
                        <b className="ai-subscore-card__status">{statusLabel(item.score)}</b>
                      </div>
                      <strong className="ai-subscore-card__score">{item.score}</strong>
                    </div>
                    <div className="ai-subscore-meter"><i /></div>
                    <p>{item.narrative}</p>
                    {item.score_drivers.length > 0 && (
                      <div className="ai-report__drivers">
                        {item.score_drivers.map((driver) => (
                          <div className="ai-report__driver" key={driver.factor}>
                            <strong>{driver.factor}</strong>
                            <em>{driver.effect}</em>
                          </div>
                        ))}
                      </div>
                    )}
                    {item.alternative_solutions.length > 0 && (
                      <details className="ai-report__solutions">
                        <summary>Alternatif Solusi ({item.alternative_solutions.length})</summary>
                        {item.alternative_solutions.map((solution) => (
                          <div key={solution.title} className="ai-report__solution">
                            <strong>{solution.title}</strong>
                            <p>{solution.description}</p>
                            <small>Trade-off: {solution.trade_off}</small>
                          </div>
                        ))}
                      </details>
                    )}
                  </article>
                ))}
              </div>
            </article>
            {content.key_strengths?.narrative && (
              <article className="panel admin-inventory-note">
                <span><Icon name="check" /></span>
                <h3>Kekuatan Utama</h3>
                <p>{content.key_strengths.narrative}</p>
              </article>
            )}
            <article className="panel admin-inventory-note">
              <span><Icon name="alert" /></span>
              <h3>
                Penilaian Risiko
                <span className={`ai-report__risk-level ai-report__risk-level--${riskLevelClass(content.risk_assessment.level)}`}>
                  {content.risk_assessment.level}
                </span>
              </h3>
              <div className="ai-report__risk-meter">
                {(["Rendah", "Sedang", "Tinggi"] as const).map((level) => (
                  <div
                    key={level}
                    className={`ai-report__risk-meter__segment ai-report__risk-meter__segment--${riskLevelClass(level)}${level === content.risk_assessment.level ? " is-active" : ""}`}
                  >
                    <i />
                    <span>{level}</span>
                  </div>
                ))}
              </div>
              <p>{content.risk_assessment.narrative}</p>
            </article>
            <article className="panel admin-inventory-note">
              <span><Icon name="check" /></span>
              <h3>Rekomendasi</h3>
              <ul className="ai-report__recommendations">
                {content.recommendations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article className="panel admin-inventory-note">
              <span><Icon name="chart" /></span>
              <h3>Kesimpulan</h3>
              <p>{content.conclusion}</p>
            </article>
          </>
        )}
      </section>

      {isConfirmOpen && (
        <ConfirmDialog
          variant="dashboard"
          titleId="ai-report-generate-confirm-title"
          icon="bulb"
          title="Yakin mau generate laporan kesehatan bisnis?"
          message="Setelah laporan berhasil dibuat, data inventarisasi usaha ini tidak bisa diubah lagi."
          cancelLabel="Batal"
          confirmLabel={isRegenerating ? "Memproses..." : "Ya, Generate"}
          onCancel={() => setIsConfirmOpen(false)}
          onConfirm={confirmGenerate}
          isBusy={isRegenerating}
        />
      )}
    </DashboardShell>
  );
}
