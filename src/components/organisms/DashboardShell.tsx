import { useEffect, useRef, useState } from "react";
import type { PropsWithChildren } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { View } from "../../types";
import { Button } from "../atoms/Button";
import { Icon } from "../atoms/Icon";
import { Brand } from "../molecules/Brand";
import { useThemeSettings } from "../../theme/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import * as businessApi from "../../services/api/businesses";
import * as adminApi from "../../services/api/admin";
import * as notificationApi from "../../services/api/notifications";
import type { AdminNotification, NotificationEvent } from "../../services/api/types";
import { formatNotificationTime } from "../../utils/dateTime";

const sidebarCollapsedStorageKey = "gimb:sbd:sidebar-collapsed";
const showUpgradePlanButton = false; // toggle to true to bring back the sidebar "Upgrade Plan" button

function routeByView(view: View, businessId?: string) {
  const businessDashboard = businessId ? `/businesses/${businessId}/dashboard` : "/businesses";
  const score = businessId ? `/businesses/${businessId}/score` : "/businesses";
  const subScores = businessId ? `/businesses/${businessId}/sub-scores` : "/businesses";
  const inventoryInput = businessId ? `/businesses/${businessId}/inventory-input` : "/businesses";
  const inventory = businessId ? `/businesses/${businessId}/inventory/new` : "/businesses";
  const aiReport = businessId ? `/businesses/${businessId}/ai-report` : "/businesses";

  return {
    landing: "/",
    businesses: "/businesses",
    score,
    dashboard: businessDashboard,
    subscores: subScores,
    inventoryInput,
    inventory,
    aiReport,
    settings: "/settings",
    adminSummary: "/admin",
    adminDiagnosis: "/admin/diagnosis",
    adminLimit: "/admin/limit",
    adminUsers: "/admin/users",
    adminAuditLog: "/admin/audit-log",
  }[view];
}

type DashboardShellProps = PropsWithChildren<{
  activeView: View;
  title?: string;
}>;

type NavigationItem = {
  view: View;
  label: string;
  icon: Parameters<typeof Icon>[0]["name"];
  disabledReason?: string;
};

type NotificationFilter = "all" | "unread";
type RealtimeStatus = "connecting" | "connected" | "reconnecting";

