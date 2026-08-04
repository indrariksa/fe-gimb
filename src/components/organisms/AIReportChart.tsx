import { useMemo, useState } from "react";
import { Bar, Doughnut, Line, Radar } from "react-chartjs-2";
import type { AIReportChartData } from "../../services/api/types";
import { useThemeSettings } from "../../theme/ThemeContext";
import { chartPalette, formatChartValue, formatChartValueWithUnit, getChartTheme } from "./chartTheme";
import { colorsFor, buildLegendLabels, percentTooltipLabel, plainTooltipLabel, buildCenterTextPlugin, buildGradientFill } from "./chartHelpers";

type AIReportChartProps = {
  chart: AIReportChartData;
};

export function statusLabel(score: number) {
  if (score >= 80) return "Sangat Sehat";
  if (score >= 60) return "Sehat";
  if (score >= 40) return "Cukup Sehat";
  if (score >= 20) return "Buruk";
  return "Sangat Buruk";
}

function RadarCard({ chart }: AIReportChartProps) {
  const { theme } = useThemeSettings();
  const chartTheme = useMemo(() => getChartTheme(), [theme.mode]);
  const values = chart.series[0]?.values ?? [];

  return (
    <article className="panel subscore-radar ai-chart-card">
      <h3>{chart.title}</h3>
      <div className="ai-chart-canvas ai-chart-canvas--radar">
        <Radar
          data={{
            labels: chart.labels,
            datasets: [
              {
                label: chart.series[0]?.name ?? chart.title,
                data: values,
                borderColor: chartPalette[0],
                backgroundColor: `${chartPalette[0]}33`,
                pointBackgroundColor: chartPalette[0],
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: plainTooltipLabel() } } },
            scales: {
              r: {
                beginAtZero: true,
                angleLines: { color: chartTheme.gridColor },
                grid: { color: chartTheme.gridColor },
                pointLabels: { color: chartTheme.ink, font: { size: 14 } },
                ticks: { display: false, backdropColor: "transparent" },
              },
            },
          }}
        />
      </div>
    </article>
  );
}

function DonutCard({ chart }: AIReportChartProps) {
  const { theme } = useThemeSettings();
  const chartTheme = useMemo(() => getChartTheme(), [theme.mode]);
  const values = chart.series[0]?.values ?? [];
  const colors = colorsFor(chart.labels.length);

  return (
    <article className="panel inventory-insight-card ai-chart-card">
      <h4>{chart.title}</h4>
      <div className="ai-chart-canvas ai-chart-canvas--donut">
        <Doughnut
          data={{ labels: chart.labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 0, hoverOffset: 8 }] }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            cutout: "68%",
            plugins: {
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
            },
          }}
        />
      </div>
    </article>
  );
}

function BarCard({ chart }: AIReportChartProps) {
  const { theme } = useThemeSettings();
  const chartTheme = useMemo(() => getChartTheme(), [theme.mode]);
  const values = chart.series[0]?.values ?? [];
  const colors = colorsFor(chart.labels.length);

  return (
    <article className="panel inventory-insight-card ai-chart-card">
      <h4>{chart.title}</h4>
      <div className="ai-chart-canvas">
        <Bar
          data={{
            labels: chart.labels,
            datasets: [{ label: chart.series[0]?.name ?? chart.title, data: values, backgroundColor: colors, borderRadius: 6, hoverBorderWidth: 2, hoverBorderColor: chartTheme.ink }],
          }}
          options={{
            indexAxis: "y" as const,
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: chartTheme.surface,
                titleColor: chartTheme.ink,
                bodyColor: chartTheme.ink,
                borderColor: chartTheme.gridColor,
                borderWidth: 1,
                callbacks: { label: plainTooltipLabel(chart.unit) },
              },
            },
            scales: {
              x: {
                beginAtZero: true,
                ticks: { color: chartTheme.muted, callback: (value: number | string) => formatChartValueWithUnit(Number(value), chart.unit) },
                grid: { color: chartTheme.gridColor },
              },
              y: { ticks: { color: chartTheme.muted }, grid: { display: false } },
            },
          }}
        />
      </div>
    </article>
  );
}

function GaugeCard({ chart }: AIReportChartProps) {
  const { theme } = useThemeSettings();
  const chartTheme = useMemo(() => getChartTheme(), [theme.mode]);
  const value = Math.max(0, Math.min(100, chart.series[0]?.values[0] ?? 0));
  const [displayValue, setDisplayValue] = useState(value);
  const centerPlugin = buildCenterTextPlugin(formatChartValue(value), statusLabel(value), chartTheme);

  const replayFill = () => {
    setDisplayValue(0);
    setTimeout(() => setDisplayValue(value), 20);
  };

  return (
    <article className="panel health-card" onMouseEnter={replayFill}>
      <p>{chart.title}</p>
      <div className="ai-chart-canvas ai-chart-canvas--gauge">
        <Doughnut
          data={{
            labels: [chart.series[0]?.name ?? "Skor", "Sisa"],
            datasets: [{ data: [displayValue, 100 - displayValue], backgroundColor: [chartPalette[0], chartTheme.gridColor], borderWidth: 0 }],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            cutout: "78%",
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
          }}
          plugins={[centerPlugin]}
        />
      </div>
    </article>
  );
}

function LineCard({ chart }: AIReportChartProps) {
  const { theme } = useThemeSettings();
  const chartTheme = useMemo(() => getChartTheme(), [theme.mode]);

  return (
    <article className="panel inventory-insight-card ai-chart-card">
      <h4>{chart.title}</h4>
      <div className="ai-chart-canvas">
        <Line
          data={{
            labels: chart.labels,
            datasets: chart.series.map((series, index) => ({
              label: series.name,
              data: series.values,
              borderColor: chartPalette[index % chartPalette.length],
              backgroundColor: buildGradientFill(chartPalette[index % chartPalette.length]),
              fill: true,
              tension: 0.35,
              pointRadius: 3,
            })),
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: chart.series.length > 1, position: "bottom" as const, labels: { color: chartTheme.muted } },
              tooltip: { callbacks: { label: plainTooltipLabel(chart.unit) } },
            },
            scales: {
              x: { ticks: { color: chartTheme.muted }, grid: { display: false } },
              y: {
                ticks: { color: chartTheme.muted, callback: (value: number | string) => formatChartValueWithUnit(Number(value), chart.unit) },
                grid: { color: chartTheme.gridColor },
                beginAtZero: true,
              },
            },
          }}
        />
      </div>
    </article>
  );
}

export function AIReportChart({ chart }: AIReportChartProps) {
  if (chart.type === "radar") return <RadarCard chart={chart} />;
  if (chart.type === "pie" || chart.type === "doughnut") return <DonutCard chart={chart} />;
  if (chart.type === "gauge") return <GaugeCard chart={chart} />;
  if (chart.type === "line") return <LineCard chart={chart} />;
  return <BarCard chart={chart} />;
}
