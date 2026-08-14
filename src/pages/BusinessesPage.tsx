import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/atoms/Button";
import { Icon } from "../components/atoms/Icon";
import { HolographicCard } from "../components/molecules/HolographicCard";
import { DashboardShell } from "../components/organisms/DashboardShell";
import { useAuth } from "../context/AuthContext";
import * as businessApi from "../services/api/businesses";
import { getFriendlyApiError } from "../services/api/client";
import type { Business } from "../services/api/types";
import { formatJakartaDate } from "../utils/dateTime";
import { cleanText, firstValidationError, validateMaxLength, validateRequiredText } from "../utils/formValidation";

// Daftar tertutup 10 kategori usaha + fallback, harus sama persis dengan
// domain.IndustryCategories di be-gimb (internal/domain/scoring.go).
const industryOptions = [
  "Retail & Perdagangan",
  "Kuliner & F&B",
  "Produksi & Industri Rumahan",
  "Jasa",
  "Fashion & Apparel",
  "Kecantikan & Personal Care",
  "Transportasi & Logistik",
  "Pendidikan & Pelatihan",
  "Properti & Konstruksi",
  "Digital & Kreatif",
  "Lainnya/Belum Dikategorikan",
];

export function BusinessesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [completedBusinessIds, setCompletedBusinessIds] = useState<Set<string>>(() => new Set());
  const [lockedBusinessIds, setLockedBusinessIds] = useState<Set<string>>(() => new Set());
  const [businessLimit, setBusinessLimit] = useState(2);
  const [form, setForm] = useState({ name: "", industry: "", description: "" });
  const [isIndustryOpen, setIsIndustryOpen] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const loadBusinesses = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const [response, limitSetting] = await Promise.all([
        businessApi.listBusinesses(),
        businessApi.getBusinessLimit(),
      ]);
      setBusinesses(response.items);
      setBusinessLimit(limitSetting.value);
      const statuses = await Promise.all(
        response.items.map(async (business) => {
          try {
            await businessApi.latestBusinessInventory(business.public_id);
          } catch {
            return { id: business.public_id, hasDiagnosis: false, isLocked: false };
          }
          const report = await businessApi.getBusinessAIReport(business.public_id).catch(() => null);
          const isLocked = report ? report.status === "processing" || report.status === "ready" : false;
          return { id: business.public_id, hasDiagnosis: true, isLocked };
        }),
      );
      setCompletedBusinessIds(new Set(statuses.filter((item) => item.hasDiagnosis).map((item) => item.id)));
      setLockedBusinessIds(new Set(statuses.filter((item) => item.isLocked).map((item) => item.id)));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Gagal memuat usaha");
    } finally {
      setIsLoading(false);
    }
  };

  const hasReachedLimit = businesses.length >= businessLimit;
  const needInputCount = Math.max(0, businesses.length - completedBusinessIds.size);
  const diagnosisStatus = businesses.length === 0 ? "Belum mulai" : needInputCount === 0 ? "Lengkap" : "Belum lengkap";
  const isDiagnosisComplete = businesses.length > 0 && needInputCount === 0;
  useEffect(() => {
    loadBusinesses();
  }, [reloadKey]);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    const cleanedForm = {
      name: cleanText(form.name),
      industry: cleanText(form.industry),
      description: cleanText(form.description),
    };
    const validationError = firstValidationError([
      validateRequiredText(cleanedForm.name, "Nama usaha"),
      validateRequiredText(cleanedForm.industry, "Jenis usaha"),
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
      setError(getFriendlyApiError(err, "Gagal membuat usaha"));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <DashboardShell activeView="businesses" title="Pilih Usaha">
      <section className="business-page">
        <div className="business-hero">
          <div>
            <span>Workspace Bisnis</span>
            <h2>Pilih usaha yang ingin dianalisis</h2>
            <p>Halo {user?.full_name ?? "Owner"}, setiap usaha punya riwayat inventarisasi, skor kesehatan, dan rekomendasi yang terpisah.</p>
          </div>
          <Button
            className="btn--dashboard-hover"
            disabled={hasReachedLimit}
            title={hasReachedLimit ? "Batas usaha sudah tercapai" : "Tambah usaha baru"}
            onClick={() => document.getElementById("business-create-form")?.scrollIntoView({ behavior: "smooth", block: "center" })}
          >
            {hasReachedLimit ? "Limit Tercapai" : "Tambah Usaha"} <Icon name="arrow" size={18} />
          </Button>
        </div>

        <div className="business-summary">
          <HolographicCard>
            <span>Total usaha</span>
            {isLoading ? <i className="skeleton-bar" /> : <strong>{businesses.length} dari {businessLimit}</strong>}
          </HolographicCard>
          <HolographicCard>
            <span>Perlu input</span>
            {isLoading ? <i className="skeleton-bar" /> : <strong>{needInputCount}</strong>}
          </HolographicCard>
          <HolographicCard>
            <span>Sudah ada hasil</span>
            {isLoading ? <i className="skeleton-bar" /> : <strong>{completedBusinessIds.size}</strong>}
          </HolographicCard>
          <HolographicCard>
            <span>Status diagnosis</span>
            {isLoading ? <i className="skeleton-bar" /> : <strong className={isDiagnosisComplete ? "is-good" : "is-warning"}>{diagnosisStatus}</strong>}
          </HolographicCard>
        </div>

        <div className="business-layout">
          <div className="business-list">
            {isLoading && [0, 1, 2].map((key) => (
              <article className="business-card panel business-card--skeleton" key={key}>
                <span className="business-card__mark"><i className="skeleton-bar skeleton-bar--mark" /></span>
                <div>
                  <i className="skeleton-bar skeleton-bar--tag" />
                  <i className="skeleton-bar skeleton-bar--title" />
                  <i className="skeleton-bar skeleton-bar--desc" />
                </div>
                <div className="business-card__actions">
                  <i className="skeleton-bar skeleton-bar--btn" />
                </div>
              </article>
            ))}
            {!isLoading && loadError && (
              <article className="panel empty-state retry-state">
                <span>{loadError}</span>
                <Button className="btn--dashboard-hover" onClick={() => setReloadKey((current) => current + 1)}>
                  Coba lagi <Icon name="refresh" size={18} />
                </Button>
              </article>
            )}
            {!isLoading && !loadError && businesses.length === 0 && (
              <article className="panel empty-state business-empty">
                <span><Icon name="home" /></span>
                <h3>Belum ada usaha</h3>
                <p>Buat usaha pertama untuk mulai mengisi inventarisasi dan melihat hasil sub skor diagnosis.</p>
              </article>
            )}
            {!isLoading && !loadError && businesses.map((business) => {
              const hasDiagnosis = completedBusinessIds.has(business.public_id);
              const isLocked = lockedBusinessIds.has(business.public_id);

              return (
                <article className={`business-card panel ${hasDiagnosis ? "is-complete" : ""}`} key={business.public_id}>
                  <span className="business-card__mark">{business.name.slice(0, 1).toUpperCase()}</span>
                  <div>
                    <span>{business.industry || "Bisnis"} · dibuat {formatJakartaDate(business.created_at, "short")}</span>
                    <h3>{business.name}</h3>
                    <p>{business.description || "Belum ada deskripsi usaha."}</p>
                  </div>
                  <div className="business-card__actions">
                    {hasDiagnosis ? (
                      <>
                        <Button
                          className="btn--shiny-dashboard"
                          title="Buka hasil sub skor diagnosis"
                          onClick={() => navigate(`/businesses/${business.public_id}/sub-scores`)}
                        >
                          Sub Skor <Icon name="arrow" size={14} />
                        </Button>
                        <Button
                          className="btn--dashboard-hover"
                          variant="secondary"
                          title="Lihat detail data inventarisasi"
                          onClick={() => navigate(`/businesses/${business.public_id}/inventory-input`)}
                        >
                          Lihat Hasil Input <Icon name="file" size={14} />
                        </Button>
                        {isLocked ? (
                          <Button
                            className="btn--report-highlight btn--wiggle"
                            title="Buka laporan kesehatan bisnis"
                            onClick={() => navigate(`/businesses/${business.public_id}/health-report`)}
                          >
                            Laporan Kesehatan Bisnis <span className="btn--wiggle__icon"><Icon name="bulb" size={14} /></span>
                          </Button>
                        ) : (
                          <>
                            <Button
                              className="btn--report-highlight btn--wiggle"
                              title="Buat laporan kesehatan bisnis"
                              onClick={() => navigate(`/businesses/${business.public_id}/health-report`)}
                            >
                              Buat Laporan Kesehatan Bisnis <span className="btn--wiggle__icon"><Icon name="bulb" size={14} /></span>
                            </Button>
                            <Button
                              className="btn--dashboard-hover"
                              variant="dark"
                              title="Edit data inventory"
                              onClick={() => navigate(`/businesses/${business.public_id}/inventory/new`)}
                            >
                              Edit <Icon name="edit" size={14} />
                            </Button>
                          </>
                        )}
                      </>
                    ) : (
                      <Button
                        className="btn--dashboard-hover btn--wiggle"
                        variant="dark"
                        title="Input data inventory"
                        onClick={() => navigate(`/businesses/${business.public_id}/inventory/new`)}
                      >
                        Input Data <span className="btn--wiggle__icon"><Icon name="edit" size={14} /></span>
                      </Button>
                    )}
                  </div>
                  {hasDiagnosis ? (
                    isLocked ? (
                      <small className="business-card__notice">Inventory sudah diisi. Lanjutkan dengan melihat hasil sub skor.</small>
                    ) : (
                      <small className="business-card__notice business-card__notice--pending">Belum generate Laporan Kesehatan Bisnis. Generate sekarang untuk dapat insight dan rekomendasi yang lebih akurat.</small>
                    )
                  ) : (
                    <small className="business-card__notice business-card__notice--pending">Inventory belum diisi. Mulai input data untuk membuka sub skor.</small>
                  )}
                </article>
              );
            })}
          </div>

          <form id="business-create-form" className="business-form panel" onSubmit={create}>
            <span className="business-form__icon"><Icon name="home" /></span>
            <h3>{hasReachedLimit ? "Batas usaha tercapai" : "Tambah usaha baru"}</h3>
            <p>
              {hasReachedLimit
                ? `Akun ini sudah memiliki ${businesses.length} dari ${businessLimit} usaha yang diperbolehkan. Hubungi admin untuk menambah limit.`
                : "Gunakan nama yang mudah dikenali agar tidak tertukar saat bisnis sudah bertambah."}
            </p>
            <label><span>Nama usaha</span><input required disabled={hasReachedLimit} placeholder="Contoh: Usaha Maju Jaya" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label>
            <label>
              <span>Jenis Usaha</span>
              <div className="industry-select">
                <button
                  type="button"
                  className="industry-select__trigger"
                  disabled={hasReachedLimit}
                  aria-haspopup="listbox"
                  aria-expanded={isIndustryOpen}
                  onClick={() => setIsIndustryOpen((open) => !open)}
                  onBlur={() => window.setTimeout(() => setIsIndustryOpen(false), 120)}
                >
                  <span className={form.industry ? "" : "industry-select__placeholder"}>
                    {form.industry || "Pilih jenis usaha"}
                  </span>
                  <Icon name="chevron" size={16} />
                </button>
                {isIndustryOpen && !hasReachedLimit && (
                  <div className="industry-select__menu" role="listbox">
                    {industryOptions.map((industry) => (
                      <button
                        type="button"
                        key={industry}
                        role="option"
                        aria-selected={form.industry === industry}
                        className={form.industry === industry ? "is-selected" : ""}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setForm((current) => ({ ...current, industry }));
                          setIsIndustryOpen(false);
                        }}
                      >
                        {industry}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>
            <label><span>Deskripsi</span><textarea disabled={hasReachedLimit} placeholder="Contoh: Usaha kebutuhan harian dan produk rumah tangga" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></label>
            {error && <p className="form-error">{error}</p>}
            <Button className="btn--shiny-dashboard" type="submit" disabled={isCreating || hasReachedLimit}>{isCreating ? "Menyimpan..." : hasReachedLimit ? "Tidak Ada Slot" : "Buat Usaha"}</Button>
          </form>
        </div>
      </section>
    </DashboardShell>
  );
}
