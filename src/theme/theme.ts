import type { ThemeSettings } from "../types";

export const defaultTheme: ThemeSettings = {
  appName: "GIMB Business",
  businessName: "Toko Maju Jaya",
  ownerName: "Budi Santoso",
  mode: "light",
  primaryColor: "#6558d9",
  accentColor: "#d58a28",
  successColor: "#199c82",
  warningColor: "#d58a28",
};

export const themeStorageKey = "gimb:sbd:theme";

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "").trim();
  const value = normalized.length === 3
    ? normalized.split("").map((char) => char + char).join("")
    : normalized;

  if (value.length !== 6) return { r: 101, g: 88, b: 217 };

  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function relativeLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const values = [r, g, b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
}

function readableTextColor(background: string) {
  return relativeLuminance(background) > 0.48 ? "#071426" : "#ffffff";
}

export function applyTheme(settings: ThemeSettings) {
  const root = document.documentElement;
  root.dataset.theme = settings.mode;
  root.style.setProperty("--color-primary", settings.primaryColor);
  root.style.setProperty("--color-accent", settings.accentColor);
  root.style.setProperty("--color-success", settings.successColor);
  root.style.setProperty("--color-warning", settings.warningColor);
  root.style.setProperty("--on-primary", readableTextColor(settings.primaryColor));
  root.style.setProperty("--on-accent", readableTextColor(settings.accentColor));
  root.style.setProperty("--on-success", readableTextColor(settings.successColor));
  root.style.setProperty("--on-warning", readableTextColor(settings.warningColor));
  root.style.setProperty("--on-danger", readableTextColor("#ef4444"));
}
