import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/atoms/Button";
import { Icon } from "../components/atoms/Icon";
import { TextField } from "../components/atoms/TextField";
import { DashboardShell } from "../components/organisms/DashboardShell";
import { inventoryFields } from "../data/inventoryFields";
import * as businessApi from "../services/api/businesses";
import { getFriendlyApiError } from "../services/api/client";
import type { Business, InventoryPayload } from "../services/api/types";
import { cleanText, firstValidationError, validateMaxLength } from "../utils/formValidation";

const storageKeyPrefix = "gimb:sbd:inventory";

type NumericInventoryPayloadKey = Exclude<keyof InventoryPayload, "description">;

const fieldToPayloadKey: Record<string, NumericInventoryPayloadKey> = {
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

function storageKey(businessId: string) {
  return `${storageKeyPrefix}:${businessId}`;
}

function readDraft(businessId: string) {
  if (!businessId) return {};
  const saved = localStorage.getItem(storageKey(businessId));
  if (!saved) return {};
  try {
    return JSON.parse(saved) as Record<string, string>;
  } catch {
    return {};
  }
}

function toNumber(value: string | undefined) {
  const parsed = Number((value ?? "0").replace(/\D/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function formatNumberInput(value: string | undefined) {
  const digits = digitsOnly(value ?? "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function buildPayload(values: Record<string, string>): InventoryPayload {
  const payload: InventoryPayload = {
    six_month_revenue: 0,
    six_month_transactions: 0,
    new_customers: 0,
    repeat_customers: 0,
    active_customers: 0,
    cogs: 0,
    operational_cost: 0,
    salary_cost: 0,
    marketing_cost: 0,
    employee_count: 0,
    asset_value: 0,
    capital_investment: 0,
    description: "",
  };

  for (const [fieldId, payloadKey] of Object.entries(fieldToPayloadKey)) {
    payload[payloadKey] = toNumber(values[fieldId]);
  }
  payload.description = cleanText(values.description ?? "");
  return payload;
}

function validateInventoryPayload(payload: InventoryPayload) {
  return firstValidationError([
    payload.six_month_revenue <= 0 ? "Total omzet 6 bulan wajib lebih dari 0." : "",
    payload.six_month_transactions <= 0 ? "Total transaksi 6 bulan wajib lebih dari 0." : "",
    payload.new_customers < 0 || payload.repeat_customers < 0 || payload.active_customers < 0
      ? "Jumlah pelanggan tidak boleh bernilai negatif."
      : "",
    validateMaxLength(payload.description, "Deskripsi masalah", 1000),
  ]);
}

export function InventoryPage() {
  const navigate = useNavigate();
  const { businessId = "" } = useParams();
  const [business, setBusiness] = useState<Business | null>(null);
  const [values, setValues] = useState<Record<string, string>>(() => readDraft(businessId));
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [error, setError] = useState("");
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const completed = inventoryFields.filter((field) => values[field.id]).length;
  const progress = Math.round((completed / inventoryFields.length) * 100);

  useEffect(() => {
    if (businessId) localStorage.setItem(storageKey(businessId), JSON.stringify(values));
  }, [businessId, values]);

  useEffect(() => {
    let isMounted = true;
    async function loadBusiness() {
      setIsCheckingAccess(true);
      try {
        const [detail, latestSubmission] = await Promise.all([
          businessApi.getBusiness(businessId),
          businessApi.latestBusinessInventory(businessId).catch(() => null),
        ]);

        if (!isMounted) return;
        if (latestSubmission) {
          localStorage.removeItem(storageKey(businessId));
          navigate(`/businesses/${businessId}/dashboard`, { replace: true });
          return;
        }

        setBusiness(detail);
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : "Gagal memuat toko");
      } finally {
        if (isMounted) setIsCheckingAccess(false);
      }
    }
    if (businessId) loadBusiness();
    return () => {
      isMounted = false;
    };
  }, [businessId, navigate]);

  const submitInventory = async () => {
    setError("");
    const payload = buildPayload(values);
    const validationError = validateInventoryPayload(payload);
    if (validationError) {
      setError(validationError);
      setIsConfirmOpen(false);
      return;
    }

    setIsSubmitting(true);
    try {
      await businessApi.createBusinessInventory(businessId, payload);
      localStorage.removeItem(storageKey(businessId));
      navigate(`/businesses/${businessId}/analysis`);
    } catch (err) {
      setError(getFriendlyApiError(err, "Gagal menyimpan inventarisasi"));
    } finally {
      setIsConfirmOpen(false);
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardShell activeView="inventory" title="Input Inventarisasi Masalah">
      <section className="inventory-page">
        {isCheckingAccess ? (
          <article className="panel empty-state">Memeriksa status inventarisasi...</article>
        ) : (
        <>
        <div className="form-hero">
          <h2>Lengkapi data bisnis 6 bulan terakhir</h2>
          <p>{business?.name ?? "Toko"} - setiap angka akan dipakai sebagai bahan diagnosis kesehatan bisnis yang lebih komprehensif.</p>
        </div>

        <div className="inventory-layout">
          <form className="inventory-form" onSubmit={(event) => event.preventDefault()}>
            <header>
              <Icon name="chart" />
              <h3>Data Keuangan & Operasional</h3>
            </header>
            <div className="inventory-form__grid">
              {inventoryFields.map((field) => (
                <TextField
                  key={field.id}
                  label={field.label}
                  prefix={field.prefix}
                  suffix={field.suffix}
                  note={field.note}
                  example={field.example}
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={formatNumberInput(values[field.id])}
                  onChange={(event) => setValues((current) => ({ ...current, [field.id]: digitsOnly(event.target.value) }))}
              />
            ))}
            </div>
            {error && <p className="form-error">{error}</p>}
            <label className="field field--wide">
              <span className="field__label">Deskripsi masalah bisnis lainnya</span>
              <textarea
                maxLength={1000}
                placeholder="Ceritakan kendala atau tantangan spesifik yang sedang dihadapi bisnis Anda..."
                value={values.description ?? ""}
                onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
              />
              <small>Maksimal 1000 karakter. Informasi ini membantu mentor memberikan rekomendasi yang lebih tajam.</small>
            </label>
            <footer>
              <Button className="btn--dashboard-hover" variant="secondary" onClick={() => navigate(`/businesses/${businessId}/dashboard`)}>Batal</Button>
              <Button className="btn--shiny-dashboard" onClick={() => setIsConfirmOpen(true)} disabled={isSubmitting}>Simpan & Lanjutkan <Icon name="arrow" size={18} /></Button>
            </footer>
          </form>

          <aside className="form-aside">
            <article className="tips-card">
              <span><Icon name="bulb" /></span>
              <h3>Tips Input Akurat</h3>
              <p>Gunakan rekap laporan laba rugi dan catatan transaksi 6 bulan terakhir agar validitas skor lebih kuat.</p>
            </article>
            <article className="progress-card">
              <div>
                <span>Progress</span>
                <strong>{progress}% Complete</strong>
              </div>
              <div className="meter"><i style={{ width: `${progress}%` }} /></div>
              <ul>
                <li className="done">Identitas Bisnis</li>
                <li className="active">Inventarisasi Masalah</li>
                <li>Diagnosis & Skor</li>
              </ul>
            </article>
          </aside>
        </div>
        </>
        )}
      </section>

      {isConfirmOpen && (
        <div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <div className="confirm-dialog__card">
            <span className="confirm-dialog__icon">
              <Icon name="alert" size={34} />
            </span>
            <h2 id="confirm-title">Data yang diinput sudah benar?</h2>
            <p>Pastikan angka dan informasi bisnis sudah sesuai sebelum sistem mulai melakukan analisis.</p>
            <div className="confirm-dialog__actions">
              <Button className="btn--dashboard-hover" variant="secondary" onClick={() => setIsConfirmOpen(false)} disabled={isSubmitting}>Tidak</Button>
              <Button className="btn--shiny-dashboard" onClick={submitInventory} disabled={isSubmitting}>{isSubmitting ? "Menyimpan..." : "Ya, Lanjutkan"}</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
