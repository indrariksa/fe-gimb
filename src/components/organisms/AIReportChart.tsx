import type { CSSProperties } from "react";
import type { AIReportChartData } from "../../services/api/types";

type AIReportChartProps = {
  chart: AIReportChartData;
};

const palette = ["#3b82f6", "#ef4444", "#10b981", "#8b5cf6", "#d97706", "#ec4899"];

function formatValue(value: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value || 0);
}

function formatPercent(value: number) {
  return `${formatValue(value)}%`;
}

export function statusLabel(score: number) {
  if (score >= 80) return "Sangat Sehat";
  if (score >= 60) return "Sehat";
  if (score >= 40) return "Cukup Sehat";
  if (score >= 20) return "Buruk";
  return "Sangat Buruk";
}

function radarPoint(index: number, count: number, radius: number, center: number) {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
  return { x: center + Math.cos(angle) * radius, y: center + Math.sin(angle) * radius };
}

// Mirrors the radar chart on the Sub Skor page: same geometry, grid rings and hover tooltips.
function RadarCard({ chart }: AIReportChartProps) {
  const size = 230;
  const center = size / 2;
  const maxRadius = 82;
  const count = chart.labels.length || 1;
  const values = chart.series[0]?.values ?? [];
  // Scale against this chart's own max instead of assuming a 0-100 score, so a radar built from
  // raw ratios (rather than dimension scores) still fills the chart instead of collapsing to a dot.
  const maxValue = Math.max(1, ...values.map((value) => Math.abs(value)));
  const radiusFor = (value: number) => (Math.max(0, value) / maxValue) * maxRadius;

  const pointsFor = (index: number, radius: number) => radarPoint(index, count, radius, center);

  return (
    <article className="panel subscore-radar">
      <h3>{chart.title}</h3>
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={chart.title}>
        {[maxRadius, maxRadius * 0.66, maxRadius * 0.33].map((radius) => (
          <polygon key={radius} points={chart.labels.map((_, index) => { const p = pointsFor(index, radius); return `${p.x},${p.y}`; }).join(" ")} />
        ))}
        {chart.labels.map((label, index) => {
          const p = pointsFor(index, maxRadius);
          return <line key={label} x1={center} y1={center} x2={p.x} y2={p.y} />;
        })}
        <polygon
          className="subscore-radar__area"
          points={values.map((value, index) => { const p = pointsFor(index, radiusFor(value)); return `${p.x},${p.y}`; }).join(" ")}
        />
        {chart.labels.map((label, index) => {
          const point = pointsFor(index, radiusFor(values[index] ?? 0));
          const textPoint = pointsFor(index, maxRadius + 20);
          const tooltipX = point.x >= center ? point.x + 16 : point.x - 24;
          const tooltipY = point.y - 30;
          return (
            <g className="subscore-radar__point" key={label}>
              <circle cx={point.x} cy={point.y} r="5" />
              <circle className="subscore-radar__hit" cx={point.x} cy={point.y} r="15" />
              <title>{label}: {formatValue(values[index] ?? 0)}</title>
              <text x={textPoint.x} y={textPoint.y}>{label}</text>
              <foreignObject x={tooltipX} y={tooltipY} width="48" height="28">
                <div className="subscore-tooltip">{formatValue(values[index] ?? 0)}</div>
              </foreignObject>
            </g>
          );
        })}
      </svg>
    </article>
  );
}

