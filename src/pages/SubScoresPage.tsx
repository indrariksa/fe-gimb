import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/atoms/Button";
import { Icon } from "../components/atoms/Icon";
import { LoadingState } from "../components/atoms/LoadingState";
import { DashboardShell } from "../components/organisms/DashboardShell";
import { RadarProfile } from "../components/organisms/RadarProfile";
import { TrendChart } from "../components/organisms/TrendChart";
import * as businessApi from "../services/api/businesses";
import * as adminApi from "../services/api/admin";
import type { Business, InventorySubmission } from "../services/api/types";
import { useAuth } from "../context/AuthContext";
import { formatJakartaDate } from "../utils/dateTime";
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

const inventoryPeriodMonths = 6;

function statusShort(score: number) {
  if (score >= 80) return "Sangat Sehat";
  if (score >= 60) return "Sehat";
  if (score >= 40) return "Perlu Perbaikan";
  if (score >= 20) return "Berisiko Tinggi";
  return "Kritis";
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

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value || 0)}%`;
}

export function SubScoresPage() {
  const navigate = useNavigate();
  const { businessId = "" } = useParams();
  const { isAdmin } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [submission, setSubmission] = useState<InventorySubmission | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

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
  }, [businessId, isAdmin, reloadKey]);

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
      { label: "HPP", value: submission.cogs, formatted: formatRupiah(submission.cogs), color: "#3b82f6" },
      { label: "Operasional", value: submission.operational_cost, formatted: formatRupiah(submission.operational_cost), color: "#10b981" },
      { label: "Gaji", value: submission.salary_cost, formatted: formatRupiah(submission.salary_cost), color: "#f59e0b" },
      { label: "Marketing", value: submission.marketing_cost, formatted: formatRupiah(submission.marketing_cost), color: "#ec4899" },
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
      { label: "Omzet 6 Bulan", value: submission.six_month_revenue, formatted: formatRupiah(submission.six_month_revenue), color: "#3b82f6" },
      { label: "Total Biaya", value: metrics.total_expense, formatted: formatRupiah(metrics.total_expense), color: "#ef4444" },
      { label: "Laba Bersih", value: metrics.net_profit, formatted: formatRupiah(metrics.net_profit), color: metrics.net_profit >= 0 ? "#10b981" : "#ef4444" },
    ];
    const financialMax = Math.max(1, ...financialItems.map((item) => Math.abs(item.value)));
    const profitPerHundred = safeDivide(metrics.net_profit, submission.six_month_revenue) * 100;
    const remainingMargin = profitPerHundred;

    const customerItems: InventoryInsightBar[] = [
      { label: "Pelanggan Baru", value: submission.new_customers, formatted: formatCompactCurrency(submission.new_customers), color: "#3b82f6" },
      { label: "Repeat Customer", value: submission.repeat_customers, formatted: formatCompactCurrency(submission.repeat_customers), color: "#8b5cf6" },
      { label: "Pelanggan Aktif", value: submission.active_customers, formatted: formatCompactCurrency(submission.active_customers), color: "#10b981" },
    ];
    const customerMax = Math.max(1, ...customerItems.map((item) => item.value));
    const monthlySalaryPerEmployee = safeDivide(submission.salary_cost, inventoryPeriodMonths * submission.employee_count);

    const gauges = [
      {
        label: "Nilai rata-rata transaksi",
        value: formatRupiah(metrics.average_transaction_value),
        note: `${formatCompactCurrency(submission.six_month_transactions)} transaksi`,
        percent: Math.min(100, safeDivide(metrics.average_transaction_value, 500000) * 100),
        color: "#3b82f6",
      },
      {
        label: "Rata-rata gaji per karyawan / bulan",
        value: formatRupiah(monthlySalaryPerEmployee),
        note: `Total gaji 6 bulan ${formatRupiah(submission.salary_cost)}`,
        percent: Math.min(100, safeDivide(monthlySalaryPerEmployee, 10000000) * 100),
        color: "#10b981",
      },
    ];

    const capitalItems: InventoryInsightBar[] = [
      { label: "Aset", value: submission.asset_value, formatted: formatRupiah(submission.asset_value), color: "#8b5cf6" },
      { label: "Modal", value: submission.capital_investment, formatted: formatRupiah(submission.capital_investment), color: "#ec4899" },
      { label: "Laba", value: metrics.net_profit, formatted: formatRupiah(metrics.net_profit), color: "#10b981" },
    ];
    const capitalMax = Math.max(1, ...capitalItems.map((item) => Math.abs(item.value)));

    const fixedCost = submission.operational_cost + submission.salary_cost + submission.marketing_cost;
    const contributionMarginRatio = safeDivide(submission.six_month_revenue - submission.cogs, submission.six_month_revenue);
    const bepPerMonth = safeDivide(safeDivide(fixedCost, contributionMarginRatio), inventoryPeriodMonths);
    const monthlyRevenue = safeDivide(submission.six_month_revenue, inventoryPeriodMonths);
    const monthlyNetProfit = safeDivide(metrics.net_profit, inventoryPeriodMonths);
    const paybackMonths = safeDivide(submission.capital_investment, monthlyNetProfit);
    const canComputePayback = monthlyNetProfit > 0 && submission.capital_investment > 0;
    const roi = safeDivide(metrics.net_profit, submission.capital_investment) * 100;

    const financeGauges = [
      {
        label: "CAPEX",
        value: formatRupiah(submission.asset_value),
        note: `Modal ${formatRupiah(submission.capital_investment)}`,
        percent: Math.min(100, Math.max(0, safeDivide(submission.asset_value, submission.capital_investment) * 100)),
        color: "#8b5cf6",
      },
      {
        label: "BEP per Bulan",
        value: formatRupiah(bepPerMonth),
        note: `Omzet aktual ${formatRupiah(monthlyRevenue)}/bulan`,
        percent: Math.min(100, Math.max(0, safeDivide(bepPerMonth, monthlyRevenue) * 100)),
        color: "#f97316",
      },
      {
        label: "Payback Period",
        value: canComputePayback ? `${formatScore(paybackMonths)} bulan` : monthlyNetProfit <= 0 ? "Belum Profit" : "-",
        note: canComputePayback
          ? `Laba ${formatRupiah(monthlyNetProfit)}/bulan`
          : monthlyNetProfit <= 0
            ? "Laba bersih belum positif, belum bisa dihitung"
            : "Belum ada modal investasi diinput",
        percent: canComputePayback ? Math.min(100, Math.max(0, 100 - safeDivide(paybackMonths, 36) * 100)) : 0,
        color: "#10b981",
      },
      {
        label: "ROI 6 Bulan",
        value: formatPercent(roi),
        note: `Laba ${formatRupiah(metrics.net_profit)} dari Modal ${formatRupiah(submission.capital_investment)}`,
        percent: Math.min(100, Math.max(0, roi)),
        color: "#ec4899",
      },
    ];

    const customerQualityItems: InventoryInsightBar[] = [
      {
        label: "Omzet 6 bulan per pelanggan aktif",
        value: safeDivide(submission.six_month_revenue, submission.active_customers),
        formatted: formatRupiah(safeDivide(submission.six_month_revenue, submission.active_customers)),
        color: "#3b82f6",
      },
      {
        label: "Transaksi 6 bulan per pelanggan aktif",
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
      remainingMargin,
      customerItems,
      customerMax,
      gauges,
      capitalItems,
      capitalMax,
      financeGauges,
      bepPerMonth,
      paybackMonths,
      roi,
      customerQualityItems,
      customerQualityMax,
      retentionRate: metrics.retention_rate,
    };
  }, [submission, metrics]);

  const businessName = business?.name ?? submission?.business_name ?? "Bisnis";
  const overallScore = submission?.analysis.overall_score ?? 0;
  const overallProgress = clampPercent(overallScore);
  const overallScoreText = formatScore(overallScore);
  const overallStatus = submission?.analysis.status ?? "Belum Ada Data";
  const priorityIssues = submission?.analysis.priority_issues?.length ? submission.analysis.priority_issues : ["Belum ada prioritas perbaikan. Isi inventarisasi agar sistem dapat membaca area kritis bisnis."];
  const strengths = submission?.analysis.strengths?.length ? submission.analysis.strengths : ["Kekuatan utama akan muncul setelah data inventarisasi pertama selesai dianalisis."];
  const recommendations = submission?.analysis.recommendations?.length ? submission.analysis.recommendations : ["Rekomendasi strategis akan tersedia setelah proses diagnosis selesai."];

  const exportExcel = () => {
    if (!submission || !inventoryInsights) return;
    downloadWorkbook(reportFilename("business-health-report", businessName, "xlsx"), [
      {
        name: "Ringkasan",
        rows: [
          ["Laporan Kesehatan Bisnis"],
          ["Bisnis", businessName],
          ["Tanggal Diagnosis", formatJakartaDate(submission.created_at)],
          ["Skor Keseluruhan", overallScoreText],
          ["Status", overallStatus],
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
        name: "Diagnosis",
        rows: [
          ["Kategori", "Catatan"],
          ...submission.analysis.priority_issues.map((item) => ["Prioritas Diagnosis", item]),
          ...submission.analysis.strengths.map((item) => ["Kekuatan Utama", item]),
          ...submission.analysis.recommendations.map((item) => ["Rekomendasi", item]),
        ],
      },
      {
        name: "Action Plan",
        rows: [
          ["Periode", "Judul", "Deskripsi"],
          ...(submission.analysis.action_plan ?? []).map((item) => [item.period, item.title, item.description]),
        ],
      },
      {
        name: "Business Snapshot",
        rows: [
          ["Metrik", "Nilai"],
          ["Omzet 6 Bulan", formatRupiah(submission.six_month_revenue)],
          ["Total Transaksi", submission.six_month_transactions],
          ["Pelanggan Aktif", submission.active_customers],
          ["Laba Bersih", formatRupiah(submission.analysis.metrics.net_profit)],
          ["Total Biaya", formatRupiah(submission.analysis.metrics.total_expense)],
        ],
      },
      {
        name: "Keuangan",
        rows: [
          ["Metrik", "Nilai"],
          ...inventoryInsights.financialItems.map((item) => [item.label, item.value]),
          ["Laba per Rp 100 Omzet", inventoryInsights.profitPerHundred],
          ["Margin Laba Bersih", formatPercent(inventoryInsights.remainingMargin)],
          ["Aset", submission.asset_value],
          ["Modal", submission.capital_investment],
          ["Laba", metrics!.net_profit],
          ["BEP per Bulan", inventoryInsights.bepPerMonth],
          ["CAPEX (Nilai Aset)", submission.asset_value],
          ["Payback Period (Bulan)", inventoryInsights.paybackMonths],
          ["ROI 6 Bulan (%)", inventoryInsights.roi],
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

  const exportPdf = () => {
    if (!submission || !inventoryInsights) return;
    downloadPdfReport({
      filename: reportFilename("business-health-report", businessName, "pdf"),
      title: "Laporan Kesehatan Bisnis",
      subtitle: `${businessName} - Diagnosis ${formatJakartaDate(submission.created_at)}`,
      summary: [
        ["Bisnis", businessName],
        ["Skor Keseluruhan", overallScoreText],
        ["Status", overallStatus],
        ["Omzet 6 Bulan", formatRupiah(submission.six_month_revenue)],
        ["Laba Bersih", formatRupiah(submission.analysis.metrics.net_profit)],
        ["Total Biaya", formatRupiah(submission.analysis.metrics.total_expense)],
      ],
      scores: items.map((item) => ({
        label: item.shortLabel,
        score: item.score,
        status: statusShort(item.score),
        color: item.color,
      })),
      sections: [
        { title: "Prioritas Diagnosis", headers: ["No", "Catatan"], rows: submission.analysis.priority_issues.map((item, index) => [index + 1, item]) },
        { title: "Kekuatan Utama", headers: ["No", "Catatan"], rows: submission.analysis.strengths.map((item, index) => [index + 1, item]) },
        { title: "Rekomendasi", headers: ["No", "Catatan"], rows: submission.analysis.recommendations.map((item, index) => [index + 1, item]) },
        { title: "Action Plan 30 Hari", headers: ["Periode", "Judul", "Deskripsi"], rows: (submission.analysis.action_plan ?? []).map((item) => [item.period, item.title, item.description]) },
        { title: "Sub Dimensi", headers: ["Dimensi", "Nilai", "Status", "Deskripsi"], rows: items.map((item) => [item.shortLabel, formatScore(item.score), statusShort(item.score), item.description]) },
        { title: "Alokasi Biaya", headers: ["Kategori", "Nominal", "Persentase"], rows: inventoryInsights.costItems.map((item) => [item.label, formatRupiah(item.value), item.percent ?? "-"]) },
        { title: "Ringkasan Arus Uang", headers: ["Metrik", "Nilai"], rows: [...inventoryInsights.financialItems.map((item) => [item.label, formatRupiah(item.value)]), ["Laba per Rp 100 Omzet", formatRupiah(inventoryInsights.profitPerHundred)], ["Margin Laba Bersih", formatPercent(inventoryInsights.remainingMargin)]] },
        { title: "Customer Funnel", headers: ["Metrik", "Jumlah"], rows: [...inventoryInsights.customerItems.map((item) => [item.label, item.formatted]), ["Retensi", formatPercent(inventoryInsights.retentionRate)]] },
        { title: "Efisiensi Transaksi & Beban SDM", headers: ["Metrik", "Nilai", "Catatan"], rows: inventoryInsights.gauges.map((item) => [item.label, item.value, item.note]) },
        { title: "Keseimbangan Modal", headers: ["Metrik", "Nilai"], rows: inventoryInsights.capitalItems.map((item) => [item.label, formatRupiah(item.value)]) },
        { title: "Analisis Keuangan", headers: ["Metrik", "Nilai", "Catatan"], rows: inventoryInsights.financeGauges.map((item) => [item.label, item.value, item.note]) },
        { title: "Kualitas Transaksi & Pelanggan", headers: ["Metrik", "Nilai"], rows: inventoryInsights.customerQualityItems.map((item) => [item.label, item.formatted]) },
        {
          title: "Business Snapshot",
          headers: ["Metrik", "Nilai"],
          rows: [
            ["Omzet 6 Bulan", formatRupiah(submission.six_month_revenue)],
            ["Total Transaksi", submission.six_month_transactions],
            ["Pelanggan Aktif", submission.active_customers],
            ["Laba Bersih", formatRupiah(submission.analysis.metrics.net_profit)],
            ["Total Biaya", formatRupiah(submission.analysis.metrics.total_expense)],
          ],
        },
      ],
    });
  };

  return (
    <DashboardShell activeView="subscores">
      <section className="subscores-page">
        <nav className="page-nav">
          <Link className="page-nav__link" to={`/businesses/${businessId}/inventory-input`}><Icon name="file" size={16} /> Lihat Input</Link>
          <Link className="page-nav__link" to={`/businesses/${businessId}/health-report`}><Icon name="bulb" size={16} /> Laporan Kesehatan Bisnis</Link>
        </nav>
        {isLoading && <LoadingState>Memuat dashboard bisnis...</LoadingState>}
        {error && (
          <article className="panel empty-state retry-state">
            <span>{error}</span>
            <Button className="btn--dashboard-hover" onClick={() => setReloadKey((current) => current + 1)}>
              Coba lagi <Icon name="refresh" size={18} />
            </Button>
          </article>
        )}
        {!isLoading && !error && !submission && (
          <article className="panel dashboard-empty">
            <span><Icon name="alert" /></span>
            <h3>Belum ada hasil diagnosis</h3>
            <p>Masukkan data inventarisasi pertama untuk menghitung skor kesehatan bisnis {business?.name ?? "usaha ini"}.</p>
            <Button onClick={() => navigate(`/businesses/${businessId}/inventory/new`)}>Mulai Inventarisasi <Icon name="arrow" size={18} /></Button>
          </article>
        )}

        {!isLoading && !error && submission && (
          <>
            <div className="subscores-hero">
              <div>
                <span>Sub Dimensi</span>
                <h2>{business?.name ?? submission.business_name}</h2>
                <p>Diagnosa terakhir: {formatJakartaDate(submission.created_at, "long")}</p>
              </div>
              <div className="subscores-actions">
                <Button className="btn--dashboard-hover btn--dashboard-export" variant="secondary" disabled={!submission || !inventoryInsights} onClick={exportPdf}><Icon name="download" size={18} /> PDF</Button>
                <Button className="btn--dashboard-hover" disabled={!submission || !inventoryInsights} onClick={exportExcel}><Icon name="download" size={18} /> Excel</Button>
              </div>
            </div>

            <div className="dashboard-merge-stack">
              <section className="health-card panel">
                <p>Skor Kesehatan Keseluruhan</p>
                <div className="health-ring" style={{ "--health-progress": `${overallProgress}%` } as CSSProperties}>
                  <strong>{overallScoreText}</strong>
                  <span>{overallStatus}</span>
                </div>
                <p>Skor <strong>{overallScoreText}</strong> menunjukkan bisnis berada pada kategori <strong>{overallStatus}</strong> berdasarkan data terakhir.</p>
              </section>
              <RadarProfile submission={submission} />
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

            <section className="panel score-legend">
              <h3>Interpretasi & Skala Skor</h3>
              <div>
                <article className="critical"><strong>Skor 0 - 19 - Kritis</strong><p>Kondisi bisnis sangat kritis dan membutuhkan tindakan pemulihan segera.</p></article>
                <article className="danger"><strong>Skor 20 - 39 - Berisiko Tinggi</strong><p>Kondisi bisnis berisiko tinggi dan perlu tindakan cepat.</p></article>
                <article className="warning"><strong>Skor 40 - 59 - Perlu Perbaikan</strong><p>Bisnis masih berjalan, tetapi ada area penting yang harus diperbaiki.</p></article>
                <article className="success"><strong>Skor 60 - 79 - Sehat</strong><p>Bisnis relatif stabil dengan beberapa peluang optimasi.</p></article>
                <article className="excellent"><strong>Skor 80 - 100 - Sangat Sehat</strong><p>Bisnis berada dalam kondisi kuat dan siap dikembangkan.</p></article>
              </div>
            </section>

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

            <div className="dashboard-merge-stack">
              <TrendChart
                priorityIssues={submission.analysis.priority_issues}
                recommendations={submission.analysis.recommendations}
                actionPlan={submission.analysis.action_plan}
              />
              <div className="insight-grid">
                <article className="insight-card insight-card--dark">
                  <span><Icon name="alert" /></span>
                  <h3>Prioritas Perbaikan</h3>
                  <ul>
                    {priorityIssues.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </article>
                <article className="insight-card">
                  <span><Icon name="chart" /></span>
                  <h3>Kekuatan Utama</h3>
                  <ul>
                    {strengths.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </article>
                <article className="insight-card insight-card--warm">
                  <span><Icon name="bulb" /></span>
                  <h3>Rekomendasi Kunci</h3>
                  <ul>
                    {recommendations.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </article>
              </div>
            </div>

            {inventoryInsights && (
              <section className="inventory-insights">
                <div className="inventory-insights__heading">
                  <div>
                    <span>Data Inventarisasi</span>
                    <h3>Insight Operasional Tambahan</h3>
                  </div>
                  <b>7 visual</b>
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
                      <p>Setiap Rp 100 omzet menghasilkan sekitar {formatRupiah(inventoryInsights.profitPerHundred)} laba bersih.</p>
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
                    <div className="insight-margin">
                      <span>Margin Laba Bersih</span>
                      <b>{formatPercent(inventoryInsights.remainingMargin)}</b>
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
                    <div className="insight-gauge-grid insight-gauge-grid--2col">
                      {inventoryInsights.gauges.map((gauge) => (
                        <div className="insight-gauge" key={gauge.label} style={{ "--gauge-color": gauge.color, "--gauge-value": `${gauge.percent}%` } as CSSProperties}>
                          <span>{gauge.label}</span>
                          <strong>{gauge.value}</strong>
                          <small>{gauge.note}</small>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="panel inventory-insight-card inventory-insight-card--gauges">
                    <div>
                      <h4>Analisis Keuangan</h4>
                      <p>BEP, CAPEX, payback period, dan ROI dari data inventarisasi.</p>
                    </div>
                    <div className="insight-gauge-grid insight-gauge-grid--2col">
                      {inventoryInsights.financeGauges.map((gauge) => (
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

          </>
        )}
      </section>
    </DashboardShell>
  );
}
