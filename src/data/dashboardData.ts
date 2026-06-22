export const scoreCards = [
  { label: "Profitabilitas", score: 55, status: "Cukup", tone: "warning", icon: "$" },
  { label: "Cashflow", score: 40, status: "Buruk", tone: "danger", icon: "↯" },
  { label: "Marketing", score: 65, status: "Sehat", tone: "success", icon: "↗" },
  { label: "Retensi Pelanggan", score: 72, status: "Sehat", tone: "success", icon: "☷" },
  { label: "Operasional", score: 58, status: "Cukup", tone: "warning", icon: "▣" },
  { label: "SDM", score: 48, status: "Cukup", tone: "warning", icon: "♙" },
] as const;

export const trend = [
  { month: "Jan", value: 31 },
  { month: "Feb", value: 37 },
  { month: "Mar", value: 35 },
  { month: "Apr", value: 45 },
  { month: "Mei", value: 50 },
  { month: "Jun", value: 54 },
];
