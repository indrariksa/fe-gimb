import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardShell } from "../components/organisms/DashboardShell";
import { Button } from "../components/atoms/Button";
import { Icon } from "../components/atoms/Icon";
import * as adminApi from "../services/api/admin";
import type { AdminSummary, AuditLog, Business, BusinessLimitSetting, InventorySubmission, PaginationMeta, User, UserStatus } from "../services/api/types";
import { formatScore } from "../utils/number";
import { useThemeSettings } from "../theme/ThemeContext";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatAction(action: string) {
  return action
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).replace(/_/g, " "))
    .join(" / ");
}

function shortValue(value: string, length = 12) {
  if (!value) return "-";
  return value.length > length ? `${value.slice(0, length)}...` : value;
}

function metadataPreview(metadata: Record<string, unknown>) {
  const entries = Object.entries(metadata).filter(([, value]) => value !== null && value !== undefined && value !== "");
  if (entries.length === 0) return "-";
  return entries.slice(0, 2).map(([key, value]) => `${key}: ${String(value)}`).join(", ");
}

type AuditLevel = "info" | "warning" | "error";
type AuditLevelFilter = AuditLevel | "all";

function auditLevel(logOrAction: AuditLog | string): AuditLevel {
  if (typeof logOrAction !== "string" && logOrAction.level) return logOrAction.level;
  const action = typeof logOrAction === "string" ? logOrAction : logOrAction.action;
  const lowered = action.toLowerCase();
  if (lowered.includes("failed") || lowered.includes("error") || lowered.includes("blocked")) return "error";
  if (lowered.includes("updated") || lowered.includes("deleted") || lowered.includes("suspended") || lowered.includes("limit")) return "warning";
  return "info";
}

function auditLevelLabel(level: AuditLevel) {
  return level === "error" ? "Error" : level === "warning" ? "Warning" : "Info";
}

function auditService(log: AuditLog) {
  if (log.service) return log.service;
  const actionRoot = log.action.split(".")[0] || log.entity_type || "system";
  return `${actionRoot.replace(/_/g, "-")}-service`;
}

function auditStatusText(log: AuditLog, level: AuditLevel) {
  if (typeof log.status_code === "number" && log.status_code > 0) return String(log.status_code);
  if (level === "error") return "401";
  if (level === "warning") return "202";
  return "200";
}

function auditDuration(log: AuditLog) {
  if (typeof log.duration_ms !== "number") return "-";
  if (log.duration_ms < 1000) return `${log.duration_ms}ms`;
  return `${(log.duration_ms / 1000).toFixed(1)}s`;
}

function auditIPAddress(log: AuditLog) {
  return log.ip_address || "-";
}

function auditMessage(log: AuditLog) {
  return log.message || formatAction(log.action);
}

