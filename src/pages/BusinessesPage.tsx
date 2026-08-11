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

const industryOptions = [
  "Apotek",
  "Asuransi & Pegadaian",
  "Bakery",
  "Barbershop / Salon",
  "Bengkel",
  "Catering",
  "Digital / Online",
  "E-commerce",
  "Elektronik",
  "Event Organizer",
  "Fashion",
  "Florist / Bunga",
  "Fotografi / Videografi",
  "Furniture",
  "Grosir",
  "Jasa Kebersihan",
  "Jasa Profesional",
  "Jasa Reparasi",
  "Kafe",
  "Kecantikan",
  "Kerajinan",
  "Kesehatan",
  "Keuangan / Koperasi",
  "Konstruksi",
  "Konter Pulsa & Aksesoris HP",
  "Konveksi",
  "Kreatif / Desain",
  "Kuliner / F&B",
  "Kursus / Pelatihan",
  "Laundry",
  "Manufaktur / Produksi",
  "Media / Konten",
  "Minimarket",
  "Optik",
  "Otomotif",
  "Pendidikan",
  "Percetakan",
  "Perhotelan / Penginapan",
  "Perikanan",
  "Pertanian",
  "Peternakan",
  "Petshop / Klinik Hewan",
  "Properti",
  "Rental / Persewaan",
  "Restoran",
  "Retail",
  "Teknologi / Software",
  "Toko Bangunan / Material",
  "Toko Buku & Alat Tulis",
  "Toko Herbal / Jamu",
  "Toko Kelontong",
  "Toko Perhiasan / Emas",
  "Transportasi / Logistik",
  "Travel / Pariwisata",
  "Lainnya",
];

export function BusinessesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [completedBusinessIds, setCompletedBusinessIds] = useState<Set<string>>(() => new Set());
  const [businessLimit, setBusinessLimit] = useState(2);
  const [form, setForm] = useState({ name: "", industry: "", description: "" });
  const [industrySearch, setIndustrySearch] = useState("");
  const [isIndustryOpen, setIsIndustryOpen] = useState(false);
  const [isCustomIndustry, setIsCustomIndustry] = useState(false);
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
      setLoadError(err instanceof Error ? err.message : "Gagal memuat usaha");
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
                          Sub Skor <Icon name="arrow" size={18} />
                        </Button>
                        <Button
                          className="btn--dashboard-hover"
                          variant="secondary"
                          title="Lihat detail data inventarisasi"
                          onClick={() => navigate(`/businesses/${business.public_id}/inventory-input`)}
                        >
                          Lihat Hasil Input <Icon name="file" size={18} />
                        </Button>
                      </>
                    ) : (
                      <Button
                        className="btn--dashboard-hover btn--wiggle"
                        variant="dark"
                        title="Input data inventory"
                        onClick={() => navigate(`/businesses/${business.public_id}/inventory/new`)}
                      >
                        Input Data <span className="btn--wiggle__icon"><Icon name="edit" size={18} /></span>
                      </Button>
                    )}
                  </div>
                  {hasDiagnosis ? (
                    <small className="business-card__notice">Inventory sudah diisi. Lanjutkan dengan melihat hasil sub skor.</small>
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
            <label className="industry-combobox">
              <span>Jenis Usaha</span>
              <input
                required
                disabled={hasReachedLimit}
                placeholder={isCustomIndustry ? "Tulis jenis usaha Anda" : "Cari atau pilih jenis usaha"}
                value={isIndustryOpen ? industrySearch : form.industry}
                onFocus={() => {
                  setIndustrySearch(form.industry);
                  setIsIndustryOpen(true);
                  setIsCustomIndustry(false);
                }}
                onBlur={() => {
                  window.setTimeout(() => {
                    setIndustrySearch("");
                    setIsIndustryOpen(false);
                    setIsCustomIndustry(false);
                  }, 120);
                }}
                onChange={(event) => {
                  setIndustrySearch(event.target.value);
                  setForm((current) => ({ ...current, industry: event.target.value }));
                  if (!isCustomIndustry) setIsIndustryOpen(true);
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
                        if (industry === "Lainnya") {
                          setForm((current) => ({ ...current, industry: "" }));
                          setIndustrySearch("");
                          setIsIndustryOpen(false);
                          setIsCustomIndustry(true);
                          return;
                        }
                        setForm((current) => ({ ...current, industry }));
                        setIndustrySearch("");
                        setIsIndustryOpen(false);
                        setIsCustomIndustry(false);
                      }}
                    >
                      {industry}
                    </button>
                  ))}
                </div>
              )}
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