export function DashboardShell({ activeView, title = "Smart Business Dashboard", children }: DashboardShellProps) {
  const { theme, updateTheme } = useThemeSettings();
  const { businessId } = useParams();
  const { user, isAdmin, accessToken, logout } = useAuth();
  const navigateRoute = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem(sidebarCollapsedStorageKey) === "true");
  const [hasInventoryResult, setHasInventoryResult] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationFilter, setNotificationFilter] = useState<NotificationFilter>("all");
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("connecting");
  const [toastNotification, setToastNotification] = useState<AdminNotification | null>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const notificationMenuRef = useRef<HTMLDivElement | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    localStorage.setItem(sidebarCollapsedStorageKey, String(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    let isMounted = true;

    async function checkInventoryResult() {
      if (!businessId) {
        setHasInventoryResult(false);
        return;
      }

      try {
        if (isAdmin) {
          await adminApi.adminLatestBusinessInventory(businessId);
        } else {
          await businessApi.latestBusinessInventory(businessId);
        }
        if (isMounted) setHasInventoryResult(true);
      } catch {
        if (isMounted) setHasInventoryResult(false);
      }
    }

    checkInventoryResult();
    return () => {
      isMounted = false;
    };
  }, [businessId, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    let isMounted = true;
    async function loadNotifications() {
      try {
        const [list, unread] = await Promise.all([
          notificationApi.adminNotifications(),
          notificationApi.unreadNotificationCount(),
        ]);
        if (!isMounted) return;
        setNotifications(list.items);
        setUnreadCount(unread.count);
      } catch {
        if (!isMounted) return;
        setNotifications([]);
        setUnreadCount(0);
      }
    }
    loadNotifications();
    return () => {
      isMounted = false;
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || !accessToken) return;
    let socket: WebSocket | null = null;
    let reconnectTimer = 0;
    let isClosed = false;

    const connect = (isReconnect = false) => {
      setRealtimeStatus(isReconnect ? "reconnecting" : "connecting");
      socket = new WebSocket(notificationApi.notificationWebSocketUrl(accessToken));
      socket.onopen = () => setRealtimeStatus("connected");
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as NotificationEvent;
          if (payload.type !== "notification.created") return;
          setNotifications((current) => [payload.notification, ...current.filter((item) => item.id !== payload.notification.id)].slice(0, 10));
          setUnreadCount((current) => current + 1);
          setToastNotification(payload.notification);
          window.dispatchEvent(new CustomEvent("gimb:admin-notification", { detail: payload.notification }));
        } catch {
          // Ignore malformed realtime payloads; REST remains the source of truth.
        }
      };
      socket.onclose = () => {
        if (!isClosed) {
          setRealtimeStatus("reconnecting");
          reconnectTimer = window.setTimeout(() => connect(true), 3000);
        }
      };
    };

    connect();
    return () => {
      isClosed = true;
      window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [accessToken, isAdmin]);

  useEffect(() => {
    if (!toastNotification) return;
    const timeout = window.setTimeout(() => setToastNotification(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [toastNotification]);

  useEffect(() => {
    if (!isNotificationOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!notificationMenuRef.current?.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [isNotificationOpen]);

  useEffect(() => {
    if (!isAccountMenuOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [isAccountMenuOpen]);

  const needsBusiness = !businessId;
  const userNavigation: NavigationItem[] = [
    { view: "businesses", label: "Daftar Toko", icon: "home" },
    { view: "dashboard", label: "Dashboard", icon: "dashboard", disabledReason: needsBusiness ? "Pilih toko dulu" : !hasInventoryResult ? "Isi inventory dulu" : undefined },
    { view: "score", label: "Hasil Skor", icon: "grid", disabledReason: needsBusiness ? "Pilih toko dulu" : !hasInventoryResult ? "Isi inventory dulu" : undefined },
    { view: "subscores", label: "Sub Skor", icon: "chart", disabledReason: needsBusiness ? "Pilih toko dulu" : !hasInventoryResult ? "Isi inventory dulu" : undefined },
    { view: "inventoryInput", label: "Hasil Input", icon: "file", disabledReason: needsBusiness ? "Pilih toko dulu" : !hasInventoryResult ? "Isi inventory dulu" : undefined },
    { view: "aiReport", label: "Laporan AI", icon: "bulb", disabledReason: needsBusiness ? "Pilih toko dulu" : !hasInventoryResult ? "Isi inventory dulu" : undefined },
    {
      view: "inventory",
      label: "Input Masalah",
      icon: "alert",
      disabledReason: needsBusiness ? "Pilih toko dulu" : hasInventoryResult ? "Sudah diisi" : undefined,
    },
  ];

  const adminNavigation: NavigationItem[] = [
    { view: "adminSummary", label: "Ringkasan", icon: "chart" },
    { view: "adminDiagnosis", label: "Diagnosis", icon: "alert" },
    { view: "adminLimit", label: "Limit", icon: "settings" },
    { view: "adminUsers", label: "User", icon: "home" },
    { view: "adminAuditLog", label: "Audit Log", icon: "file" },
  ];

  const navigation = isAdmin ? adminNavigation : userNavigation;

  const navigateToView = (view: View) => {
    setIsMenuOpen(false);
    navigateRoute(routeByView(view, businessId));
  };

  const isNavigationActive = (item: NavigationItem) => activeView === item.view;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    setIsLogoutConfirmOpen(false);
    setIsLoggingOut(false);
    navigateRoute("/login", { replace: true });
  };

  const openNotification = async (notification: AdminNotification) => {
    setIsNotificationOpen(false);
    if (!notification.read_at) {
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item));
      setUnreadCount((current) => Math.max(0, current - 1));
      await notificationApi.markNotificationRead(notification.id).catch(() => undefined);
    }
    const businessPublicId = notification.metadata.business_public_id;
    if (typeof businessPublicId === "string" && businessPublicId) {
      navigateRoute(`/admin/businesses/${businessPublicId}/inventory-input`);
    }
  };

  const markAllNotificationsRead = async () => {
    setNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })));
    setUnreadCount(0);
    await notificationApi.markAllNotificationsRead().catch(() => undefined);
  };

  const visibleNotifications = notificationFilter === "unread"
    ? notifications.filter((notification) => !notification.read_at)
    : notifications;

  const realtimeLabel = realtimeStatus === "connected" ? "Realtime aktif" : realtimeStatus === "connecting" ? "Menghubungkan realtime" : "Menyambungkan ulang";

  const openSettings = () => {
    setIsAccountMenuOpen(false);
    navigateToView("settings");
  };

  const confirmLogout = () => {
    setIsAccountMenuOpen(false);
    setIsLogoutConfirmOpen(true);
  };

  return (
    <div className={`app-shell ${isCollapsed ? "is-collapsed" : ""}`}>
      <button
        className={`sidebar-backdrop ${isMenuOpen ? "is-open" : ""}`}
        onClick={() => setIsMenuOpen(false)}
        aria-label="Tutup menu"
      />
      <aside className={`sidebar ${isMenuOpen ? "is-open" : ""}`}>
        <div className="sidebar__brand-row">
          <Brand name={theme.appName} />
          <button className="sidebar__collapse" onClick={() => setIsCollapsed((current) => !current)} aria-label={isCollapsed ? "Buka sidebar" : "Tutup sidebar"}>
            <Icon name="arrow" size={18} />
          </button>
          <button className="sidebar__close" onClick={() => setIsMenuOpen(false)} aria-label="Tutup menu">
            <Icon name="close" />
          </button>
        </div>
        <nav>
          {navigation.map((item) => (
            <button
              key={item.label}
              className={`${isNavigationActive(item) ? "active" : ""} ${item.disabledReason ? "is-disabled" : ""}`}
              data-label={item.disabledReason ? `${item.label} - ${item.disabledReason}` : item.label}
              data-tooltip={item.disabledReason}
              disabled={Boolean(item.disabledReason)}
              onClick={() => navigateToView(item.view)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar__bottom">
          {showUpgradePlanButton && !isAdmin && <Button variant="secondary" data-label="Upgrade Plan">Upgrade Plan</Button>}
          <button className={activeView === "settings" ? "active" : ""} data-label="Pengaturan" onClick={() => navigateToView("settings")}><Icon name="settings" /> <span>Pengaturan</span></button>
          <button data-label="Keluar" onClick={() => setIsLogoutConfirmOpen(true)}><Icon name="logout" /> <span>Keluar</span></button>
        </div>
      </aside>
      <main className="workspace">
        <header className="workspace__topbar">
          <button className="mobile-menu" onClick={() => setIsMenuOpen(true)} aria-label="Buka menu">
            <Icon name="menu" />
          </button>
          <h1>{title}</h1>
          <div className="user-chip">
            <button
              className={`mode-toggle ${theme.mode === "dark" ? "is-dark" : ""}`}
              onClick={() => updateTheme({ mode: theme.mode === "dark" ? "light" : "dark" })}
              aria-label={theme.mode === "dark" ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
            >
              <span className="mode-toggle__thumb" />
              <span className="mode-toggle__option">
                <Icon name="sun" size={16} />
              </span>
              <span className="mode-toggle__option">
                <Icon name="moon" size={16} />
              </span>
            </button>
            {isAdmin && (
              <div className={`notification-menu ${isNotificationOpen ? "is-open" : ""}`} ref={notificationMenuRef}>
                <button className="notification-bell" onClick={() => setIsNotificationOpen((current) => !current)} aria-label="Buka notifikasi" aria-expanded={isNotificationOpen} title={realtimeLabel}>
                  <Icon name="bell" />
                  <i className={`notification-bell__status notification-bell__status--${realtimeStatus}`} aria-label={realtimeLabel} />
                  {unreadCount > 0 && <span>{unreadCount > 99 ? "99+" : unreadCount}</span>}
                </button>
                {isNotificationOpen && (
                  <div className="notification-menu__panel">
                    <header>
                      <div>
                        <strong>Notifikasi</strong>
                        <small>{realtimeLabel}</small>
                      </div>
                      <button onClick={markAllNotificationsRead} disabled={unreadCount === 0}>Tandai dibaca</button>
                    </header>
                    <div className="notification-filter" role="tablist" aria-label="Filter notifikasi">
                      <button className={notificationFilter === "all" ? "is-active" : ""} onClick={() => setNotificationFilter("all")} role="tab" aria-selected={notificationFilter === "all"}>Semua</button>
                      <button className={notificationFilter === "unread" ? "is-active" : ""} onClick={() => setNotificationFilter("unread")} role="tab" aria-selected={notificationFilter === "unread"}>Belum dibaca</button>
                    </div>
                    {visibleNotifications.length === 0 ? (
                      <p>Belum ada notifikasi.</p>
                    ) : (
                      visibleNotifications.map((notification) => (
                        <button
                          key={notification.id}
                          className={!notification.read_at ? "is-unread" : ""}
                          onClick={() => openNotification(notification)}
                        >
                          <span className="notification-item__title">
                            <strong>{notification.title}</strong>
                            <time dateTime={notification.created_at}>{formatNotificationTime(notification.created_at)}</time>
                          </span>
                          <span>{notification.message}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
            <span>
              <strong>{user?.full_name ?? theme.ownerName}</strong>
              <small>{user?.role === "admin" ? "Admin" : user?.email ?? theme.businessName}</small>
            </span>
            <div className={`account-menu ${isAccountMenuOpen ? "is-open" : ""}`} ref={accountMenuRef}>
              <button
                className="avatar account-menu__button"
                onClick={() => setIsAccountMenuOpen((current) => !current)}
                aria-label="Buka menu akun"
                aria-expanded={isAccountMenuOpen}
              >
                {(user?.full_name ?? theme.ownerName).slice(0, 1)}
              </button>
              {isAccountMenuOpen && (
                <div className="account-menu__panel">
                  <div className="account-menu__profile">
                    <div>
                      <strong>{user?.full_name ?? theme.ownerName}</strong>
                      <small>{user?.email ?? theme.businessName}</small>
                      <b>{user?.role === "admin" ? "Admin" : "User"}</b>
                    </div>
                  </div>
                  <button onClick={openSettings}><Icon name="settings" size={18} /> Pengaturan</button>
                  <button onClick={confirmLogout}><Icon name="logout" size={18} /> Keluar</button>
                </div>
              )}
            </div>
          </div>
        </header>
        {children}
      </main>
      {toastNotification && (
        <button className="notification-toast" onClick={() => openNotification(toastNotification)} role="status">
          <span><Icon name="bell" size={18} /></span>
          <strong>
            {toastNotification.title}
            <time dateTime={toastNotification.created_at}>{formatNotificationTime(toastNotification.created_at)}</time>
          </strong>
          <small>{toastNotification.message}</small>
        </button>
      )}
      {isLogoutConfirmOpen && (
        <div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="logout-title">
          <div className="confirm-dialog__card">
            <span className="confirm-dialog__icon">
              <Icon name="logout" size={34} />
            </span>
            <h2 id="logout-title">Keluar dari dashboard?</h2>
            <p>Sesi Anda akan ditutup dan Anda akan diarahkan kembali ke halaman login.</p>
            <div className="confirm-dialog__actions">
              <Button className="btn--dashboard-hover" variant="secondary" onClick={() => setIsLogoutConfirmOpen(false)} disabled={isLoggingOut}>Tidak</Button>
              <Button className="btn--shiny-dashboard" onClick={handleLogout} disabled={isLoggingOut}>{isLoggingOut ? "Keluar..." : "Ya, Keluar"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
