export type View = "landing" | "businesses" | "score" | "dashboard" | "subscores" | "inventoryInput" | "inventory" | "aiReport" | "settings" | "adminSummary" | "adminDiagnosis" | "adminLimit" | "adminUsers" | "adminAuditLog";

export type ThemeSettings = {
  appName: string;
  businessName: string;
  ownerName: string;
  mode: "light" | "dark";
  primaryColor: string;
  accentColor: string;
  successColor: string;
  warningColor: string;
};

export type InventoryField = {
  id: string;
  label: string;
  suffix?: string;
  prefix?: string;
  note: string;
  example?: string;
};
