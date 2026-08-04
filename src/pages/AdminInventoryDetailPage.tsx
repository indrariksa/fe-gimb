import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardShell } from "../components/organisms/DashboardShell";
import { Button } from "../components/atoms/Button";
import { Icon } from "../components/atoms/Icon";
import { LoadingState } from "../components/atoms/LoadingState";
import { inventoryFields } from "../data/inventoryFields";
import * as adminApi from "../services/api/admin";
import * as businessApi from "../services/api/businesses";
import { useAuth } from "../context/AuthContext";
import type { Business, InventorySubmission, User } from "../services/api/types";
import { formatJakartaDate } from "../utils/dateTime";
import { formatScore } from "../utils/number";

const inventoryValueKeyByFieldId: Record<string, keyof InventorySubmission> = {
  sixMonthRevenue: "six_month_revenue",
  sixMonthTransactions: "six_month_transactions",
  newCustomers: "new_customers",
  repeatCustomers: "repeat_customers",
  activeCustomers: "active_customers",
  cogs: "cogs",
  operationalCost: "operational_cost",
  salaryCost: "salary_cost",
  marketingCost: "marketing_cost",
  employeeCount: "employee_count",
  assetValue: "asset_value",
  capitalInvestment: "capital_investment",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value || 0);
}

function formatCurrency(value: number) {
  return `Rp ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value || 0)}`;
}

