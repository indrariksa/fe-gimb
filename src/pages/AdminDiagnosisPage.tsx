import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardShell } from "../components/organisms/DashboardShell";
import { Icon } from "../components/atoms/Icon";
import { LoadingState } from "../components/atoms/LoadingState";
import { PaginationControls } from "../components/organisms/PaginationControls";
import * as adminApi from "../services/api/admin";
import type { Business, InventorySubmission } from "../services/api/types";
import { emptyPaginationMeta, normalizePaginationMeta } from "../utils/pagination";
import { formatJakartaDate } from "../utils/dateTime";
import { formatScore } from "../utils/number";

// Mirrors AI_REPORT_REVENUE_THRESHOLD on the backend (default Rp 50 juta) — below this,
// AI report generation is never triggered, so the button would only ever 404.
const aiReportRevenueThreshold = 50_000_000;
const defaultDiagnosisPageSize = 5;

export function AdminDiagnosisPage() {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessesError, setBusinessesError] = useState("");
  const [businessesReloadKey, setBusinessesReloadKey] = useState(0);
  const [diagnosisRows, setDiagnosisRows] = useState<InventorySubmission[]>([]);
  const [diagnosisPage, setDiagnosisPage] = useState(0);
  const [diagnosisPageSize, setDiagnosisPageSize] = useState(defaultDiagnosisPageSize);
  const [diagnosisMeta, setDiagnosisMeta] = useState(() => emptyPaginationMeta(defaultDiagnosisPageSize));
  const [diagnosisError, setDiagnosisError] = useState("");
  const [isDiagnosisLoading, setIsDiagnosisLoading] = useState(true);
  const [diagnosisReloadKey, setDiagnosisReloadKey] = useState(0);
  const [realtimeRefreshKey, setRealtimeRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    async function loadBusinesses() {
      setBusinessesError("");
      try {
        const response = await adminApi.adminBusinesses({ limit: 100, offset: 0 });
        if (isMounted) setBusinesses(response.items);
      } catch (err) {
        if (isMounted) setBusinessesError(err instanceof Error ? err.message : "Gagal memuat daftar toko");
      }
    }
    loadBusinesses();
    return () => {
      isMounted = false;
    };
  }, [businessesReloadKey]);

  useEffect(() => {
    let isMounted = true;
    async function loadDiagnosis() {
      setIsDiagnosisLoading(true);
      setDiagnosisError("");
      const offset = diagnosisPage * diagnosisPageSize;
      try {
        const response = await adminApi.adminDiagnosisWatchlist({ limit: diagnosisPageSize, offset });
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
  }, [diagnosisPage, diagnosisPageSize, diagnosisReloadKey]);

  useEffect(() => {
    const refreshOnNotification = () => setRealtimeRefreshKey((current) => current + 1);
    window.addEventListener("gimb:admin-notification", refreshOnNotification);
    return () => window.removeEventListener("gimb:admin-notification", refreshOnNotification);
  }, []);

  useEffect(() => {
    if (realtimeRefreshKey === 0) return;
    let isMounted = true;
    async function refresh() {
      const offset = diagnosisPage * diagnosisPageSize;
      try {
        const [businessesData, diagnosisData] = await Promise.all([
          adminApi.adminBusinesses({ limit: 100, offset: 0 }),
          adminApi.adminDiagnosisWatchlist({ limit: diagnosisPageSize, offset }),
        ]);
        if (!isMounted) return;
        setBusinesses(businessesData.items);
        setDiagnosisRows(diagnosisData.items);
        setDiagnosisMeta(normalizePaginationMeta(diagnosisData.meta, diagnosisData.items.length, diagnosisPageSize, offset));
      } catch {
        // Keep the visible data stable; manual reload buttons still show errors when needed.
      }
    }
    refresh();
    return () => {
      isMounted = false;
    };
  }, [diagnosisPage, diagnosisPageSize, realtimeRefreshKey]);

  const goToBusinessSubScores = (publicId: string) => navigate(`/businesses/${publicId}/sub-scores`);
  const goToBusinessInventoryInput = (publicId: string) => navigate(`/admin/businesses/${publicId}/inventory-input`);
  const goToBusinessAIReport = (publicId: string) => navigate(`/admin/businesses/${publicId}/ai-report`);

  return (
    <DashboardShell activeView="adminDiagnosis" title="Admin Dashboard">
      <section className="admin-page">
        <section className="admin-section panel admin-section--wide admin-anchor">
          <div className="admin-section__heading">
            <div>
              <h3>Monitoring Diagnosis</h3>
              <p>Toko dengan skor terendah tampil lebih dulu agar admin bisa cepat melakukan review.</p>
            </div>
            <b>{diagnosisMeta.total} data</b>
          </div>
          {businessesError && (
            <div className="table-retry-state">
              <span>{businessesError}</span>
              <button type="button" onClick={() => setBusinessesReloadKey((current) => current + 1)}>
                Coba lagi <Icon name="refresh" size={16} />
              </button>
            </div>
          )}
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Toko</th>
                  <th>Status</th>
                  <th>Tanggal</th>
                  <th>Skor</th>
                  <th className="admin-table__actions-col">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {diagnosisError && (
                  <tr>
                    <td colSpan={5}>
                      <div className="table-retry-state">
                        <span>{diagnosisError}</span>
                        <button type="button" onClick={() => setDiagnosisReloadKey((current) => current + 1)}>
                          Coba lagi <Icon name="refresh" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                {!diagnosisError && isDiagnosisLoading && (
                  <tr><td colSpan={5}><LoadingState inline>Memuat monitoring diagnosis...</LoadingState></td></tr>
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
                      <td>{formatJakartaDate(submission.created_at, "short")}</td>
                      <td><strong className="admin-table__score">{formatScore(submission.analysis.overall_score)}</strong></td>
                      <td className="admin-table__actions-col">
                        <div className="admin-row-actions">
                          {business ? (
                            <>
                              <button className="admin-row-action--score" onClick={() => goToBusinessSubScores(business.public_id)}>Sub Skor <Icon name="arrow" size={16} /></button>
                              <button className="admin-row-action--input" onClick={() => goToBusinessInventoryInput(business.public_id)}>Lihat Input <Icon name="arrow" size={16} /></button>
                              {submission.six_month_revenue > aiReportRevenueThreshold && (
                                <button className="admin-row-action--ai-report" onClick={() => goToBusinessAIReport(business.public_id)}>Laporan AI <Icon name="arrow" size={16} /></button>
                              )}
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
      </section>
    </DashboardShell>
  );
}
