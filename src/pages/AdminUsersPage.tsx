import { useEffect, useState } from "react";
import { DashboardShell } from "../components/organisms/DashboardShell";
import { Button } from "../components/atoms/Button";
import { Icon } from "../components/atoms/Icon";
import { LoadingState } from "../components/atoms/LoadingState";
import { PaginationControls } from "../components/organisms/PaginationControls";
import { useAuth } from "../context/AuthContext";
import * as adminApi from "../services/api/admin";
import type { User, UserStatus } from "../services/api/types";
import { emptyPaginationMeta, normalizePaginationMeta } from "../utils/pagination";

const defaultUserPageSize = 5;

export function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [userPage, setUserPage] = useState(0);
  const [userPageSize, setUserPageSize] = useState(defaultUserPageSize);
  const [userMeta, setUserMeta] = useState(() => emptyPaginationMeta(defaultUserPageSize));
  const [userReloadKey, setUserReloadKey] = useState(0);
  const [userError, setUserError] = useState("");
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [emailVerifyTarget, setEmailVerifyTarget] = useState<User | null>(null);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [realtimeRefreshKey, setRealtimeRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    async function loadUsers() {
      setIsUserLoading(true);
      setUserError("");
      const offset = userPage * userPageSize;
      try {
        const response = await adminApi.adminUsers({ limit: userPageSize, offset });
        if (isMounted) {
          setUsers(response.items);
          setUserMeta(normalizePaginationMeta(response.meta, response.items.length, userPageSize, offset));
        }
      } catch (err) {
        if (isMounted) {
          setUsers([]);
          setUserMeta(emptyPaginationMeta(userPageSize));
          setUserError(err instanceof Error ? err.message : "Gagal memuat user");
        }
      } finally {
        if (isMounted) setIsUserLoading(false);
      }
    }
    loadUsers();
    return () => {
      isMounted = false;
    };
  }, [userPage, userPageSize, userReloadKey]);

  useEffect(() => {
    const refreshOnNotification = () => setRealtimeRefreshKey((current) => current + 1);
    window.addEventListener("gimb:admin-notification", refreshOnNotification);
    return () => window.removeEventListener("gimb:admin-notification", refreshOnNotification);
  }, []);

  useEffect(() => {
    if (realtimeRefreshKey === 0) return;
    let isMounted = true;
    async function refresh() {
      const offset = userPage * userPageSize;
      try {
        const response = await adminApi.adminUsers({ limit: userPageSize, offset });
        if (!isMounted) return;
        setUsers(response.items);
        setUserMeta(normalizePaginationMeta(response.meta, response.items.length, userPageSize, offset));
      } catch {
        // Keep the visible data stable; manual reload still reports errors.
      }
    }
    refresh();
    return () => {
      isMounted = false;
    };
  }, [userPage, userPageSize, realtimeRefreshKey]);

  const updateStatus = async (userId: string, status: UserStatus) => {
    const updated = await adminApi.updateUserStatus(userId, status);
    setUsers((current) => current.map((user) => user.id === updated.id ? updated : user));
  };

  const verifyEmailManually = async () => {
    if (!emailVerifyTarget) return;
    setIsVerifyingEmail(true);
    setUserError("");
    try {
      const updated = await adminApi.verifyUserEmailManually(emailVerifyTarget.id);
      setUsers((current) => current.map((user) => user.id === updated.id ? updated : user));
      setEmailVerifyTarget(null);
    } catch (err) {
      setUserError(err instanceof Error ? err.message : "Gagal memverifikasi email user");
      setEmailVerifyTarget(null);
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  return (
    <DashboardShell activeView="adminUsers" title="Admin Dashboard">
      <section className="admin-page">
        <section className="admin-section panel admin-anchor">
          <div className="admin-section__heading">
            <div><h3>User</h3></div>
            <b>{userMeta.total} data</b>
          </div>
          <div className="data-table">
            {userError && (
              <article className="table-retry-state">
                <span>{userError}</span>
                <button type="button" onClick={() => setUserReloadKey((current) => current + 1)}>
                  Coba lagi <Icon name="refresh" size={16} />
                </button>
              </article>
            )}
            {!userError && isUserLoading && <LoadingState inline>Memuat user...</LoadingState>}
            {!userError && !isUserLoading && users.length === 0 && <article>Belum ada user.</article>}
            {!userError && !isUserLoading && users.map((user) => {
              const isCurrentUser = user.id === currentUser?.id;
              return (
                <article className="data-table__user-row" key={user.id}>
                  <div>
                    <strong>{user.full_name}</strong>
                    <span>{user.email}</span>
                  </div>
                  <b className={`email-verify-pill ${user.email_verified ? "is-verified" : "is-pending"}`}>
                    {user.email_verified ? "Email verified" : "Belum verified"}
                  </b>
                  <b className={`status-pill status-pill--${user.role}`}>{user.role}</b>
                  {!user.email_verified ? (
                    <button className="admin-row-action--verify" type="button" onClick={() => setEmailVerifyTarget(user)}>
                      Verifikasi
                    </button>
                  ) : (
                    <span className="admin-row-placeholder">-</span>
                  )}
                  <select
                    value={user.status}
                    disabled={isCurrentUser}
                    title={isCurrentUser ? "Admin tidak bisa mengubah status akunnya sendiri" : undefined}
                    onChange={(event) => updateStatus(user.id, event.target.value as UserStatus)}
                  >
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                    <option value="suspended">suspended</option>
                  </select>
                </article>
              );
            })}
          </div>
          <PaginationControls
            page={userPage}
            pageSize={userPageSize}
            meta={userMeta}
            isLoading={isUserLoading}
            onPageChange={setUserPage}
            onPageSizeChange={(pageSize) => {
              setUserPage(0);
              setUserPageSize(pageSize);
            }}
          />
        </section>
      </section>

      {emailVerifyTarget && (
        <div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="email-verify-confirm-title">
          <div className="confirm-dialog__card">
            <span className="confirm-dialog__icon"><Icon name="check" size={34} /></span>
            <h2 id="email-verify-confirm-title">Verifikasi manual email?</h2>
            <p>
              Akun <strong>{emailVerifyTarget.email}</strong> akan dianggap terverifikasi tanpa klik link email.
            </p>
            <div className="confirm-dialog__actions">
              <Button className="btn--dashboard-hover" variant="secondary" disabled={isVerifyingEmail} onClick={() => setEmailVerifyTarget(null)}>
                Tidak
              </Button>
              <Button className="btn--shiny-dashboard" disabled={isVerifyingEmail} onClick={verifyEmailManually}>
                {isVerifyingEmail ? "Memverifikasi..." : "Ya, Verifikasi"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
