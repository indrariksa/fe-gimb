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
  has_password: boolean;
  has_google: boolean;
  email_verified: boolean;
  google_linked_at?: string | null;
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

export type EmailVerificationPolicy = {
  verification_ttl_seconds: number;
  resend_cooldown_seconds: number;
};

export type EmailVerificationCooldownError = {
  retry_after_seconds?: number;
};

export type ChangePasswordPayload = {
  current_password: string;
  new_password: string;
  confirm_password: string;
};

export type UpdateProfilePayload = {
  full_name: string;
};

export type RegisterResponse = EmailVerificationPolicy & {
  user: User;
};

export type SetupPasswordPayload = {
  new_password: string;
  confirm_password: string;
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
  action_plan?: BusinessActionPlan[];
  confidence_score: number;
  data_quality: string;
};

export type BusinessActionPlan = {
  period: string;
  title: string;
  description: string;
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

export type AdminAnalyticsResponse = {
  charts: AIReportChartData[];
};

export type AuditLog = {
  id: string;
  actor_id: string | null;
  actor_name?: string;
  actor_email?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_label?: string;
  level?: "info" | "warning" | "error";
  service?: string;
  endpoint?: string;
  message?: string;
  status_code?: number;
  duration_ms?: number;
  ip_address: string;
  user_agent: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AdminNotification = {
  id: string;
  type: "inventory_submitted" | string;
  title: string;
  message: string;
  actor_id: string | null;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

export type NotificationEvent = {
  type: "notification.created";
  notification: AdminNotification;
};

export type AIReportStatus = "processing" | "ready" | "failed";

export type AIReportScoreDriver = {
  factor: string;
  effect: string;
};

export type AIReportAlternativeSolution = {
  title: string;
  description: string;
  trade_off: string;
};

export type AIReportSubScoreAnalysis = {
  dimension: string;
  title: string;
  score: number;
  narrative: string;
  score_drivers: AIReportScoreDriver[];
  alternative_solutions: AIReportAlternativeSolution[];
};

export type AIReportRiskAssessment = {
  narrative: string;
  level: string;
};

export type AIReportFinancialAnalysis = {
  // null on reports generated before this field existed (old `narrative` string field).
  points: string[] | null;
  bep_per_month: number;
  capex: number;
  payback_months: number;
  roi: number;
  capital_investment: number;
  monthly_revenue: number;
  monthly_net_profit: number;
  net_profit: number;
};

export type AIReportChartSeries = {
  name: string;
  values: number[];
};

export type AIReportChartData = {
  id: string;
  type: "bar" | "line" | "radar" | "pie" | "gauge" | "doughnut";
  title: string;
  unit?: string;
  labels: string[];
  series: AIReportChartSeries[];
};

export type AIReportContent = {
  meta: {
    generated_at: string;
    model: string;
    scoring_version: string;
    disclaimer: string;
  };
  executive_summary: string;
  business_profile: { narrative: string };
  sub_score_analysis: AIReportSubScoreAnalysis[];
  // Optional: reports generated before this field was added won't have it.
  key_strengths?: { narrative: string };
  risk_assessment: AIReportRiskAssessment;
  // Optional: reports generated before this field was added won't have it.
  financial_analysis?: AIReportFinancialAnalysis;
  recommendations: string[];
  conclusion: string;
  charts: AIReportChartData[];
};

export type AIReport = {
  submission_id: string;
  status: AIReportStatus;
  model: string;
  report: AIReportContent | null;
  error_message?: string;
  created_at: string;
  updated_at: string;
};
