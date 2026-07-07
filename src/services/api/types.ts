export type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data?: T;
  error?: unknown;
};

export type UserRole = "admin" | "user";
export type UserStatus = "active" | "inactive" | "suspended";

export type User = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
};

export type AuthResponse = {
  user: User;
  access_token: string;
  refresh_token: string;
  access_token_expires_at: string;
  refresh_token_expires_at: string;
};

export type PaginationMeta = {
  limit: number;
  offset: number;
  count: number;
  total: number;
  page: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
};

export type ListResponse<T> = {
  items: T[];
  meta: PaginationMeta;
};

export type Business = {
  id: string;
  public_id: string;
  owner_id: string;
  name: string;
  industry: string;
  description: string;
  created_at: string;
  updated_at: string;
};

export type BusinessLimitSetting = {
  key: "business_limit_per_user";
  value: number;
};

export type HealthSubScores = {
  profitability: number;
  cashflow: number;
  marketing: number;
  retention: number;
  operational: number;
  hr: number;
};

export type HealthMetrics = {
  gross_profit: number;
  net_profit: number;
  total_expense: number;
  gross_margin: number;
  net_margin: number;
  cashflow_ratio: number;
  average_transaction_value: number;
  customer_acquisition_cost: number;
  marketing_efficiency: number;
  marketing_ratio: number;
  retention_rate: number;
  repeat_to_new_ratio: number;
  operational_ratio: number;
  revenue_per_employee: number;
  salary_per_employee: number;
  salary_ratio: number;
  productivity_ratio: number;
};

export type BusinessHealthAnalysis = {
  overall_score: number;
  status: string;
  sub_scores: HealthSubScores;
  metrics: HealthMetrics;
  priority_issues: string[];
  strengths: string[];
  recommendations: string[];
  confidence_score: number;
  data_quality: string;
};

export type InventorySubmission = {
  id: string;
  public_id: string;
  user_id: string;
  business_id: string | null;
  business_name: string;
  six_month_revenue: number;
  six_month_transactions: number;
  new_customers: number;
  repeat_customers: number;
  active_customers: number;
  cogs: number;
  operational_cost: number;
  salary_cost: number;
  marketing_cost: number;
  employee_count: number;
  asset_value: number;
  capital_investment: number;
  description: string;
  analysis: BusinessHealthAnalysis;
  created_at: string;
};

export type InventoryPayload = {
  six_month_revenue: number;
  six_month_transactions: number;
  new_customers: number;
  repeat_customers: number;
  active_customers: number;
  cogs: number;
  operational_cost: number;
  salary_cost: number;
  marketing_cost: number;
  employee_count: number;
  asset_value: number;
  capital_investment: number;
  description: string;
};

export type AdminSummary = {
  users: number;
  businesses: number;
  inventory_submissions: number;
  active_users: number;
  suspended_users: number;
};

export type AuditLog = {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  ip_address: string;
  user_agent: string;
  metadata: Record<string, unknown>;
  created_at: string;
};
