import { useEffect, useState } from "react";
import type { PropsWithChildren } from "react";
import { useNavigate } from "react-router-dom";
import type { View } from "../../types";
import { Button } from "../atoms/Button";
import { Icon } from "../atoms/Icon";
import { Brand } from "../molecules/Brand";
import { useThemeSettings } from "../../theme/ThemeContext";

const navigation: Array<{ view: View; label: string; icon: Parameters<typeof Icon>[0]["name"] }> = [
  { view: "dashboard", label: "Beranda", icon: "home" },
  { view: "inventory", label: "Input Masalah", icon: "alert" },
  { view: "dashboard", label: "Hasil Skor", icon: "grid" },
  { view: "dashboard", label: "6 Sub-Skor", icon: "grid" },
  { view: "dashboard", label: "Rekomendasi Solusi", icon: "bulb" },
];

const sidebarCollapsedStorageKey = "gimb:sbd:sidebar-collapsed";
const routeByView: Record<View, string> = {
  landing: "/",
  dashboard: "/dashboard",
  inventory: "/inventory",
  settings: "/settings",
};

type DashboardShellProps = PropsWithChildren<{
  activeView: View;
  title?: string;
}>;

export function DashboardShell({ activeView, title = "Smart Business Dashboard", children }: DashboardShellProps) {
  const { theme, updateTheme } = useThemeSettings();
  const navigateRoute = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem(sidebarCollapsedStorageKey) === "true");

  useEffect(() => {
    localStorage.setItem(sidebarCollapsedStorageKey, String(isCollapsed));
  }, [isCollapsed]);

  const navigate = (view: View) => {
    setIsMenuOpen(false);
    navigateRoute(routeByView[view]);
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
          {navigation.map((item, index) => (
            <button
              key={`${item.label}-${index}`}
              className={activeView === item.view && index < 2 ? "active" : ""}
              data-label={item.label}
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
          <button data-label="Keluar" onClick={() => navigate("landing")}><Icon name="logout" /> <span>Keluar</span></button>
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
              <strong>{theme.ownerName}</strong>
              <small>{theme.businessName}</small>
            </span>
            <span className="avatar">{theme.ownerName.slice(0, 1)}</span>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