function metadataString(log: AuditLog, key: string) {
  const value = log.metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function auditActor(log: AuditLog) {
  if (log.actor_name && log.actor_email) return `${log.actor_name} (${log.actor_email})`;
  if (log.actor_name) return log.actor_name;
  if (log.actor_email) return log.actor_email;
  const email = metadataString(log, "email");
  if (email) return email;
  return log.actor_id ? "Pengguna terdaftar" : "System";
}

function auditEntity(log: AuditLog) {
  if (log.entity_label) return log.entity_label;
  const email = metadataString(log, "email");
  if (log.entity_type === "user" && email) return email;
  return formatAction(log.entity_type || "system");
}

function formatAuditTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

function auditTags(log: AuditLog) {
  const actionParts = log.action.split(".").filter(Boolean);
  const metadataKeys = Object.keys(log.metadata ?? {}).slice(0, 3);
  return Array.from(new Set([log.entity_type, ...actionParts, ...metadataKeys].filter(Boolean))).slice(0, 6);
}

function auditSearchValue(log: AuditLog) {
  return [
    log.action,
    auditActor(log),
    auditEntity(log),
    log.service ?? "",
    log.endpoint ?? "",
    log.message ?? "",
    typeof log.status_code === "number" ? String(log.status_code) : "",
    typeof log.duration_ms === "number" ? String(log.duration_ms) : "",
    log.entity_type,
    log.ip_address,
    log.user_agent,
    metadataPreview(log.metadata ?? {}),
    JSON.stringify(log.metadata ?? {}),
  ].join(" ").toLowerCase();
}

const paginationSizeOptions = [5, 10, 20, 50];
const defaultDiagnosisPageSize = 5;
const defaultAuditPageSize = 10;

function emptyPaginationMeta(limit: number): PaginationMeta {
  return {
    limit,
    offset: 0,
    count: 0,
    total: 0,
    page: 1,
    total_pages: 0,
    has_next: false,
    has_prev: false,
  };
}

function normalizePaginationMeta(meta: Partial<PaginationMeta> | undefined, itemCount: number, limit: number, offset: number): PaginationMeta {
  const count = Number.isFinite(meta?.count) ? Number(meta?.count) : itemCount;
  const total = Number.isFinite(meta?.total) ? Number(meta?.total) : offset + count;
  const page = Number.isFinite(meta?.page) ? Number(meta?.page) : Math.floor(offset / limit) + 1;
  const totalPages = Number.isFinite(meta?.total_pages)
    ? Number(meta?.total_pages)
    : total > 0 ? Math.max(1, Math.ceil(total / limit)) : 0;

  return {
    limit: Number.isFinite(meta?.limit) ? Number(meta?.limit) : limit,
    offset: Number.isFinite(meta?.offset) ? Number(meta?.offset) : offset,
    count,
    total,
    page,
    total_pages: totalPages,
    has_next: typeof meta?.has_next === "boolean" ? meta.has_next : count === limit,
    has_prev: typeof meta?.has_prev === "boolean" ? meta.has_prev : offset > 0,
  };
}

function paginationPages(currentPage: number, totalPages: number) {
  if (totalPages <= 0) return [1];
  if (totalPages <= 6) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  const sorted = Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  return sorted.reduce<Array<number | string>>((acc, page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) acc.push(`ellipsis-${page}`);
    acc.push(page);
    return acc;
  }, []);
}

type PaginationControlsProps = {
  page: number;
  pageSize: number;
  meta: PaginationMeta;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

function PaginationControls({ page, pageSize, meta, isLoading, onPageChange, onPageSizeChange }: PaginationControlsProps) {
  const [isSizeMenuOpen, setIsSizeMenuOpen] = useState(false);
  const start = meta.count === 0 ? 0 : meta.offset + 1;
  const end = meta.offset + meta.count;
  const canGoNext = meta.has_next;
  const displayPage = page + 1;
  const totalPages = meta.total_pages || displayPage;
  const pages = paginationPages(displayPage, totalPages);

  return (
    <div className="admin-pagination">
      <div className="admin-pagination__meta">
        <span>
          {isLoading
            ? "Memuat data..."
            : meta.total > 0
              ? `Showing ${start} to ${end} of ${meta.total} entries`
              : "Showing 0 entries"}
        </span>
        <label>
          Tampilkan
          <span className="admin-pagination__size">
            <button
              type="button"
              className={isSizeMenuOpen ? "is-open" : ""}
              aria-haspopup="listbox"
              aria-expanded={isSizeMenuOpen}
              disabled={isLoading}
              onClick={() => setIsSizeMenuOpen((current) => !current)}
            >
              {pageSize}
              <Icon name="chevron" size={16} />
            </button>
            {isSizeMenuOpen && (
              <span className="admin-pagination__size-menu" role="listbox" aria-label="Jumlah data yang ditampilkan">
                {paginationSizeOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="option"
                    aria-selected={option === pageSize}
                    className={option === pageSize ? "is-selected" : ""}
                    disabled={isLoading}
                    onClick={() => {
                      setIsSizeMenuOpen(false);
                      onPageSizeChange(option);
                    }}
                  >
                    {option === pageSize && <Icon name="check" size={16} />}
                    <span>{option}</span>
                  </button>
                ))}
              </span>
            )}
          </span>
          data
          <select
            className="admin-pagination__native-size"
            value={pageSize}
            disabled={isLoading}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            aria-hidden="true"
            tabIndex={-1}
          >
            {paginationSizeOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="admin-pagination__controls">
        <button type="button" disabled={!meta.has_prev || isLoading} onClick={() => onPageChange(Math.max(0, page - 1))}>Previous</button>
        <div className="admin-pagination__pages" aria-label="Pilihan halaman">
          {pages.map((pageItem) => (
            typeof pageItem === "number" ? (
              <button
                key={pageItem}
                type="button"
                className={pageItem === displayPage ? "is-active" : ""}
                disabled={isLoading}
                onClick={() => onPageChange(pageItem - 1)}
              >
                {pageItem}
              </button>
            ) : (
              <span key={pageItem}>...</span>
            )
          ))}
        </div>
        <button type="button" disabled={!canGoNext || isLoading} onClick={() => onPageChange(page + 1)}>Next</button>
      </div>
    </div>
  );
}