function formatCurrencyAmount(value: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value || 0);
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value || 0)}%`;
}

function formatInventoryValue(value: number, prefix?: string, suffix?: string) {
  if (prefix === "Rp") return formatCurrency(value);
  const formatted = formatNumber(value);
  return suffix ? `${formatted} ${suffix}` : formatted;
}

function shortValue(value: string, length = 10) {
  if (!value) return "-";
  return value.length > length ? `${value.slice(0, length)}...` : value;
}

export function AdminInventoryDetailPage() {
  const { businessId } = useParams();
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [submission, setSubmission] = useState<InventorySubmission | null>(null);
  const [submitter, setSubmitter] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const backPath = isAdmin ? "/admin#diagnoses" : "/businesses";

  useEffect(() => {
    let isMounted = true;

    async function loadInventoryDetail() {
      if (!businessId) return;
      setIsLoading(true);
      setError("");

      try {
        const getBusiness = isAdmin ? adminApi.adminBusiness : businessApi.getBusiness;
        const getLatestInventory = isAdmin ? adminApi.adminLatestBusinessInventory : businessApi.latestBusinessInventory;
        const [businessData, submissionData] = await Promise.all([
          getBusiness(businessId),
          getLatestInventory(businessId),
        ]);
        const submitterData = isAdmin
          ? (await adminApi.adminUsers({ limit: 100, offset: 0 })).items.find((item) => item.id === submissionData.user_id) ?? null
          : user;

        if (!isMounted) return;
        setBusiness(businessData);
        setSubmission(submissionData);
        setSubmitter(submitterData);
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : "Gagal memuat detail data inventarisasi");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadInventoryDetail();
    return () => {
      isMounted = false;
    };
  }, [businessId, isAdmin, user, reloadKey]);

  const fieldGroups = useMemo(() => {
    if (!submission) return [];
    return [
      {
        title: "Penjualan & Pelanggan",
        description: "Angka utama yang menggambarkan volume bisnis dan kualitas pelanggan.",
        fields: inventoryFields.slice(0, 5),
      },
      {
        title: "Biaya & Operasional",
        description: "Komponen biaya yang mempengaruhi margin, arus kas, dan efisiensi kerja.",
        fields: inventoryFields.slice(5, 10),
      },
      {
        title: "Aset & Modal",
        description: "Kapasitas aset dan modal yang menjadi fondasi pengembangan bisnis.",
        fields: inventoryFields.slice(10, 12),
      },
    ];
  }, [submission]);

  const metrics = submission?.analysis.metrics;
  const summaryCards = submission && metrics ? [
    { label: "Omzet 6 Bulan", value: formatCurrencyAmount(submission.six_month_revenue), prefix: "Rp", icon: "chart" as const },
    { label: "Total Transaksi", value: formatNumber(submission.six_month_transactions), icon: "grid" as const },
    { label: "Rata-rata Transaksi", value: formatCurrencyAmount(metrics.average_transaction_value), prefix: "Rp", icon: "file" as const },
    { label: "Estimasi Laba Bersih", value: formatCurrencyAmount(metrics.net_profit), prefix: "Rp", icon: "arrow" as const },
    { label: "Repeat Ratio", value: formatPercent(metrics.retention_rate), icon: "refresh" as const },
    { label: "Total Biaya", value: formatCurrencyAmount(metrics.total_expense), prefix: "Rp", icon: "settings" as const },
  ] : [];

  return (
    <DashboardShell activeView={isAdmin ? "adminDiagnosis" : "inventoryInput"} title="Detail Data Inventarisasi">
      <section className="admin-inventory-page">
        {isLoading && <LoadingState>Memuat detail data inventarisasi...</LoadingState>}
        {error && !isLoading && (
          <article className="panel empty-state retry-state">
            <span className="empty-state__icon"><Icon name="alert" /></span>
            <strong>{error}</strong>
            <Button className="btn--dashboard-hover" onClick={() => setReloadKey((current) => current + 1)}>
              Coba lagi <Icon name="refresh" size={18} />
            </Button>
            <Button variant="secondary" onClick={() => navigate(backPath)}>Kembali</Button>
          </article>
        )}

        {!isLoading && !error && submission && (
          <>
            <div className="admin-inventory-hero">
              <button type="button" className="admin-inventory-hero__back" onClick={() => navigate(backPath)}>
                <Icon name="arrow" size={18} />
                Kembali
              </button>
              <div className="admin-inventory-hero__content">
                <span>Data inventarisasi user</span>
                <h2>{business?.name || submission.business_name || "Detail Bisnis"}</h2>
                <p>
                  {business?.industry || "Tanpa industri"} · diinput {formatJakartaDate(submission.created_at)}
                  {submitter ? ` oleh ${submitter.full_name}` : ` oleh user ${shortValue(submission.user_id)}`}
                </p>
                {isAdmin && (
                  <Button className="btn--dashboard-hover" variant="secondary" onClick={() => navigate(`/admin/businesses/${businessId}/ai-report`)}>
                    Laporan AI <Icon name="bulb" size={18} />
                  </Button>
                )}
              </div>
              <div className="admin-inventory-hero__score">
                <span>Skor Kesehatan</span>
                <strong>{formatScore(submission.analysis.overall_score)}</strong>
                <b>{submission.analysis.status}</b>
              </div>
            </div>

            <div className="admin-inventory-summary">
              {summaryCards.map((card) => (
                <article className="panel" key={card.label}>
                  <span><Icon name={card.icon} size={22} /></span>
                  <div>
                    <small>{card.label}</small>
                    <strong className="admin-inventory-summary__value">
                      {card.prefix && <span>{card.prefix}</span>}
                      <b>{card.value}</b>
                    </strong>
                  </div>
                </article>
              ))}
            </div>

            <div className="admin-inventory-layout">
              <section className="panel admin-inventory-readout">
                <div className="admin-section__heading">
                  <div>
                    <h3>Rincian Input Inventarisasi</h3>
                    <p>Seluruh jawaban user ditampilkan sesuai urutan form agar mudah divalidasi.</p>
                  </div>
                </div>

                {fieldGroups.map((group) => (
                  <div className="admin-inventory-group" key={group.title}>
                    <div>
                      <h4>{group.title}</h4>
                      <p>{group.description}</p>
                    </div>
                    <div className="admin-inventory-values admin-inventory-values--page">
                      {group.fields.map((field) => {
                        const key = inventoryValueKeyByFieldId[field.id];
                        const value = Number(submission[key] ?? 0);
                        return (
                          <article key={field.id}>
                            <span>{field.label}</span>
                            <strong>{formatInventoryValue(value, field.prefix, field.suffix)}</strong>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </section>

              <aside className="admin-inventory-side">
                <article className="panel admin-inventory-note">
                  <span><Icon name="bulb" /></span>
                  <h3>Catatan User</h3>
                  <p>{submission.description || "User tidak menambahkan deskripsi masalah bisnis."}</p>
                </article>
                <article className="panel admin-inventory-note">
                  <span><Icon name="alert" /></span>
                  <h3>Prioritas Diagnosis</h3>
                  <ul>
                    {(submission.analysis.priority_issues?.length ? submission.analysis.priority_issues : ["Belum ada prioritas khusus."]).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
                <article className="panel admin-inventory-note">
                  <span><Icon name="check" /></span>
                  <h3>Kekuatan Utama</h3>
                  <ul>
                    {(submission.analysis.strengths?.length ? submission.analysis.strengths : ["Belum ada kekuatan khusus."]).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              </aside>
            </div>
          </>
        )}
      </section>
    </DashboardShell>
  );
}
