import { useEffect, useState } from "react";
import type { PropsWithChildren } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { View } from "../../types";
import { Button } from "../atoms/Button";
import { Icon } from "../atoms/Icon";
import { Brand } from "../molecules/Brand";
import { useThemeSettings } from "../../theme/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import * as businessApi from "../../services/api/businesses";

const sidebarCollapsedStorageKey = "gimb:sbd:sidebar-collapsed";

function routeByView(view: View, businessId?: string) {
  const businessDashboard = businessId ? `/businesses/${businessId}/dashboard` : "/businesses";
  const score = businessId ? `/businesses/${businessId}/score` : "/businesses";
  const subScores = businessId ? `/businesses/${businessId}/sub-scores` : "/businesses";
  const inventory = businessId ? `/businesses/${businessId}/inventory/new` : "/businesses";

  return {
    landing: "/",
    businesses: "/businesses",
    score,
    dashboard: businessDashboard,
    subscores: subScores,
    inventory,
    settings: "/settings",
    admin: "/admin",
  }[view];
}

type DashboardShellProps = PropsWithChildren<{
  activeView: View;
  title?: string;
}>;

export function DashboardShell({ activeView, title = "Smart Business Dashboard", children }: DashboardShellProps) {
  const { theme, updateTheme } = useThemeSettings();
  const { businessId } = useParams();
  const { user, isAdmin, logout } = useAuth();
  const navigateRoute = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem(sidebarCollapsedStorageKey) === "true");
  const [hasInventoryResult, setHasInventoryResult] = useState(false);

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
        await businessApi.latestBusinessInventory(businessId);
        if (isMounted) setHasInventoryResult(true);
      } catch {
        if (isMounted) setHasInventoryResult(false);
      }
    }

    checkInventoryResult();
    return () => {
      isMounted = false;
    };
  }, [businessId]);

  const needsBusiness = !businessId;
  const navigation: Array<{ view: View; label: string; icon: Parameters<typeof Icon>[0]["name"]; disabledReason?: string }> = [
    { view: "businesses", label: "Daftar Toko", icon: "home" },
    { view: "dashboard", label: "Dashboard", icon: "home", disabledReason: needsBusiness ? "Pilih toko dulu" : !hasInventoryResult ? "Isi inventory dulu" : undefined },
    { view: "score", label: "Hasil Skor", icon: "grid", disabledReason: needsBusiness ? "Pilih toko dulu" : !hasInventoryResult ? "Isi inventory dulu" : undefined },
    { view: "subscores", label: "Sub Skor", icon: "chart", disabledReason: needsBusiness ? "Pilih toko dulu" : !hasInventoryResult ? "Isi inventory dulu" : undefined },
    {
      view: "inventory",
      label: "Input Masalah",
      icon: "alert",
      disabledReason: needsBusiness ? "Pilih toko dulu" : hasInventoryResult ? "Sudah diisi" : undefined,
    },
    ...(isAdmin ? [{ view: "admin" as View, label: "Admin", icon: "settings" as Parameters<typeof Icon>[0]["name"] }] : []),
  ];

  const navigate = (view: View) => {
    setIsMenuOpen(false);
    navigateRoute(routeByView(view, businessId));
  };

  const handleLogout = async () => {
    await logout();
    navigateRoute("/");
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
              className={`${activeView === item.view ? "active" : ""} ${item.disabledReason ? "is-disabled" : ""}`}
              data-label={item.disabledReason ? `${item.label} - ${item.disabledReason}` : item.label}
              data-tooltip={item.disabledReason}
              disabled={Boolean(item.disabledReason)}
              onClick={() => navigate(item.view)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar__bottom">
          <Button variant="secondary" data-label="Upgrade Plan">Upgrade Plan</Button>
          <button className={activeView === "settings" ? "active" : ""} data-label="Pengaturan" onClick={() => navigate("settings")}><Icon name="settings" /> <span>Pengaturan</span></button>
          <button data-label="Keluar" onClick={handleLogout}><Icon name="logout" /> <span>Keluar</span></button>
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
            <Icon name="bell" />
            <span>
              <strong>{user?.full_name ?? theme.ownerName}</strong>
              <small>{user?.role === "admin" ? "Admin" : theme.businessName}</small>
            </span>
            <span className="avatar">{(user?.full_name ?? theme.ownerName).slice(0, 1)}</span>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
