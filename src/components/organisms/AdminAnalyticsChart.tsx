import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import type { TooltipItem } from "chart.js";
import { Bar, Doughnut, Line, Pie } from "react-chartjs-2";
import type { AIReportChartData } from "../../services/api/types";
import { useThemeSettings } from "../../theme/ThemeContext";
import { chartPalette, formatChartValue, formatChartPercent, getChartTheme } from "./chartTheme";
import { formatMonthYear } from "../../utils/dateTime";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
);

type AdminAnalyticsChartProps = {
  chart: AIReportChartData;
};

function colorsFor(count: number) {
  return Array.from({ length: count }, (_, index) => chartPalette[index % chartPalette.length]);
}

const barTopN = 6;

function bucketTopN(labels: string[], values: number[], topN: number) {
  const sorted = labels
    .map((label, index) => ({ label, value: values[index] ?? 0 }))
    .sort((a, b) => b.value - a.value);
  if (sorted.length <= topN) return { labels: sorted.map((row) => row.label), values: sorted.map((row) => row.value) };

  const top = sorted.slice(0, topN);
  const restTotal = sorted.slice(topN).reduce((sum, row) => sum + row.value, 0);
  return {
    labels: [...top.map((row) => row.label), "Lainnya"],
    values: [...top.map((row) => row.value), restTotal],
  };
}

function buildLegendLabels(labels: string[], values: number[]) {
  return (chart: ChartJS) => {
    const total = values.reduce((sum, value) => sum + Math.max(0, value), 0) || 1;
    return labels.map((label, index) => ({
      text: `${label}: ${formatChartValue(values[index] ?? 0)} (${formatChartPercent(((values[index] ?? 0) / total) * 100)})`,
      fillStyle: chartPalette[index % chartPalette.length],
      strokeStyle: chartPalette[index % chartPalette.length],
      hidden: !chart.getDataVisibility(index),
      index,
    }));
  };
}

function percentTooltipLabel(values: number[]) {
  return (context: TooltipItem<"pie"> | TooltipItem<"doughnut">) => {
    const total = values.reduce((sum, value) => sum + Math.max(0, value), 0) || 1;
    const value = values[context.dataIndex] ?? 0;
    return `${context.label}: ${formatChartValue(value)} (${formatChartPercent((value / total) * 100)})`;
  };
}

function plainTooltipLabel(context: TooltipItem<"bar"> | TooltipItem<"line">) {
  const value = typeof context.parsed === "object" ? context.parsed.y : context.parsed;
  return `${context.dataset.label}: ${formatChartValue(value as number)}`;
}

export function AdminAnalyticsChart({ chart }: AdminAnalyticsChartProps) {
  const { theme } = useThemeSettings();
  const chartTheme = useMemo(() => getChartTheme(), [theme.mode]);
  const values = chart.series[0]?.values ?? [];
  const colors = colorsFor(chart.labels.length);

  const categoricalPlugins = {
    legend: {
      position: "bottom" as const,
      labels: { color: chartTheme.muted, generateLabels: buildLegendLabels(chart.labels, values), boxWidth: 12, padding: 12 },
    },
    tooltip: {
      backgroundColor: chartTheme.surface,
      titleColor: chartTheme.ink,
      bodyColor: chartTheme.ink,
      borderColor: chartTheme.gridColor,
      borderWidth: 1,
      callbacks: { label: percentTooltipLabel(values) },
    },
  };

  if (chart.type === "doughnut") {
    return (
      <article className="panel inventory-insight-card admin-chart-card">
        <h4>{chart.title}</h4>
        <div className="admin-chart-canvas">
          <Doughnut
            data={{ labels: chart.labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 0 }] }}
            options={{ responsive: true, maintainAspectRatio: false, cutout: "68%", plugins: categoricalPlugins }}
          />
        </div>
      </article>
    );
  }

  if (chart.type === "pie") {
    return (
      <article className="panel inventory-insight-card admin-chart-card">
        <h4>{chart.title}</h4>
        <div className="admin-chart-canvas">
          <Pie
            data={{ labels: chart.labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 0 }] }}
            options={{ responsive: true, maintainAspectRatio: false, plugins: categoricalPlugins }}
          />
        </div>
      </article>
    );
  }

  const axisOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { ...categoricalPlugins.tooltip, callbacks: { label: plainTooltipLabel } },
    },
    scales: {
      x: { ticks: { color: chartTheme.muted, autoSkip: false, maxRotation: 60, minRotation: 0 }, grid: { display: false } },
      y: { ticks: { color: chartTheme.muted }, grid: { color: chartTheme.gridColor }, beginAtZero: true },
    },
  };

  if (chart.type === "line") {
    return (
      <article className="panel inventory-insight-card admin-chart-card">
        <h4>{chart.title}</h4>
        <div className="admin-chart-canvas">
          <Line
            data={{
              labels: chart.labels.map((label) => formatMonthYear(`${label}-01`, label)),
              datasets: [
                {
                  label: chart.series[0]?.name ?? chart.title,
                  data: values,
                  borderColor: chartPalette[0],
                  backgroundColor: `${chartPalette[0]}33`,
                  fill: true,
                  tension: 0.35,
                  pointRadius: 3,
                },
              ],
            }}
            options={axisOptions}
          />
        </div>
      </article>
    );
  }

  const bucketed = bucketTopN(chart.labels, values, barTopN);
  return (
    <article className="panel inventory-insight-card admin-chart-card">
      <h4>{chart.title}</h4>
      <div className="admin-chart-canvas">
        <Bar
          data={{
            labels: bucketed.labels,
            datasets: [{ label: chart.series[0]?.name ?? chart.title, data: bucketed.values, backgroundColor: colorsFor(bucketed.labels.length), borderRadius: 6 }],
          }}
          options={axisOptions}
        />
      </div>
    </article>
  );
}
