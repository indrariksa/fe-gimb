import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import type { Plugin, ScriptableContext, TooltipItem } from "chart.js";
import { chartPalette, formatChartValue, formatChartPercent, formatChartValueWithUnit, type ChartTheme } from "./chartTheme";

ChartJS.register(
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
);

export function colorsFor(count: number) {
  return Array.from({ length: count }, (_, index) => chartPalette[index % chartPalette.length]);
}

export function buildLegendLabels(labels: string[], values: number[]) {
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

export function percentTooltipLabel(values: number[]) {
  return (context: TooltipItem<"pie"> | TooltipItem<"doughnut">) => {
    const total = values.reduce((sum, value) => sum + Math.max(0, value), 0) || 1;
    const value = values[context.dataIndex] ?? 0;
    return `${context.label}: ${formatChartValue(value)} (${formatChartPercent((value / total) * 100)})`;
  };
}

export function plainTooltipLabel(unit?: string) {
  return (context: TooltipItem<"bar"> | TooltipItem<"line"> | TooltipItem<"radar">) =>
    `${context.dataset.label}: ${formatChartValueWithUnit(context.raw as number, unit)}`;
}

export function buildGradientFill(color: string) {
  return (context: ScriptableContext<"line">) => {
    const { ctx, chartArea } = context.chart;
    if (!chartArea) return undefined;
    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    gradient.addColorStop(0, `${color}66`);
    gradient.addColorStop(1, `${color}00`);
    return gradient;
  };
}

export function buildCenterTextPlugin(value: string, label: string, theme: ChartTheme): Plugin<"doughnut"> {
  return {
    id: "centerText",
    afterDraw(chartInstance) {
      const { ctx, chartArea } = chartInstance;
      if (!chartArea) return;
      const centerX = (chartArea.left + chartArea.right) / 2;
      const centerY = (chartArea.top + chartArea.bottom) / 2;
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = theme.ink;
      ctx.font = "700 22px sans-serif";
      ctx.fillText(value, centerX, centerY - 10);
      ctx.font = "800 11px sans-serif";
      ctx.fillStyle = theme.muted;
      ctx.fillText(label.toUpperCase(), centerX, centerY + 14);
      ctx.restore();
    },
  };
}
