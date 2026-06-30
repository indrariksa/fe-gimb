import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { DashboardShell } from "../components/organisms/DashboardShell";
import * as adminApi from "../services/api/admin";
import type { AdminSummary, Business, BusinessLimitSetting, InventorySubmission, User, UserStatus } from "../services/api/types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export function AdminPage() {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [submissions, setSubmissions] = useState<InventorySubmission[]>([]);
  const [businessLimit, setBusinessLimit] = useState<BusinessLimitSetting | null>(null);
  const [businessLimitInput, setBusinessLimitInput] = useState("2");
  const [error, setError] = useState("");
  const [settingMessage, setSettingMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingLimit, setIsSavingLimit] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadAdmin() {
      setIsLoading(true);
      setError("");
      try {
        const [summaryData, limitData, usersData, businessesData, submissionsData] = await Promise.all([
          adminApi.adminSummary(),
          adminApi.adminBusinessLimit(),
          adminApi.adminUsers(),
          adminApi.adminBusinesses(),
          adminApi.adminInventorySubmissions(),
        ]);
        if (isMounted) {
          setSummary(summaryData);
          setBusinessLimit(limitData);
          setBusinessLimitInput(String(limitData.value));
          setUsers(usersData.items);
          setBusinesses(businessesData.items);
          setSubmissions(submissionsData.items);
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

  const updateStatus = async (userId: string, status: UserStatus) => {
    const updated = await adminApi.updateUserStatus(userId, status);
    setUsers((current) => current.map((user) => user.id === updated.id ? updated : user));
  };

  const saveBusinessLimit = async (event: FormEvent) => {
    event.preventDefault();
    setSettingMessage("");
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
    }
  };

  return (
    <DashboardShell activeView="admin" title="Admin Dashboard">
      <section className="admin-page">
        <div className="form-hero">
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
              <section className="admin-section panel">
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

              <section className="admin-section panel">
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

              <section className="admin-section panel">
                <h3>Toko</h3>
                <div className="data-table">
                  {businesses.map((business) => (
                    <article key={business.public_id}>
                      <div>
                        <strong>{business.name}</strong>
                        <span>{business.industry || "Tanpa industri"}</span>
                      </div>
                      <span>{formatDate(business.created_at)}</span>
                    </article>
                  ))}
                </div>
              </section>

              <section className="admin-section panel admin-section--wide">
                <h3>Submission Terbaru</h3>
                <div className="data-table">
                  {submissions.map((submission) => (
                    <article key={submission.public_id}>
                      <div>
                        <strong>{submission.business_name || submission.public_id}</strong>
                        <span>{formatDate(submission.created_at)}</span>
                      </div>
                      <b>{submission.analysis?.overall_score ?? 0}/100</b>
                      <span>{submission.analysis?.status ?? "Belum Dianalisis"}</span>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}
      </section>
    </DashboardShell>
  );
}
