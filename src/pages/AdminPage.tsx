import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardShell } from "../components/organisms/DashboardShell";
import { Icon } from "../components/atoms/Icon";
import * as adminApi from "../services/api/admin";
import type { AdminSummary, Business, BusinessLimitSetting, InventorySubmission, User, UserStatus } from "../services/api/types";
import { formatScore } from "../utils/number";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export function AdminPage() {
  const navigate = useNavigate();
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

  const latestSubmissionByBusinessId = submissions.reduce<Record<string, InventorySubmission>>((lookup, submission) => {
    if (submission.business_id && !lookup[submission.business_id]) lookup[submission.business_id] = submission;
    return lookup;
  }, {});

  const diagnosisWatchlist = [...submissions]
    .filter((submission) => submission.analysis)
    .sort((a, b) => (a.analysis?.overall_score ?? 0) - (b.analysis?.overall_score ?? 0))
    .slice(0, 5);

  const goToBusinessDashboard = (publicId: string) => navigate(`/businesses/${publicId}/dashboard`);
  const goToBusinessSubScores = (publicId: string) => navigate(`/businesses/${publicId}/sub-scores`);

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
                  <b>{diagnosisWatchlist.length} data</b>
                </div>
                <div className="admin-watchlist">
                  {diagnosisWatchlist.length === 0 && <article className="empty-state">Belum ada hasil diagnosis yang bisa dipantau.</article>}
                  {diagnosisWatchlist.map((submission) => {
                    const business = businesses.find((item) => item.id === submission.business_id);
                    return (
                      <article key={submission.public_id}>
                        <div>
                          <span>{submission.analysis.status}</span>
                          <strong>{submission.business_name || business?.name || submission.public_id}</strong>
                          <small>{formatDate(submission.created_at)}</small>
                        </div>
                        <b>{formatScore(submission.analysis.overall_score)}</b>
                        <div className="admin-row-actions">
                          {business && (
                            <>
                              <button onClick={() => goToBusinessDashboard(business.public_id)}>Dashboard <Icon name="arrow" size={16} /></button>
                              <button onClick={() => goToBusinessSubScores(business.public_id)}>Sub Skor <Icon name="arrow" size={16} /></button>
                            </>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
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

              <section id="businesses" className="admin-section panel admin-anchor">
                <h3>Toko</h3>
                <div className="data-table">
                  {businesses.map((business) => {
                    const latestSubmission = latestSubmissionByBusinessId[business.id];
                    return (
                      <article key={business.public_id} className="data-table__action-row">
                        <div>
                          <strong>{business.name}</strong>
                          <span>{business.industry || "Tanpa industri"}</span>
                        </div>
                        <span>{latestSubmission ? `${formatScore(latestSubmission.analysis.overall_score)} - ${latestSubmission.analysis.status}` : "Belum ada hasil"}</span>
                        <div className="admin-row-actions">
                          <button onClick={() => goToBusinessDashboard(business.public_id)} disabled={!latestSubmission}>Dashboard</button>
                          <button onClick={() => goToBusinessSubScores(business.public_id)} disabled={!latestSubmission}>Sub Skor</button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section id="submissions" className="admin-section panel admin-section--wide admin-anchor">
                <h3>Submission Terbaru</h3>
                <div className="data-table">
                  {submissions.map((submission) => (
                    (() => {
                      const business = businesses.find((item) => item.id === submission.business_id);
                      return (
                        <article key={submission.public_id}>
                          <div>
                            <strong>{submission.business_name || submission.public_id}</strong>
                            <span>{formatDate(submission.created_at)}</span>
                          </div>
                          <b>{formatScore(submission.analysis?.overall_score ?? 0)}</b>
                          <div className="admin-row-actions">
                            <span>{submission.analysis?.status ?? "Belum Dianalisis"}</span>
                            {business && <button onClick={() => goToBusinessSubScores(business.public_id)}>Sub Skor</button>}
                          </div>
                        </article>
                      );
                    })()
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
