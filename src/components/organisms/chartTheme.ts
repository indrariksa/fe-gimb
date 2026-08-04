export const chartPalette = ["#3b82f6", "#ef4444", "#10b981", "#8b5cf6", "#d97706", "#ec4899"];

export function formatChartValue(value: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value || 0);
}

export function formatChartPercent(value: number) {
  return `${formatChartValue(value)}%`;
}

export function formatChartValueWithUnit(value: number, unit?: string) {
  if (unit === "Rp") return `Rp ${formatChartValue(value)}`;
  if (unit) return `${formatChartValue(value)}${unit}`;
  return formatChartValue(value);
}

export type ChartTheme = {
  ink: string;
  muted: string;
  surface: string;
  gridColor: string;
};

export function getChartTheme(): ChartTheme {
  const style = getComputedStyle(document.documentElement);
  return {
    ink: style.getPropertyValue("--ink").trim(),
    muted: style.getPropertyValue("--muted").trim(),
    surface: style.getPropertyValue("--surface").trim(),
    gridColor: style.getPropertyValue("--border").trim(),
  };
}
