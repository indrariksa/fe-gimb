import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useParams } from "react-router-dom";
import { Button } from "../components/atoms/Button";
import { Icon } from "../components/atoms/Icon";
import { DashboardShell } from "../components/organisms/DashboardShell";
import * as businessApi from "../services/api/businesses";
import * as adminApi from "../services/api/admin";
import type { Business, InventorySubmission } from "../services/api/types";
import { useAuth } from "../context/AuthContext";
import { clampPercent, formatScore } from "../utils/number";
import { downloadPdfReport, downloadWorkbook, formatRupiah, reportFilename } from "../utils/exportReport";

type SubScoreItem = {
  key: string;
  label: string;
  shortLabel: string;
  score: number;
  description: string;
  color: string;
  icon: string;
};

type InventoryInsightBar = {
  label: string;
  value: number;
  formatted: string;
  color: string;
  percent?: string;
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

function safeDivide(value: number, divider: number) {
  return divider > 0 ? value / divider : 0;
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value || 0);
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value || 0);
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value || 0)}%`;
}

export function SubScoresPage() {
  const { businessId = "" } = useParams();
  const { isAdmin } = useAuth();
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
        if (isMounted) setError(err instanceof Error ? err.message : "Gagal memuat sub skor");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    if (businessId) loadSubScores();
    return () => {
      isMounted = false;
    };
  }, [businessId, isAdmin]);

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
  const metrics = submission?.analysis.metrics;

  const inventoryInsights = useMemo(() => {
    if (!submission || !metrics) return null;

    const rawCostItems: InventoryInsightBar[] = [
      { label: "HPP", value: submission.cogs, formatted: `Rp ${formatCompactCurrency(submission.cogs)}`, color: "#3b82f6" },
      { label: "Operasional", value: submission.operational_cost, formatted: `Rp ${formatCompactCurrency(submission.operational_cost)}`, color: "#10b981" },
      { label: "Gaji", value: submission.salary_cost, formatted: `Rp ${formatCompactCurrency(submission.salary_cost)}`, color: "#f59e0b" },
      { label: "Marketing", value: submission.marketing_cost, formatted: `Rp ${formatCompactCurrency(submission.marketing_cost)}`, color: "#ec4899" },
    ];
    const costTotal = rawCostItems.reduce((total, item) => total + item.value, 0);
    const costItems = rawCostItems.map((item) => ({
      ...item,
      percent: formatPercent(safeDivide(item.value, costTotal) * 100),
    }));
    let costCursor = 0;
    const costGradient = costItems.map((item) => {
      const start = costCursor;
      const end = costCursor + safeDivide(item.value, costTotal) * 100;
      costCursor = end;
      return `${item.color} ${start}% ${end}%`;
    }).join(", ");

    const financialItems: InventoryInsightBar[] = [
      { label: "Omzet 6 Bulan", value: submission.six_month_revenue, formatted: `Rp ${formatCompactCurrency(submission.six_month_revenue)}`, color: "#3b82f6" },
      { label: "Total Biaya", value: metrics.total_expense, formatted: `Rp ${formatCompactCurrency(metrics.total_expense)}`, color: "#ef4444" },
      { label: "Laba Bersih", value: metrics.net_profit, formatted: `Rp ${formatCompactCurrency(metrics.net_profit)}`, color: metrics.net_profit >= 0 ? "#10b981" : "#ef4444" },
    ];
    const financialMax = Math.max(1, ...financialItems.map((item) => Math.abs(item.value)));
    const profitPerHundred = safeDivide(metrics.net_profit, submission.six_month_revenue) * 100;

    const customerItems: InventoryInsightBar[] = [
      { label: "Pelanggan Baru", value: submission.new_customers, formatted: formatCompactNumber(submission.new_customers), color: "#3b82f6" },
      { label: "Repeat Customer", value: submission.repeat_customers, formatted: formatCompactNumber(submission.repeat_customers), color: "#8b5cf6" },
      { label: "Pelanggan Aktif", value: submission.active_customers, formatted: formatCompactNumber(submission.active_customers), color: "#10b981" },
    ];
    const customerMax = Math.max(1, ...customerItems.map((item) => item.value));

    const gauges = [
      {
        label: "Nilai rata-rata transaksi",
        value: `Rp ${formatCompactCurrency(metrics.average_transaction_value)}`,
        note: `${formatCompactNumber(submission.six_month_transactions)} transaksi`,
        percent: Math.min(100, safeDivide(metrics.average_transaction_value, 500000) * 100),
        color: "#3b82f6",
      },
      {
        label: "Rata-rata gaji per karyawan",
        value: `Rp ${formatCompactCurrency(metrics.salary_per_employee)}`,
        note: `Total gaji Rp ${formatCompactCurrency(submission.salary_cost)}`,
        percent: Math.min(100, safeDivide(metrics.salary_per_employee, 10000000) * 100),
        color: "#10b981",
      },
      {
        label: "Rasio laba terhadap modal",
        value: formatPercent(safeDivide(metrics.net_profit, submission.capital_investment) * 100),
        note: `Modal Rp ${formatCompactCurrency(submission.capital_investment)}`,
        percent: Math.min(100, Math.max(0, safeDivide(metrics.net_profit, submission.capital_investment) * 100)),
        color: "#f59e0b",
      },
    ];

    const capitalItems: InventoryInsightBar[] = [
      { label: "Aset", value: submission.asset_value, formatted: `Rp ${formatCompactCurrency(submission.asset_value)}`, color: "#8b5cf6" },
      { label: "Modal", value: submission.capital_investment, formatted: `Rp ${formatCompactCurrency(submission.capital_investment)}`, color: "#ec4899" },
      { label: "Laba", value: metrics.net_profit, formatted: `Rp ${formatCompactCurrency(metrics.net_profit)}`, color: "#10b981" },
    ];
    const capitalMax = Math.max(1, ...capitalItems.map((item) => Math.abs(item.value)));
    const customerQualityItems: InventoryInsightBar[] = [
      {
        label: "Omzet per pelanggan aktif",
        value: safeDivide(submission.six_month_revenue, submission.active_customers),
        formatted: `Rp ${formatCompactCurrency(safeDivide(submission.six_month_revenue, submission.active_customers))}`,
        color: "#3b82f6",
      },
      {
        label: "Transaksi per pelanggan aktif",
        value: safeDivide(submission.six_month_transactions, submission.active_customers),
        formatted: `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(safeDivide(submission.six_month_transactions, submission.active_customers))}x`,
        color: "#10b981",
      },
      {
        label: "Repeat dari pelanggan aktif",
        value: safeDivide(submission.repeat_customers, submission.active_customers) * 100,
        formatted: formatPercent(safeDivide(submission.repeat_customers, submission.active_customers) * 100),
        color: "#8b5cf6",
      },
    ];
    const customerQualityMax = Math.max(1, ...customerQualityItems.map((item) => item.value));

    return {
      costItems,
      costTotal,
      costGradient: costGradient || "var(--color-primary) 0% 100%",
      costBreakdownLabel: costItems.map((item) => `${item.label}: ${item.percent}`).join(", "),
      financialItems,
      financialMax,
      profitPerHundred,
      customerItems,
      customerMax,
      gauges,
      capitalItems,
      capitalMax,
      customerQualityItems,
      customerQualityMax,
      retentionRate: metrics.retention_rate,
    };
  }, [submission, metrics]);

  const businessName = business?.name ?? submission?.business_name ?? "Bisnis";

  const exportSubScoresExcel = () => {
    if (!submission || !inventoryInsights) return;
    const reportMetrics = submission.analysis.metrics;
    downloadWorkbook(reportFilename("sub-scores-analysis", businessName, "xlsx"), [
      {
        name: "Ringkasan",
        rows: [
          ["Detailed Analysis Report"],
          ["Bisnis", businessName],
          ["Tanggal Diagnosis", new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(submission.created_at))],
          ["Skor Keseluruhan", formatScore(submission.analysis.overall_score)],
          ["Status", submission.analysis.status],
        ],
      },
      {
        name: "Sub Dimensi",
        rows: [
          ["Sub Dimensi", "Nilai", "Status", "Deskripsi"],
          ...items.map((item) => [item.shortLabel, item.score, statusShort(item.score), item.description]),
        ],
      },
      {
        name: "Keuangan",
        rows: [
          ["Metrik", "Nilai"],
          ...inventoryInsights.financialItems.map((item) => [item.label, item.value]),
          ["Laba per Rp 100 Omzet", inventoryInsights.profitPerHundred],
          ["Aset", submission.asset_value],
          ["Modal", submission.capital_investment],
          ["Laba", reportMetrics.net_profit],
        ],
        currencyColumns: [1],
      },
      {
        name: "Biaya",
        rows: [
          ["Kategori", "Nominal", "Persentase"],
          ...inventoryInsights.costItems.map((item) => [item.label, item.value, item.percent ?? ""]),
        ],
        currencyColumns: [1],
      },
      {
        name: "Pelanggan",
        rows: [
          ["Metrik", "Nilai"],
          ...inventoryInsights.customerItems.map((item) => [item.label, item.value]),
          ["Retensi", formatPercent(inventoryInsights.retentionRate)],
          ...inventoryInsights.customerQualityItems.map((item) => [item.label, item.formatted]),
        ],
      },
    ]);
  };

  const exportSubScoresPdf = () => {
    if (!submission || !inventoryInsights) return;
    const reportMetrics = submission.analysis.metrics;
    downloadPdfReport({
      filename: reportFilename("sub-scores-analysis", businessName, "pdf"),
      title: "Detailed Analysis Report",
      subtitle: `${businessName} - Diagnosis ${new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(submission.created_at))}`,
      summary: [
        ["Bisnis", businessName],
        ["Skor Keseluruhan", formatScore(submission.analysis.overall_score)],
        ["Status", submission.analysis.status],
        ["Omzet 6 Bulan", formatRupiah(submission.six_month_revenue)],
        ["Laba Bersih", formatRupiah(reportMetrics.net_profit)],
        ["Total Biaya", formatRupiah(reportMetrics.total_expense)],
      ],
      scores: items.map((item) => ({
        label: item.shortLabel,
        score: item.score,
        status: statusShort(item.score),
        color: item.color,
      })),
      sections: [
        { title: "Sub Dimensi", headers: ["Dimensi", "Nilai", "Status", "Deskripsi"], rows: items.map((item) => [item.shortLabel, formatScore(item.score), statusShort(item.score), item.description]) },
        { title: "Alokasi Biaya", headers: ["Kategori", "Nominal", "Persentase"], rows: inventoryInsights.costItems.map((item) => [item.label, formatRupiah(item.value), item.percent ?? "-"]) },
        { title: "Ringkasan Arus Uang", headers: ["Metrik", "Nilai"], rows: [...inventoryInsights.financialItems.map((item) => [item.label, formatRupiah(item.value)]), ["Laba per Rp 100 Omzet", formatRupiah(inventoryInsights.profitPerHundred)]] },
        { title: "Customer Funnel", headers: ["Metrik", "Jumlah"], rows: [...inventoryInsights.customerItems.map((item) => [item.label, item.formatted]), ["Retensi", formatPercent(inventoryInsights.retentionRate)]] },
        { title: "Efisiensi Transaksi & Beban SDM", headers: ["Metrik", "Nilai", "Catatan"], rows: inventoryInsights.gauges.map((item) => [item.label, item.value, item.note]) },
        { title: "Keseimbangan Modal", headers: ["Metrik", "Nilai"], rows: inventoryInsights.capitalItems.map((item) => [item.label, formatRupiah(item.value)]) },
        { title: "Kualitas Transaksi & Pelanggan", headers: ["Metrik", "Nilai"], rows: inventoryInsights.customerQualityItems.map((item) => [item.label, item.formatted]) },
      ],
    });
  };

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
                <Button className="btn--dashboard-hover btn--dashboard-export" variant="secondary" disabled={!submission || !inventoryInsights} onClick={exportSubScoresPdf}><Icon name="download" size={18} /> PDF</Button>
                <Button className="btn--dashboard-hover" disabled={!submission || !inventoryInsights} onClick={exportSubScoresExcel}><Icon name="download" size={18} /> Excel</Button>
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

            {inventoryInsights && (
              <section className="inventory-insights">
                <div className="inventory-insights__heading">
                  <div>
                    <span>Data Inventarisasi</span>
                    <h3>Insight Operasional Tambahan</h3>
                    <p>Visual ini memakai nominal, pelanggan, aset, modal, dan produktivitas agar tidak mengulang grafik skor.</p>
                  </div>
                  <b>6 visual</b>
                </div>

                <div className="inventory-insight-grid">
                  <article className="panel inventory-insight-card inventory-insight-card--cost">
                    <div>
                      <h4>Alokasi Biaya</h4>
                      <p>Uang keluar terbesar terlihat dari komposisi biaya utama.</p>
                    </div>
                    <div
                      className="cost-donut"
                      title={inventoryInsights.costBreakdownLabel}
                      aria-label={`Persentase alokasi biaya: ${inventoryInsights.costBreakdownLabel}`}
                      style={{ "--cost-gradient": inventoryInsights.costGradient } as CSSProperties}
                    >
                      <strong>{formatPercent(safeDivide(submission.marketing_cost, inventoryInsights.costTotal) * 100)}</strong>
                      <span>Marketing</span>
                    </div>
                    <div className="chart-legend">
                      {inventoryInsights.costItems.map((item) => (
                        <button key={item.label} type="button" style={{ "--legend-color": item.color } as CSSProperties}>
                          <span><i /> {item.label}</span>
                          <b>{item.formatted}<em>{item.percent}</em></b>
                        </button>
                      ))}
                    </div>
                  </article>

                  <article className="panel inventory-insight-card inventory-insight-card--bars">
                    <div>
                      <h4>Ringkasan Arus Uang</h4>
                      <p>Setiap Rp 100 omzet menghasilkan sekitar Rp {formatCompactCurrency(inventoryInsights.profitPerHundred)} laba bersih.</p>
                    </div>
                    <div className="insight-bars">
                      {inventoryInsights.financialItems.map((item) => (
                        <div className="insight-bar-row" key={item.label}>
                          <span>{item.label}</span>
                          <div><i style={{ "--bar-color": item.color, "--bar-width": `${safeDivide(Math.abs(item.value), inventoryInsights.financialMax) * 100}%` } as CSSProperties} /></div>
                          <b>{item.formatted}</b>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="panel inventory-insight-card inventory-insight-card--funnel">
                    <div>
                      <h4>Customer Funnel</h4>
                      <p>Perbandingan pelanggan baru, repeat, dan aktif.</p>
                    </div>
                    <div className="customer-funnel">
                      {inventoryInsights.customerItems.map((item) => (
                        <div key={item.label} style={{ "--funnel-color": item.color, "--funnel-width": `${Math.max(12, safeDivide(item.value, inventoryInsights.customerMax) * 100)}%` } as CSSProperties}>
                          <span>{item.label}</span>
                          <strong>{item.formatted}</strong>
                        </div>
                      ))}
                    </div>
                    <small>Retensi {formatPercent(inventoryInsights.retentionRate)}</small>
                  </article>

                  <article className="panel inventory-insight-card inventory-insight-card--gauges">
                    <div>
                      <h4>Efisiensi Transaksi & Beban SDM</h4>
                      <p>Rasio cepat dari transaksi, beban gaji, dan modal.</p>
                    </div>
                    <div className="insight-gauge-grid">
                      {inventoryInsights.gauges.map((gauge) => (
                        <div className="insight-gauge" key={gauge.label} style={{ "--gauge-color": gauge.color, "--gauge-value": `${gauge.percent}%` } as CSSProperties}>
                          <span>{gauge.label}</span>
                          <strong>{gauge.value}</strong>
                          <small>{gauge.note}</small>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="panel inventory-insight-card inventory-insight-card--capital">
                    <div>
                      <h4>Keseimbangan Modal</h4>
                      <p>Melihat posisi modal, aset, dan laba yang sudah terbentuk.</p>
                    </div>
                    <div className="capital-bars">
                      {inventoryInsights.capitalItems.map((item) => (
                        <div key={item.label}>
                          <span>{item.label}</span>
                          <i style={{ "--capital-color": item.color, "--capital-height": `${Math.max(8, safeDivide(Math.abs(item.value), inventoryInsights.capitalMax) * 100)}%` } as CSSProperties} />
                          <b>{item.formatted}</b>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="panel inventory-insight-card inventory-insight-card--quality">
                    <div>
                      <h4>Kualitas Transaksi & Pelanggan</h4>
                      <p>Melihat nilai pelanggan aktif dan potensi repeat business.</p>
                    </div>
                    <div className="customer-quality-list">
                      {inventoryInsights.customerQualityItems.map((item) => (
                        <div key={item.label}>
                          <span>{item.label}<b>{item.formatted}</b></span>
                          <i style={{ "--quality-color": item.color, "--quality-width": `${Math.max(8, safeDivide(item.value, inventoryInsights.customerQualityMax) * 100)}%` } as CSSProperties} />
                        </div>
                      ))}
                    </div>
                  </article>
                </div>
              </section>
            )}

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
