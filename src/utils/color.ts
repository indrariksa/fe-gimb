export function hexToRgb(hex?: string, fallback: [number, number, number] = [14, 165, 233]) {
  const clean = (hex ?? "").replace("#", "").trim();
  const value = clean.length === 3 ? clean.split("").map((char) => char + char).join("") : clean;
  if (value.length !== 6) return { r: fallback[0], g: fallback[1], b: fallback[2] };
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}
