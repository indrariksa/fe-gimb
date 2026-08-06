import { useEffect, useState } from "react";
import { DashboardShell } from "../components/organisms/DashboardShell";
import { Button } from "../components/atoms/Button";
import { Icon } from "../components/atoms/Icon";
import { LoadingState } from "../components/atoms/LoadingState";
import { HolographicCard } from "../components/molecules/HolographicCard";
import { AdminAnalyticsChart } from "../components/organisms/AdminAnalyticsChart";
import { useAdminRealtimeSignal } from "../hooks/useAdminRealtimeSignal";
import * as adminApi from "../services/api/admin";
import type { AdminSummary, AIReportChartData, BusinessLimitSetting } from "../services/api/types";

export function AdminSummaryPage() {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [businessLimit, setBusinessLimit] = useState<BusinessLimitSetting | null>(null);
  const [charts, setCharts] = useState<AIReportChartData[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const realtimeRefreshKey = useAdminRealtimeSignal();

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const [summaryData, limitData, analyticsData] = await Promise.all([
          adminApi.adminSummary(),
          adminApi.adminBusinessLimit(),
          adminApi.adminAnalytics(),
        ]);
        if (isMounted) {
          setSummary(summaryData);
          setBusinessLimit(limitData);
          setCharts(analyticsData.charts);
        }
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : "Gagal memuat ringkasan admin");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (realtimeRefreshKey === 0) return;
    let isMounted = true;
    async function refresh() {
      try {
        const [summaryData, limitData, analyticsData] = await Promise.all([
          adminApi.adminSummary(),
          adminApi.adminBusinessLimit(),
          adminApi.adminAnalytics(),
        ]);
        if (!isMounted) return;
        setSummary(summaryData);
        setBusinessLimit(limitData);
        setCharts(analyticsData.charts);
      } catch {
        // Keep the visible data stable; manual reload still reports errors.
      }
    }
    refresh();
    return () => {
      isMounted = false;
    };
  }, [realtimeRefreshKey]);

  const userStatusChart: AIReportChartData = {
    id: "user_status",
    type: "pie",
    title: "User Aktif vs Suspended",
    labels: ["Aktif", "Suspended"],
    series: [{ name: "User", values: [summary?.active_users ?? 0, summary?.suspended_users ?? 0] }],
  };

  return (
    <DashboardShell activeView="adminSummary" title="Admin Dashboard">
      <section className="admin-page">
        <div className="form-hero admin-anchor">
          <h2>Kontrol operasional aplikasi</h2>
          <p>Pantau user, toko, dan submission inventarisasi yang masuk ke sistem.</p>
        </div>

        {isLoading && <LoadingState>Memuat data admin...</LoadingState>}
        {error && (
          <article className="panel empty-state retry-state">
            <span>{error}</span>
            <Button className="btn--dashboard-hover" onClick={() => setReloadKey((current) => current + 1)}>
              Coba lagi <Icon name="refresh" size={18} />
            </Button>
          </article>
        )}

        {!isLoading && !error && (
          <>
            <div className="admin-grid">
              <HolographicCard className="admin-metric panel"><span>Total User</span><strong>{summary?.users ?? 0}</strong></HolographicCard>
              <HolographicCard className="admin-metric panel"><span>User Aktif</span><strong>{summary?.active_users ?? 0}</strong></HolographicCard>
              <HolographicCard className="admin-metric panel"><span>Toko</span><strong>{summary?.businesses ?? 0}</strong></HolographicCard>
              <HolographicCard className="admin-metric panel"><span>Submission</span><strong>{summary?.inventory_submissions ?? 0}</strong></HolographicCard>
              <HolographicCard className="admin-metric panel"><span>Limit toko/user</span><strong>{businessLimit?.value ?? 2}</strong></HolographicCard>
            </div>

            <div className="inventory-insight-grid">
              {charts.map((chart) => (
                <AdminAnalyticsChart key={chart.id} chart={chart} />
              ))}
              <AdminAnalyticsChart chart={userStatusChart} />
            </div>
          </>
        )}
      </section>
    </DashboardShell>
  );
}
