import type { CSSProperties } from "react";
import { formatRupiah } from "../../utils/exportReport";
import { formatScore } from "../../utils/number";

type FinancialAnalysisTilesProps = {
  bepPerMonth: number;
  capex: number;
  paybackMonths: number;
  roi: number;
  capitalInvestment: number;
  monthlyRevenue: number;
  monthlyNetProfit: number;
  netProfit: number;
};

const tiles: { key: "capex" | "bep" | "payback" | "roi"; label: string; long?: string; color: string }[] = [
  { key: "capex", label: "CAPEX", long: "Capital Expenditure", color: "#8b5cf6" },
  { key: "bep", label: "BEP per bulan", long: "Break Even Point", color: "#f97316" },
  { key: "payback", label: "Payback period", long: "periode balik modal", color: "#10b981" },
  { key: "roi", label: "ROI 6 bulan", long: "Return on Investment", color: "#ec4899" },
];

// Splits a formatted value like "Rp655.654.010" or "46.4%" or "12.9 bulan" into a
// leading/trailing unit (rendered smaller) and the main figure (rendered as the hero number).
function splitValue(value: string): { prefix: string; main: string; suffix: string } {
  const rupiahMatch = value.match(/^Rp(.+)$/);
  if (rupiahMatch) return { prefix: "Rp", main: rupiahMatch[1], suffix: "" };
  const percentMatch = value.match(/^(.+)%$/);
  if (percentMatch) return { prefix: "", main: percentMatch[1], suffix: "%" };
  const monthMatch = value.match(/^(.+) bulan$/);
  if (monthMatch) return { prefix: "", main: monthMatch[1], suffix: "bulan" };
  return { prefix: "", main: value, suffix: "" };
}

export function FinancialAnalysisTiles({
  bepPerMonth,
  capex,
  paybackMonths,
  roi,
  capitalInvestment,
  monthlyRevenue,
  monthlyNetProfit,
  netProfit,
}: FinancialAnalysisTilesProps) {
  const values: Record<(typeof tiles)[number]["key"], { value: string; meta: string }> = {
    capex: { value: formatRupiah(capex), meta: `Modal ${formatRupiah(capitalInvestment)}` },
    bep: { value: formatRupiah(bepPerMonth), meta: `Omzet aktual ${formatRupiah(monthlyRevenue)}/bulan` },
    payback: {
      value: paybackMonths > 0 ? `${formatScore(paybackMonths)} bulan` : "Belum profit",
      meta: paybackMonths > 0 ? `Laba ${formatRupiah(monthlyNetProfit)}/bulan` : "Laba bersih belum positif",
    },
    roi: { value: `${formatScore(roi)}%`, meta: `Laba ${formatRupiah(netProfit)} dari Modal ${formatRupiah(capitalInvestment)}` },
  };

  return (
    <div className="financial-tiles">
      {tiles.map((tile) => {
        const { prefix, main, suffix } = splitValue(values[tile.key].value);
        return (
          <div className="financial-tiles__tile" key={tile.key} style={{ "--tile-color": tile.color } as CSSProperties}>
            <span className="financial-tiles__label">
              {tile.label}
              {tile.long && <em className="financial-tiles__expansion">({tile.long})</em>}
            </span>
            <strong className="financial-tiles__value">
              {prefix && <span className="financial-tiles__unit">{prefix}</span>}
              {main}
              {suffix && <span className="financial-tiles__unit">{suffix}</span>}
            </strong>
            <span className="financial-tiles__meta">{values[tile.key].meta}</span>
          </div>
        );
      })}
    </div>
  );
}
