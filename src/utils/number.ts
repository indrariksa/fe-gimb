export function formatScore(score: number) {
  return Number.isInteger(score) ? String(score) : score.toFixed(1).replace(/\.0$/, "");
}

export function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}