export function AdminPage() {
  const navigate = useNavigate();
  const { theme, updateTheme } = useThemeSettings();
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [diagnosisRows, setDiagnosisRows] = useState<InventorySubmission[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [businessLimit, setBusinessLimit] = useState<BusinessLimitSetting | null>(null);
  const [businessLimitInput, setBusinessLimitInput] = useState("2");
  const [diagnosisPage, setDiagnosisPage] = useState(0);
  const [diagnosisPageSize, setDiagnosisPageSize] = useState(defaultDiagnosisPageSize);
  const [diagnosisMeta, setDiagnosisMeta] = useState(() => emptyPaginationMeta(defaultDiagnosisPageSize));
  const [auditPage, setAuditPage] = useState(0);
  const [auditPageSize, setAuditPageSize] = useState(defaultAuditPageSize);
  const [auditMeta, setAuditMeta] = useState(() => emptyPaginationMeta(defaultAuditPageSize));
  const [auditReloadKey, setAuditReloadKey] = useState(0);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditLevelFilter, setAuditLevelFilter] = useState<AuditLevelFilter>("all");
  const [isAuditFilterOpen, setIsAuditFilterOpen] = useState(false);
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [diagnosisError, setDiagnosisError] = useState("");
  const [auditError, setAuditError] = useState("");
  const [settingMessage, setSettingMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDiagnosisLoading, setIsDiagnosisLoading] = useState(true);
  const [isAuditLoading, setIsAuditLoading] = useState(true);
  const [isSavingLimit, setIsSavingLimit] = useState(false);
  const [isLimitConfirmOpen, setIsLimitConfirmOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadAdmin() {
      setIsLoading(true);
      setError("");
      try {
        const [summaryData, limitData, usersData, businessesData] = await Promise.all([
          adminApi.adminSummary(),
          adminApi.adminBusinessLimit(),
          adminApi.adminUsers(),
          adminApi.adminBusinesses({ limit: 100, offset: 0 }),
        ]);
        if (isMounted) {
          setSummary(summaryData);
          setBusinessLimit(limitData);
          setBusinessLimitInput(String(limitData.value));
          setUsers(usersData.items);
          setBusinesses(businessesData.items);
        }
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : "Gagal memuat dashboard admin");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadAdmin();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function loadDiagnosis() {
      setIsDiagnosisLoading(true);
      setDiagnosisError("");
      const offset = diagnosisPage * diagnosisPageSize;
      try {
        const response = await adminApi.adminDiagnosisWatchlist({
          limit: diagnosisPageSize,
          offset,
        });
        if (isMounted) {
          setDiagnosisRows(response.items);
          setDiagnosisMeta(normalizePaginationMeta(response.meta, response.items.length, diagnosisPageSize, offset));
        }
      } catch (err) {
        if (isMounted) {
          setDiagnosisRows([]);
          setDiagnosisMeta(emptyPaginationMeta(diagnosisPageSize));
          setDiagnosisError(err instanceof Error ? err.message : "Gagal memuat monitoring diagnosis");
        }
      } finally {
        if (isMounted) setIsDiagnosisLoading(false);
      }
    }
    loadDiagnosis();
    return () => {
      isMounted = false;
    };
  }, [diagnosisPage, diagnosisPageSize]);

  useEffect(() => {
    let isMounted = true;
    async function loadAuditLogs() {
      setIsAuditLoading(true);
      setAuditError("");
      const offset = auditPage * auditPageSize;
      try {
        const response = await adminApi.adminAuditLogs({
          limit: auditPageSize,
          offset,
        });
        if (isMounted) {
          setAuditLogs(response.items);
          setAuditMeta(normalizePaginationMeta(response.meta, response.items.length, auditPageSize, offset));
        }
      } catch (err) {
        if (isMounted) {
          setAuditLogs([]);
          setAuditMeta(emptyPaginationMeta(auditPageSize));
          setAuditError(err instanceof Error ? err.message : "Gagal memuat audit log");
        }
      } finally {
        if (isMounted) setIsAuditLoading(false);
      }
    }
    loadAuditLogs();
    return () => {
      isMounted = false;
    };
  }, [auditPage, auditPageSize, auditReloadKey]);

  const visibleAuditLogs = useMemo(() => {
    const normalizedSearch = auditSearch.trim().toLowerCase();
    return auditLogs.filter((log) => {
      const level = auditLevel(log);
      const matchesLevel = auditLevelFilter === "all" || level === auditLevelFilter;
      const matchesSearch = normalizedSearch.length === 0 || auditSearchValue(log).includes(normalizedSearch);
      return matchesLevel && matchesSearch;
    });
  }, [auditLogs, auditLevelFilter, auditSearch]);

  const updateStatus = async (userId: string, status: UserStatus) => {
    const updated = await adminApi.updateUserStatus(userId, status);
    setUsers((current) => current.map((user) => user.id === updated.id ? updated : user));
  };

  const saveBusinessLimit = (event: FormEvent) => {
    event.preventDefault();
    setSettingMessage("");
    setIsLimitConfirmOpen(true);
  };

  const confirmBusinessLimitSave = async () => {
    setIsSavingLimit(true);
    try {
      const updated = await adminApi.updateBusinessLimit(Number(businessLimitInput));
      setBusinessLimit(updated);
      setBusinessLimitInput(String(updated.value));
      setSettingMessage("Limit toko per user berhasil diperbarui.");
    } catch (err) {
      setSettingMessage(err instanceof Error ? err.message : "Gagal memperbarui limit toko");
    } finally {
      setIsSavingLimit(false);
      setIsLimitConfirmOpen(false);
    }
  };

  const goToBusinessDashboard = (publicId: string) => navigate(`/businesses/${publicId}/dashboard`);
  const goToBusinessSubScores = (publicId: string) => navigate(`/businesses/${publicId}/sub-scores`);
  const goToBusinessInventoryInput = (publicId: string) => navigate(`/admin/businesses/${publicId}/inventory-input`);
  const toggleAuditFullscreen = () => {
    const panel = document.getElementById("audit-logs");
    if (!panel) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    void panel.requestFullscreen?.();
  };

  return (
    <DashboardShell activeView="admin" title="Admin Dashboard">
      <section className="admin-page">
        <div id="overview" className="form-hero admin-anchor">
          <h2>Kontrol operasional aplikasi</h2>
          <p>Pantau user, toko, dan submission inventarisasi yang masuk ke sistem.</p>
        </div>

        {isLoading && <article className="panel empty-state">Memuat data admin...</article>}
        {error && <article className="panel empty-state">{error}</article>}

        {!isLoading && !error && (
          <>
            <div className="admin-grid">
              <article className="admin-metric panel"><span>Total User</span><strong>{summary?.users ?? 0}</strong></article>
              <article className="admin-metric panel"><span>User Aktif</span><strong>{summary?.active_users ?? 0}</strong></article>
              <article className="admin-metric panel"><span>Toko</span><strong>{summary?.businesses ?? 0}</strong></article>
              <article className="admin-metric panel"><span>Submission</span><strong>{summary?.inventory_submissions ?? 0}</strong></article>
              <article className="admin-metric panel"><span>Limit toko/user</span><strong>{businessLimit?.value ?? 2}</strong></article>
            </div>

            <div className="admin-layout">
              <section id="diagnoses" className="admin-section panel admin-section--wide admin-anchor">
                <div className="admin-section__heading">
                  <div>
                    <h3>Monitoring Diagnosis</h3>
                    <p>Toko dengan skor terendah tampil lebih dulu agar admin bisa cepat melakukan review.</p>
                  </div>
                  <b>{diagnosisMeta.total} data</b>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Toko</th>
                        <th>Status</th>
                        <th>Tanggal</th>
                        <th>Skor</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diagnosisError && <tr><td colSpan={5}>{diagnosisError}</td></tr>}
                      {!diagnosisError && isDiagnosisLoading && (
                        <tr><td colSpan={5}>Memuat monitoring diagnosis...</td></tr>
                      )}
                      {!diagnosisError && !isDiagnosisLoading && diagnosisRows.length === 0 && (
                        <tr><td colSpan={5}>Belum ada hasil diagnosis yang bisa dipantau.</td></tr>
                      )}
                      {!isDiagnosisLoading && !diagnosisError && diagnosisRows.map((submission) => {
                        const business = businesses.find((item) => item.id === submission.business_id);
                        return (
                          <tr key={submission.public_id}>
                            <td>
                              <strong>{submission.business_name || business?.name || submission.public_id}</strong>
                              <span>{business?.industry || "Tanpa industri"}</span>
                            </td>
                            <td><b className="status-pill">{submission.analysis.status}</b></td>
                            <td>{formatDate(submission.created_at)}</td>
                            <td><strong className="admin-table__score">{formatScore(submission.analysis.overall_score)}</strong></td>
                            <td>
                              <div className="admin-row-actions">
                                {business ? (
                                  <>
                                    <button onClick={() => goToBusinessDashboard(business.public_id)}>Dashboard <Icon name="arrow" size={16} /></button>
                                    <button onClick={() => goToBusinessSubScores(business.public_id)}>Sub Skor <Icon name="arrow" size={16} /></button>
                                    <button onClick={() => goToBusinessInventoryInput(business.public_id)}>Lihat Input <Icon name="arrow" size={16} /></button>
                                  </>
                                ) : (
                                  <span>-</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <PaginationControls
                  page={diagnosisPage}
                  pageSize={diagnosisPageSize}
                  meta={diagnosisMeta}
                  isLoading={isDiagnosisLoading}
                  onPageChange={setDiagnosisPage}
                  onPageSizeChange={(pageSize) => {
                    setDiagnosisPage(0);
                    setDiagnosisPageSize(pageSize);
                  }}
                />
              </section>

              <section id="limits" className="admin-section panel admin-anchor">
                <h3>Pengaturan Limit</h3>
                <form className="admin-setting-form" onSubmit={saveBusinessLimit}>
                  <label>
                    <span>Batas toko per user</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={businessLimitInput}
                      onChange={(event) => setBusinessLimitInput(event.target.value)}
                    />
                  </label>
                  <button className="btn" type="submit" disabled={isSavingLimit}>
                    {isSavingLimit ? "Menyimpan..." : "Simpan Limit"}
                  </button>
                  {settingMessage && <p>{settingMessage}</p>}
                </form>
              </section>

              <section id="users" className="admin-section panel admin-anchor">
                <h3>User</h3>
                <div className="data-table">
                  {users.map((user) => (
                    <article key={user.id}>
                      <div>
                        <strong>{user.full_name}</strong>
                        <span>{user.email}</span>
                      </div>
                      <b className={`status-pill status-pill--${user.role}`}>{user.role}</b>
                      <select value={user.status} onChange={(event) => updateStatus(user.id, event.target.value as UserStatus)}>
                        <option value="active">active</option>
                        <option value="inactive">inactive</option>
                        <option value="suspended">suspended</option>
                      </select>
                    </article>
                  ))}
                </div>
              </section>

              <section id="audit-logs" className="admin-section panel admin-section--wide admin-anchor audit-log-panel">
                <div className="audit-toolbar" aria-label="Audit log tools">
                  <button type="button" aria-label="Mode layar penuh" onClick={toggleAuditFullscreen}>
                    <Icon name="maximize" size={20} />
                  </button>
                  <button type="button" aria-label="Ubah mode warna" onClick={() => updateTheme({ mode: theme.mode === "dark" ? "light" : "dark" })}>
                    <Icon name={theme.mode === "dark" ? "sun" : "moon"} size={20} />
                  </button>
                  <button
                    type="button"
                    aria-label="Muat ulang audit log"
                    disabled={isAuditLoading}
                    onClick={() => setAuditReloadKey((current) => current + 1)}
                  >
                    <Icon name="refresh" size={20} />
                  </button>
                </div>

                <div className="audit-heading">
                  <div>
                    <h3>Logs</h3>
                    <p>{visibleAuditLogs.length} of {auditMeta.total} logs</p>
                  </div>
                  <span>{auditLevelFilter === "all" ? "Semua level" : auditLevelLabel(auditLevelFilter)}</span>
                </div>

                <div className="audit-controls">
                  <label className="audit-search">
                    <Icon name="search" size={22} />
                    <input
                      value={auditSearch}
                      onChange={(event) => setAuditSearch(event.target.value)}
                      placeholder="Cari log berdasarkan aksi, actor, target, IP, atau metadata..."
                    />
                  </label>
                  <div className="audit-filter">
                    <button
                      type="button"
                      aria-label="Filter audit log"
                      aria-haspopup="menu"
                      aria-expanded={isAuditFilterOpen}
                      onClick={() => setIsAuditFilterOpen((current) => !current)}
                    >
                      <Icon name="filter" size={22} />
                    </button>
                    {isAuditFilterOpen && (
                      <div className="audit-filter__menu" role="menu">
                        {(["all", "info", "warning", "error"] as AuditLevelFilter[]).map((level) => (
                          <button
                            key={level}
                            type="button"
                            className={auditLevelFilter === level ? "is-active" : ""}
                            onClick={() => {
                              setAuditLevelFilter(level);
                              setIsAuditFilterOpen(false);
                            }}
                          >
                            {level === "all" ? "Semua" : auditLevelLabel(level)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="audit-log-list">
                  {auditError && <article className="audit-empty">{auditError}</article>}
                  {!auditError && isAuditLoading && <article className="audit-empty">Memuat audit log...</article>}
                  {!auditError && !isAuditLoading && auditLogs.length === 0 && <article className="audit-empty">Belum ada audit log.</article>}
                  {!auditError && !isAuditLoading && auditLogs.length > 0 && visibleAuditLogs.length === 0 && (
                    <article className="audit-empty">Tidak ada log yang cocok di halaman ini.</article>
                  )}
                  {!isAuditLoading && !auditError && visibleAuditLogs.map((log) => {
                    const level = auditLevel(log);
                    const isExpanded = expandedAuditId === log.id;
                    const tags = auditTags(log);
                    return (
                      <article key={log.id} className={`audit-log-row audit-log-row--${level} ${isExpanded ? "is-expanded" : ""}`}>
                        <button
                          type="button"
                          className="audit-log-row__toggle"
                          aria-label={isExpanded ? "Tutup detail audit log" : "Buka detail audit log"}
                          onClick={() => setExpandedAuditId((current) => current === log.id ? null : log.id)}
                        >
                          <Icon name="chevron" size={18} />
                        </button>
                        <b className={`audit-level audit-level--${level}`}>{auditLevelLabel(level)}</b>
                        <time>{formatAuditTime(log.created_at)}</time>
                        <strong>{auditService(log)}</strong>
                        <p>{auditMessage(log)}</p>
                        <span className={`audit-status audit-status--${level}`}>{auditStatusText(log, level)}</span>
                        <small>{auditDuration(log)}</small>
                        <small className="audit-ip">{auditIPAddress(log)}</small>

                        {isExpanded && (
                          <div className="audit-log-detail">
                            <div className="audit-log-detail__message">
                              <span>Message</span>
                              <code>{auditMessage(log)}</code>
                            </div>
                            <div className="audit-log-detail__grid">
                              <div>
                                <span>Actor</span>
                                <code>{auditActor(log)}</code>
                              </div>
                              <div>
                                <span>Entity</span>
                                <code>{auditEntity(log)}</code>
                              </div>
                              <div>
                                <span>Level</span>
                                <code>{auditLevelLabel(level)}</code>
                              </div>
                              <div>
                                <span>Service</span>
                                <code>{auditService(log)}</code>
                              </div>
                              <div>
                                <span>Endpoint</span>
                                <code>{log.endpoint || "-"}</code>
                              </div>
                              <div>
                                <span>Status Code</span>
                                <code>{auditStatusText(log, level)}</code>
                              </div>
                              <div>
                                <span>Duration</span>
                                <code>{auditDuration(log)}</code>
                              </div>
                              <div>
                                <span>IP Address</span>
                                <code>{auditIPAddress(log)}</code>
                              </div>
                              <div>
                                <span>Timestamp</span>
                                <code>{formatDateTime(log.created_at)} · {formatAuditTime(log.created_at)}</code>
                              </div>
                              <div>
                                <span>User Agent</span>
                                <code>{shortValue(log.user_agent || "-", 48)}</code>
                              </div>
                            </div>
                            {tags.length > 0 && (
                              <div className="audit-tags">
                                <span>Tags</span>
                                <div>
                                  {tags.map((tag) => <b key={tag}>{tag}</b>)}
                                </div>
                              </div>
                            )}
                            <div>
                              <span>Metadata</span>
                              <code>{JSON.stringify(log.metadata ?? {}, null, 2)}</code>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
                <PaginationControls
                  page={auditPage}
                  pageSize={auditPageSize}
                  meta={auditMeta}
                  isLoading={isAuditLoading}
                  onPageChange={setAuditPage}
                  onPageSizeChange={(pageSize) => {
                    setAuditPage(0);
                    setAuditPageSize(pageSize);
                  }}
                />
              </section>
            </div>
          </>
        )}
      </section>

      {isLimitConfirmOpen && (
        <div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="limit-confirm-title">
          <div className="confirm-dialog__card">
            <span className="confirm-dialog__icon"><Icon name="settings" size={34} /></span>
            <h2 id="limit-confirm-title">Simpan perubahan limit?</h2>
            <p>Limit toko per user akan diubah menjadi <strong>{businessLimitInput}</strong>.</p>
            <div className="confirm-dialog__actions">
              <Button variant="secondary" disabled={isSavingLimit} onClick={() => setIsLimitConfirmOpen(false)}>
                Tidak
              </Button>
              <Button disabled={isSavingLimit} onClick={confirmBusinessLimitSave}>
                {isSavingLimit ? "Menyimpan..." : "Ya, Simpan"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
