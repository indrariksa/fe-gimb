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

// Mirrors --ink/--muted/--surface/--border from global.css for each theme mode.
// Derived directly from theme.mode instead of reading getComputedStyle(), because
// ThemeProvider applies data-theme to <html> inside a useEffect that runs after
// this component's render — reading the DOM here would race that effect and show
// the previous theme's colors for one render (or longer, since the useMemo below
// only recomputes when theme.mode itself changes again).
const chartThemeByMode: Record<"light" | "dark", ChartTheme> = {
  light: { ink: "#10172a", muted: "#536078", surface: "#ffffff", gridColor: "#e4e8f0" },
  dark: { ink: "#eef2ff", muted: "#a7b0c3", surface: "#111827", gridColor: "#242e42" },
};

export function getChartTheme(mode: "light" | "dark"): ChartTheme {
  return chartThemeByMode[mode];
}
