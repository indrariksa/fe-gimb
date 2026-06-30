import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/atoms/Button";
import { Icon } from "../components/atoms/Icon";
import { TextField } from "../components/atoms/TextField";
import { DashboardShell } from "../components/organisms/DashboardShell";
import { inventoryFields } from "../data/inventoryFields";
import * as businessApi from "../services/api/businesses";
import type { Business, InventoryPayload } from "../services/api/types";

const storageKeyPrefix = "gimb:sbd:inventory";

const payloadKeys: Array<keyof InventoryPayload> = [
  "six_month_revenue",
  "six_month_transactions",
  "new_customers",
  "repeat_customers",
  "active_customers",
  "cogs",
  "operational_cost",
  "salary_cost",
  "marketing_cost",
  "employee_count",
  "asset_value",
  "capital_investment",
];

const fieldToPayloadKey: Record<string, keyof InventoryPayload> = {
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
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildPayload(values: Record<string, string>): InventoryPayload {
  const payload = payloadKeys.reduce((current, key) => ({ ...current, [key]: 0 }), {} as InventoryPayload);
  for (const [fieldId, payloadKey] of Object.entries(fieldToPayloadKey)) {
    payload[payloadKey] = toNumber(values[fieldId]);
  }
  payload.description = values.description ?? "";
  return payload;
}

export function InventoryPage() {
  const navigate = useNavigate();
  const { businessId = "" } = useParams();
  const [business, setBusiness] = useState<Business | null>(null);
  const [values, setValues] = useState<Record<string, string>>(() => readDraft(businessId));
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const completed = inventoryFields.filter((field) => values[field.id]).length;
  const progress = Math.round((completed / inventoryFields.length) * 100);

  useEffect(() => {
    if (businessId) localStorage.setItem(storageKey(businessId), JSON.stringify(values));
  }, [businessId, values]);

  useEffect(() => {
    let isMounted = true;
    async function loadBusiness() {
      try {
        const detail = await businessApi.getBusiness(businessId);
        if (isMounted) setBusiness(detail);
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : "Gagal memuat toko");
      }
    }
    if (businessId) loadBusiness();
    return () => {
      isMounted = false;
    };
  }, [businessId]);

  const submitInventory = async () => {
    setError("");
    setIsSubmitting(true);
    try {
      await businessApi.createBusinessInventory(businessId, buildPayload(values));
      localStorage.removeItem(storageKey(businessId));
      navigate(`/businesses/${businessId}/analysis`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan inventarisasi");
    } finally {
      setIsConfirmOpen(false);
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardShell activeView="inventory" title="Input Inventarisasi Masalah">
      <section className="inventory-page">
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
                  type="number"
                  min="0"
                  inputMode="numeric"
                  placeholder="0"
                  value={values[field.id] ?? ""}
                  onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value }))}
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
              <Button variant="secondary" onClick={() => navigate(`/businesses/${businessId}/dashboard`)}>Batal</Button>
              <Button onClick={() => setIsConfirmOpen(true)} disabled={isSubmitting}>Simpan & Lanjutkan <Icon name="arrow" size={18} /></Button>
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
              <Button variant="secondary" onClick={() => setIsConfirmOpen(false)} disabled={isSubmitting}>Tidak</Button>
              <Button onClick={submitInventory} disabled={isSubmitting}>{isSubmitting ? "Menyimpan..." : "Ya, Lanjutkan"}</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
