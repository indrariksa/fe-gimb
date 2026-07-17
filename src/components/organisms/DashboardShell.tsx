import { useEffect, useRef, useState } from "react";
import type { PropsWithChildren } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
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

const sidebarCollapsedStorageKey = "gimb:sbd:sidebar-collapsed";

function routeByView(view: View, businessId?: string) {
  const businessDashboard = businessId ? `/businesses/${businessId}/dashboard` : "/businesses";
  const score = businessId ? `/businesses/${businessId}/score` : "/businesses";
  const subScores = businessId ? `/businesses/${businessId}/sub-scores` : "/businesses";
  const inventoryInput = businessId ? `/businesses/${businessId}/inventory-input` : "/businesses";
  const inventory = businessId ? `/businesses/${businessId}/inventory/new` : "/businesses";

  return {
    landing: "/",
    businesses: "/businesses",
    score,
    dashboard: businessDashboard,
    subscores: subScores,
    inventoryInput,
    inventory,
    settings: "/settings",
    admin: "/admin",
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
  sectionId?: string;
};

export function DashboardShell({ activeView, title = "Smart Business Dashboard", children }: DashboardShellProps) {
  const { theme, updateTheme } = useThemeSettings();
  const { businessId } = useParams();
  const { user, isAdmin, accessToken, logout } = useAuth();
  const navigateRoute = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem(sidebarCollapsedStorageKey) === "true");
  const [hasInventoryResult, setHasInventoryResult] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const notificationMenuRef = useRef<HTMLDivElement | null>(null);

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

    const connect = () => {
      socket = new WebSocket(notificationApi.notificationWebSocketUrl(accessToken));
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as NotificationEvent;
          if (payload.type !== "notification.created") return;
          setNotifications((current) => [payload.notification, ...current.filter((item) => item.id !== payload.notification.id)].slice(0, 10));
          setUnreadCount((current) => current + 1);
        } catch {
          // Ignore malformed realtime payloads; REST remains the source of truth.
        }
      };
      socket.onclose = () => {
        if (!isClosed) reconnectTimer = window.setTimeout(connect, 3000);
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
    if (!isNotificationOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!notificationMenuRef.current?.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [isNotificationOpen]);

  const needsBusiness = !businessId;
  const userNavigation: NavigationItem[] = [
    { view: "businesses", label: "Daftar Toko", icon: "home" },
    { view: "dashboard", label: "Dashboard", icon: "dashboard", disabledReason: needsBusiness ? "Pilih toko dulu" : !hasInventoryResult ? "Isi inventory dulu" : undefined },
    { view: "score", label: "Hasil Skor", icon: "grid", disabledReason: needsBusiness ? "Pilih toko dulu" : !hasInventoryResult ? "Isi inventory dulu" : undefined },
    { view: "subscores", label: "Sub Skor", icon: "chart", disabledReason: needsBusiness ? "Pilih toko dulu" : !hasInventoryResult ? "Isi inventory dulu" : undefined },
    { view: "inventoryInput", label: "Hasil Input", icon: "file", disabledReason: needsBusiness ? "Pilih toko dulu" : !hasInventoryResult ? "Isi inventory dulu" : undefined },
    {
      view: "inventory",
      label: "Input Masalah",
      icon: "alert",
      disabledReason: needsBusiness ? "Pilih toko dulu" : hasInventoryResult ? "Sudah diisi" : undefined,
    },
  ];

  const adminNavigation: NavigationItem[] = [
    { view: "admin", label: "Ringkasan", icon: "chart", sectionId: "overview" },
    { view: "admin", label: "Diagnosis", icon: "alert", sectionId: "diagnoses" },
    { view: "admin", label: "Limit", icon: "settings", sectionId: "limits" },
    { view: "admin", label: "User", icon: "home", sectionId: "users" },
    { view: "admin", label: "Audit Log", icon: "file", sectionId: "audit-logs" },
  ];

  const navigation = isAdmin ? adminNavigation : userNavigation;

  const navigate = (item: NavigationItem) => {
    setIsMenuOpen(false);
    if (item.sectionId) {
      navigateRoute(`/admin#${item.sectionId}`);
      window.requestAnimationFrame(() => {
        document.getElementById(item.sectionId ?? "")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }
    navigateRoute(routeByView(item.view, businessId));
  };

  const navigateToView = (view: View) => {
    setIsMenuOpen(false);
    navigateRoute(routeByView(view, businessId));
  };

  const isNavigationActive = (item: NavigationItem) => {
    if (!item.sectionId) return activeView === item.view;
    if (activeView !== "admin") return false;
    if (!location.hash) return item.sectionId === "overview";
    return location.hash === `#${item.sectionId}`;
  };

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
              onClick={() => navigate(item)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar__bottom">
          {!isAdmin && <Button variant="secondary" data-label="Upgrade Plan">Upgrade Plan</Button>}
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
                <button className="notification-bell" onClick={() => setIsNotificationOpen((current) => !current)} aria-label="Buka notifikasi" aria-expanded={isNotificationOpen}>
                  <Icon name="bell" />
                  {unreadCount > 0 && <span>{unreadCount > 99 ? "99+" : unreadCount}</span>}
                </button>
                {isNotificationOpen && (
                  <div className="notification-menu__panel">
                    <header>
                      <strong>Notifikasi</strong>
                      <button onClick={markAllNotificationsRead} disabled={unreadCount === 0}>Tandai dibaca</button>
                    </header>
                    {notifications.length === 0 ? (
                      <p>Belum ada notifikasi.</p>
                    ) : (
                      notifications.map((notification) => (
                        <button
                          key={notification.id}
                          className={!notification.read_at ? "is-unread" : ""}
                          onClick={() => openNotification(notification)}
                        >
                          <strong>{notification.title}</strong>
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
            <span className="avatar">{(user?.full_name ?? theme.ownerName).slice(0, 1)}</span>
          </div>
        </header>
        {children}
      </main>
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