// Mirrors the "Alokasi Biaya" donut card on the Sub Skor page.
function PieCard({ chart }: AIReportChartProps) {
  const values = chart.series[0]?.values ?? [];
  const total = values.reduce((sum, value) => sum + Math.max(0, value), 0) || 1;
  let cursor = 0;
  const gradient = chart.labels
    .map((_, index) => {
      const start = cursor;
      const end = cursor + (Math.max(0, values[index] ?? 0) / total) * 100;
      cursor = end;
      return `${palette[index % palette.length]} ${start}% ${end}%`;
    })
    .join(", ");
  const topIndex = values.reduce((best, value, index) => (value > (values[best] ?? 0) ? index : best), 0);

  return (
    <article className="panel inventory-insight-card inventory-insight-card--cost">
      <div>
        <h4>{chart.title}</h4>
      </div>
      <div className="cost-donut" style={{ "--cost-gradient": gradient || "var(--color-primary) 0% 100%" } as CSSProperties}>
        <strong>{formatPercent(((values[topIndex] ?? 0) / total) * 100)}</strong>
        <span>{chart.labels[topIndex]}</span>
      </div>
      <div className="chart-legend">
        {chart.labels.map((label, index) => (
          <button key={label} type="button" style={{ "--legend-color": palette[index % palette.length] } as CSSProperties}>
            <span><i /> {label}</span>
            <b>{formatValue(values[index] ?? 0)}<em>{formatPercent(((values[index] ?? 0) / total) * 100)}</em></b>
          </button>
        ))}
      </div>
    </article>
  );
}

function formatWithUnit(value: number, unit?: string) {
  const formatted = formatValue(value);
  if (unit === "Rp") return `Rp ${formatted}`;
  if (unit) return `${formatted}${unit}`;
  return formatted;
}

// Mirrors the "Ringkasan Arus Uang" bar-row card on the Sub Skor page.
function BarCard({ chart }: AIReportChartProps) {
  const values = chart.series[0]?.values ?? [];
  const max = Math.max(1, ...values.map((value) => Math.abs(value)));
  return (
    <article className="panel inventory-insight-card">
      <h4>{chart.title}</h4>
      <div className="insight-bars">
        {chart.labels.map((label, index) => (
          <div className="insight-bar-row" key={label}>
            <span>{label}</span>
            <div>
              <i style={{ "--bar-width": `${(Math.abs(values[index] ?? 0) / max) * 100}%`, "--bar-color": palette[index % palette.length] } as CSSProperties} />
            </div>
            <b>{chart.series.map((series) => formatWithUnit(series.values[index] ?? 0, chart.unit)).join(" / ")}</b>
          </div>
        ))}
      </div>
    </article>
  );
}

// Mirrors the ring-bordered stat tiles in the "Efisiensi Transaksi" card on the Sub Skor page.
// Same circular progress ring as the "Skor Kesehatan Keseluruhan" hero card on the Dashboard page.
function GaugeCard({ chart }: AIReportChartProps) {
  const value = Math.max(0, Math.min(100, chart.series[0]?.values[0] ?? 0));
  return (
    <article className="panel health-card">
      <p>{chart.title}</p>
      <div className="health-ring" style={{ "--health-progress": `${value}%` } as CSSProperties}>
        <strong>{formatValue(value)}</strong>
        <span>{statusLabel(value)}</span>
      </div>
    </article>
  );
}

function LineCard({ chart }: AIReportChartProps) {
  const max = Math.max(1, ...chart.series.flatMap((series) => series.values));
  const width = 260;
  const height = 120;
  return (
    <article className="panel inventory-insight-card">
      <h4>{chart.title}</h4>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={chart.title} style={{ width: "100%", marginTop: 16 }}>
        {chart.series.map((series, seriesIndex) => (
          <polyline
            key={series.name}
            points={series.values
              .map((value, index) => {
                const x = chart.labels.length > 1 ? (index / (chart.labels.length - 1)) * width : width / 2;
                const y = height - (Math.max(0, value) / max) * height;
                return `${x},${y}`;
              })
              .join(" ")}
            fill="none"
            stroke={palette[seriesIndex % palette.length]}
            strokeWidth={2}
          />
        ))}
      </svg>
    </article>
  );
}

export function AIReportChart({ chart }: AIReportChartProps) {
  if (chart.type === "radar") return <RadarCard chart={chart} />;
  if (chart.type === "pie") return <PieCard chart={chart} />;
  if (chart.type === "gauge") return <GaugeCard chart={chart} />;
  if (chart.type === "line") return <LineCard chart={chart} />;
  return <BarCard chart={chart} />;
}
