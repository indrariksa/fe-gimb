import { useMemo } from "react";
import { Bar, Doughnut, Line, Pie } from "react-chartjs-2";
import type { AIReportChartData } from "../../services/api/types";
import { useThemeSettings } from "../../theme/ThemeContext";
import { chartPalette, formatChartValueWithUnit, getChartTheme } from "./chartTheme";
import { colorsFor, buildLegendLabels, percentTooltipLabel, plainTooltipLabel, buildGradientFill } from "./chartHelpers";
import { formatMonthYear } from "../../utils/dateTime";

type AdminAnalyticsChartProps = {
  chart: AIReportChartData;
};

const barTopN = 6;

function bucketTopN(labels: string[], values: number[], topN: number, restMode: "sum" | "average" = "sum") {
  const sorted = labels
    .map((label, index) => ({ label, value: values[index] ?? 0 }))
    .sort((a, b) => b.value - a.value);
  if (sorted.length <= topN) return { labels: sorted.map((row) => row.label), values: sorted.map((row) => row.value) };

  const top = sorted.slice(0, topN);
  const rest = sorted.slice(topN);
  const restSum = rest.reduce((sum, row) => sum + row.value, 0);
  const restValue = restMode === "average" ? restSum / rest.length : restSum;
  return {
    labels: [...top.map((row) => row.label), "Lainnya"],
    values: [...top.map((row) => row.value), restValue],
  };
}

export function AdminAnalyticsChart({ chart }: AdminAnalyticsChartProps) {
  const { theme } = useThemeSettings();
  const chartTheme = useMemo(() => getChartTheme(theme.mode), [theme.mode]);
  const values = chart.series[0]?.values ?? [];
  const colors = colorsFor(chart.labels.length);

  const categoricalPlugins = {
    legend: {
      position: "bottom" as const,
      labels: { color: chartTheme.muted, generateLabels: buildLegendLabels(chart.labels, values, chartTheme.muted), boxWidth: 12, padding: 12 },
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
            key={theme.mode}
            data={{ labels: chart.labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 0, hoverOffset: 8 }] }}
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
            key={theme.mode}
            data={{ labels: chart.labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 0, hoverOffset: 8 }] }}
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
      tooltip: { ...categoricalPlugins.tooltip, callbacks: { label: plainTooltipLabel(chart.unit) } },
    },
    scales: {
      x: { ticks: { color: chartTheme.muted, autoSkip: false, maxRotation: 60, minRotation: 0 }, grid: { display: false } },
      y: {
        ticks: { color: chartTheme.muted, callback: (value: number | string) => formatChartValueWithUnit(Number(value), chart.unit) },
        grid: { color: chartTheme.gridColor },
        beginAtZero: true,
      },
    },
  };

  if (chart.type === "line") {
    return (
      <article className="panel inventory-insight-card admin-chart-card">
        <h4>{chart.title}</h4>
        <div className="admin-chart-canvas">
          <Line
            key={theme.mode}
            data={{
              labels: chart.labels.map((label) => formatMonthYear(`${label}-01`, label)),
              datasets: [
                {
                  label: chart.series[0]?.name ?? chart.title,
                  data: values,
                  borderColor: chartPalette[0],
                  backgroundColor: buildGradientFill(chartPalette[0]),
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

  const bucketed = bucketTopN(chart.labels, values, barTopN, chart.id === "revenue_by_industry" ? "average" : "sum");
  return (
    <article className="panel inventory-insight-card admin-chart-card">
      <h4>{chart.title}</h4>
      <div className="admin-chart-canvas">
        <Bar
          key={theme.mode}
          data={{
            labels: bucketed.labels,
            datasets: [{ label: chart.series[0]?.name ?? chart.title, data: bucketed.values, backgroundColor: colorsFor(bucketed.labels.length), borderRadius: 6, hoverBorderWidth: 2, hoverBorderColor: chartTheme.ink }],
          }}
          options={axisOptions}
        />
      </div>
    </article>
  );
}
