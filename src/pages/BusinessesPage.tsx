import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/atoms/Button";
import { Icon } from "../components/atoms/Icon";
import { DashboardShell } from "../components/organisms/DashboardShell";
import { useAuth } from "../context/AuthContext";
import * as businessApi from "../services/api/businesses";
import { getFriendlyApiError } from "../services/api/client";
import type { Business } from "../services/api/types";
import { cleanText, firstValidationError, validateMaxLength, validateRequiredText } from "../utils/formValidation";

const industryOptions = [
  "Retail",
  "Grosir",
  "Toko Kelontong",
  "Minimarket",
  "Kuliner / F&B",
  "Kafe",
  "Restoran",
  "Catering",
  "Bakery",
  "Fashion",
  "Konveksi",
  "Kecantikan",
  "Barbershop / Salon",
  "Kesehatan",
  "Apotek",
  "Pendidikan",
  "Kursus / Pelatihan",
  "Jasa Profesional",
  "Jasa Reparasi",
  "Jasa Kebersihan",
  "Laundry",
  "Travel / Pariwisata",
  "Transportasi / Logistik",
  "Properti",
  "Konstruksi",
  "Manufaktur / Produksi",
  "Percetakan",
  "Pertanian",
  "Peternakan",
  "Perikanan",
  "Digital / Online",
  "E-commerce",
  "Teknologi / Software",
  "Kreatif / Desain",
  "Media / Konten",
  "Event Organizer",
  "Otomotif",
  "Elektronik",
  "Furniture",
  "Kerajinan",
  "Keuangan / Koperasi",
  "Lainnya",
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export function BusinessesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [completedBusinessIds, setCompletedBusinessIds] = useState<Set<string>>(() => new Set());
  const [businessLimit, setBusinessLimit] = useState(2);
  const [form, setForm] = useState({ name: "", industry: "", description: "" });
  const [industrySearch, setIndustrySearch] = useState("");
  const [isIndustryOpen, setIsIndustryOpen] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const loadBusinesses = async () => {
    setIsLoading(true);
    try {
      const [response, limitSetting] = await Promise.all([
        businessApi.listBusinesses(),
        businessApi.getBusinessLimit(),
      ]);
      setBusinesses(response.items);
      setBusinessLimit(limitSetting.value);
      const completedIds = await Promise.all(
        response.items.map(async (business) => {
          try {
            await businessApi.latestBusinessInventory(business.public_id);
            return business.public_id;
          } catch {
            return null;
          }
        }),
      );
      setCompletedBusinessIds(new Set(completedIds.filter((id): id is string => Boolean(id))));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat toko");
    } finally {
      setIsLoading(false);
    }
  };

  const hasReachedLimit = businesses.length >= businessLimit;
  const needInputCount = Math.max(0, businesses.length - completedBusinessIds.size);
  const diagnosisStatus = businesses.length === 0 ? "Belum mulai" : needInputCount === 0 ? "Lengkap" : "Belum lengkap";
  const isDiagnosisComplete = businesses.length > 0 && needInputCount === 0;
  const normalizedIndustrySearch = industrySearch.toLowerCase().trim();
  const filteredIndustries = industryOptions.filter((industry) => industry.toLowerCase().includes(normalizedIndustrySearch));
  const canUseCustomIndustry = Boolean(
    industrySearch.trim() &&
    !industryOptions.some((industry) => industry.toLowerCase() === normalizedIndustrySearch),
  );

  useEffect(() => {
    loadBusinesses();
  }, []);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    const cleanedForm = {
      name: cleanText(form.name),
      industry: cleanText(form.industry),
      description: cleanText(form.description),
    };
    const validationError = firstValidationError([
      validateRequiredText(cleanedForm.name, "Nama toko"),
      validateRequiredText(cleanedForm.industry, "Industri"),
      validateMaxLength(cleanedForm.description, "Deskripsi", 500),
    ]);

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsCreating(true);
    try {
      const business = await businessApi.createBusiness(cleanedForm);
      setBusinesses((current) => [business, ...current]);
      setCompletedBusinessIds((current) => {
        const next = new Set(current);
        next.delete(business.public_id);
        return next;
      });
      navigate(`/businesses/${business.public_id}/inventory/new`);
    } catch (err) {
      setError(getFriendlyApiError(err, "Gagal membuat toko"));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <DashboardShell activeView="businesses" title="Pilih Toko">
      <section className="business-page">
        <div className="business-hero">
          <div>
            <span>Workspace Bisnis</span>
            <h2>Pilih toko yang ingin dianalisis</h2>
            <p>Halo {user?.full_name ?? "Owner"}, setiap toko punya riwayat inventarisasi, skor kesehatan, dan rekomendasi yang terpisah.</p>
          </div>
          <Button
            disabled={hasReachedLimit}
            title={hasReachedLimit ? "Batas toko sudah tercapai" : "Tambah toko baru"}
            onClick={() => document.getElementById("business-create-form")?.scrollIntoView({ behavior: "smooth", block: "center" })}
          >
            {hasReachedLimit ? "Limit Tercapai" : "Tambah Toko"} <Icon name="arrow" size={18} />
          </Button>
        </div>

        <div className="business-summary">
          <article>
            <span>Total toko</span>
            <strong>{businesses.length} dari {businessLimit}</strong>
          </article>
          <article>
            <span>Perlu input</span>
            <strong>{needInputCount}</strong>
          </article>
          <article>
            <span>Sudah ada hasil</span>
            <strong>{completedBusinessIds.size}</strong>
          </article>
          <article>
            <span>Status diagnosis</span>
            <strong className={isDiagnosisComplete ? "is-good" : "is-warning"}>{diagnosisStatus}</strong>
          </article>
        </div>

        <div className="business-layout">
          <div className="business-list">
            {isLoading && <article className="panel empty-state">Memuat toko...</article>}
            {!isLoading && businesses.length === 0 && (
              <article className="panel empty-state business-empty">
                <span><Icon name="home" /></span>
                <h3>Belum ada toko</h3>
                <p>Buat toko pertama untuk mulai mengisi inventarisasi dan melihat dashboard diagnosis.</p>
              </article>
            )}
            {businesses.map((business) => {
              const hasDiagnosis = completedBusinessIds.has(business.public_id);

              return (
                <article className={`business-card panel ${hasDiagnosis ? "is-complete" : ""}`} key={business.public_id}>
                  <span className="business-card__mark">{business.name.slice(0, 1).toUpperCase()}</span>
                  <div>
                    <span>{business.industry || "Bisnis"} · dibuat {formatDate(business.created_at)}</span>
                    <h3>{business.name}</h3>
                    <p>{business.description || "Belum ada deskripsi toko."}</p>
                  </div>
                  <div className="business-card__actions">
                    <Button
                      variant="secondary"
                      disabled={hasDiagnosis}
                      title={hasDiagnosis ? "Inventory toko ini sudah diisi" : "Input data inventory"}
                      onClick={() => navigate(`/businesses/${business.public_id}/inventory/new`)}
                    >
                      {hasDiagnosis ? "Sudah Diisi" : "Input Data"}
                    </Button>
                    <Button
                      className="btn--shiny-dashboard"
                      disabled={!hasDiagnosis}
                      title={hasDiagnosis ? "Buka dashboard diagnosis" : "Isi inventory dulu untuk membuka dashboard"}
                      onClick={() => navigate(`/businesses/${business.public_id}/dashboard`)}
                    >
                      Dashboard <Icon name="arrow" size={18} />
                    </Button>
                  </div>
                  {hasDiagnosis ? (
                    <small className="business-card__notice">Inventory sudah diisi. Lanjutkan dengan melihat hasil dashboard.</small>
                  ) : (
                    <small className="business-card__notice business-card__notice--pending">Inventory belum diisi. Mulai input data untuk membuka dashboard.</small>
                  )}
                </article>
              );
            })}
          </div>

          <form id="business-create-form" className="business-form panel" onSubmit={create}>
            <span className="business-form__icon"><Icon name="home" /></span>
            <h3>{hasReachedLimit ? "Batas toko tercapai" : "Tambah toko baru"}</h3>
            <p>
              {hasReachedLimit
                ? `Akun ini sudah memiliki ${businesses.length} dari ${businessLimit} toko yang diperbolehkan. Hubungi admin untuk menambah limit.`
                : "Gunakan nama yang mudah dikenali agar tidak tertukar saat bisnis sudah bertambah."}
            </p>
            <label><span>Nama toko</span><input required disabled={hasReachedLimit} placeholder="Contoh: Toko Maju Jaya" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label>
            <label className="industry-combobox">
              <span>Industri</span>
              <input
                required
                disabled={hasReachedLimit}
                placeholder="Cari atau pilih industri"
                value={isIndustryOpen ? industrySearch : form.industry}
                onFocus={() => {
                  setIndustrySearch(form.industry);
                  setIsIndustryOpen(true);
                }}
                onBlur={() => {
                  window.setTimeout(() => {
                    setIndustrySearch("");
                    setIsIndustryOpen(false);
                  }, 120);
                }}
                onChange={(event) => {
                  setIndustrySearch(event.target.value);
                  setForm((current) => ({ ...current, industry: event.target.value }));
                  setIsIndustryOpen(true);
                }}
              />
              {isIndustryOpen && !hasReachedLimit && (
                <div className="industry-combobox__menu">
                  {canUseCustomIndustry && (
                    <button
                      type="button"
                      className="industry-combobox__custom"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setForm((current) => ({ ...current, industry: industrySearch.trim() }));
                        setIndustrySearch("");
                        setIsIndustryOpen(false);
                      }}
                    >
                      Gunakan "{industrySearch.trim()}"
                    </button>
                  )}
                  {filteredIndustries.map((industry) => (
                    <button
                      type="button"
                      key={industry}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setForm((current) => ({ ...current, industry }));
                        setIndustrySearch("");
                        setIsIndustryOpen(false);
                      }}
                    >
                      {industry}
                    </button>
                  ))}
                </div>
              )}
            </label>
            <label><span>Deskripsi</span><textarea disabled={hasReachedLimit} placeholder="Contoh: Toko kebutuhan harian dan produk rumah tangga" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></label>
            {error && <p className="form-error">{error}</p>}
            <Button type="submit" disabled={isCreating || hasReachedLimit}>{isCreating ? "Menyimpan..." : hasReachedLimit ? "Tidak Ada Slot" : "Buat Toko"}</Button>
          </form>
        </div>
      </section>
    </DashboardShell>
  );
}
