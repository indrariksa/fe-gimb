import { useEffect, useState } from "react";
import { DashboardShell } from "../components/organisms/DashboardShell";
import { Icon } from "../components/atoms/Icon";
import { LoadingState } from "../components/atoms/LoadingState";
import { PaginationControls } from "../components/organisms/PaginationControls";
import { useAdminRealtimeSignal } from "../hooks/useAdminRealtimeSignal";
import * as adminApi from "../services/api/admin";
import type { AuditLog } from "../services/api/types";
import { emptyPaginationMeta, normalizePaginationMeta } from "../utils/pagination";
import { formatJakartaDateTime, formatJakartaTime } from "../utils/dateTime";

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

type AuditLevel = "info" | "warning" | "error";
type AuditLevelFilter = AuditLevel | "all";

function auditLevel(log: AuditLog): AuditLevel {
  if (log.level) return log.level;
  const lowered = log.action.toLowerCase();
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

function auditTags(log: AuditLog) {
  const actionParts = log.action.split(".").filter(Boolean);
  const metadataKeys = Object.keys(log.metadata ?? {}).slice(0, 3);
  return Array.from(new Set([log.entity_type, ...actionParts, ...metadataKeys].filter(Boolean))).slice(0, 6);
}

const defaultAuditPageSize = 10;

export function AdminAuditLogPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditPage, setAuditPage] = useState(0);
  const [auditPageSize, setAuditPageSize] = useState(defaultAuditPageSize);
  const [auditMeta, setAuditMeta] = useState(() => emptyPaginationMeta(defaultAuditPageSize));
  const [auditReloadKey, setAuditReloadKey] = useState(0);
  const [auditSoftReloadKey, setAuditSoftReloadKey] = useState(0);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditLevelFilter, setAuditLevelFilter] = useState<AuditLevelFilter>("all");
  const [isAuditFilterOpen, setIsAuditFilterOpen] = useState(false);
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);
  const [auditError, setAuditError] = useState("");
  const [isAuditLoading, setIsAuditLoading] = useState(true);
  const realtimeRefreshKey = useAdminRealtimeSignal();

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
          level: auditLevelFilter,
          search: auditSearch,
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
  }, [auditLevelFilter, auditPage, auditPageSize, auditReloadKey, auditSearch]);

  useEffect(() => {
    if (auditSoftReloadKey === 0) return;
    let isMounted = true;
    async function refreshAuditLogs() {
      const offset = auditPage * auditPageSize;
      try {
        const response = await adminApi.adminAuditLogs({
          limit: auditPageSize,
          offset,
          level: auditLevelFilter,
          search: auditSearch,
        });
        if (isMounted) {
          setAuditLogs(response.items);
          setAuditMeta(normalizePaginationMeta(response.meta, response.items.length, auditPageSize, offset));
        }
      } catch {
        // Keep current logs visible; hard reload/retry still reports errors.
      }
    }
    refreshAuditLogs();
    return () => {
      isMounted = false;
    };
  }, [auditLevelFilter, auditPage, auditPageSize, auditSearch, auditSoftReloadKey]);

  useEffect(() => {
    if (realtimeRefreshKey === 0) return;
    setAuditSoftReloadKey((current) => current + 1);
  }, [realtimeRefreshKey]);

  const hasAuditFilter = auditLevelFilter !== "all" || auditSearch.trim() !== "";
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
    <DashboardShell activeView="adminAuditLog" title="Admin Dashboard">
      <section className="admin-page">
        <section id="audit-logs" className="admin-section panel admin-section--wide admin-anchor audit-log-panel">
          <div className="audit-toolbar" aria-label="Audit log tools">
            <button type="button" aria-label="Mode layar penuh" onClick={toggleAuditFullscreen}>
              <Icon name="maximize" size={20} />
            </button>
            <button
              type="button"
              aria-label="Muat ulang audit log"
              disabled={isAuditLoading}
              onClick={() => setAuditSoftReloadKey((current) => current + 1)}
            >
              <Icon name="refresh" size={20} />
            </button>
          </div>

          <div className="audit-heading">
            <div>
              <h3>Logs</h3>
              <p>{auditLogs.length} of {auditMeta.total} logs</p>
            </div>
            <span>{auditLevelFilter === "all" ? "Semua level" : auditLevelLabel(auditLevelFilter)}</span>
          </div>

          <div className="audit-controls">
            <label className="audit-search">
              <Icon name="search" size={22} />
              <input
                value={auditSearch}
                onChange={(event) => {
                  setAuditSearch(event.target.value);
                  setAuditPage(0);
                }}
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
                        setAuditPage(0);
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
            {auditError && (
              <article className="audit-empty table-retry-state">
                <span>{auditError}</span>
                <button type="button" onClick={() => setAuditReloadKey((current) => current + 1)}>
                  Coba lagi <Icon name="refresh" size={16} />
                </button>
              </article>
            )}
            {!auditError && isAuditLoading && <LoadingState className="audit-empty">Memuat audit log...</LoadingState>}
            {!auditError && !isAuditLoading && auditLogs.length === 0 && (
              <article className="audit-empty">{hasAuditFilter ? "Tidak ada log yang cocok." : "Belum ada audit log."}</article>
            )}
            {!isAuditLoading && !auditError && auditLogs.map((log) => {
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
                  <time>{formatJakartaTime(log.created_at)}</time>
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
                          <code>{formatJakartaDateTime(log.created_at)} · {formatJakartaTime(log.created_at)}</code>
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
      </section>
    </DashboardShell>
  );
}
