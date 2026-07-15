import { useState } from "react";
import { Button } from "../atoms/Button";
import { Icon } from "../atoms/Icon";
import { TextField } from "../atoms/TextField";
import { useThemeSettings } from "../../theme/ThemeContext";

type ThemeCustomizerProps = {
  scope?: "full" | "colors";
};

export function ThemeCustomizer({ scope = "full" }: ThemeCustomizerProps) {
  const { theme, updateTheme, resetTheme } = useThemeSettings();
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const isColorsOnly = scope === "colors";

  return (
    <section className={`theme-panel ${isColorsOnly ? "theme-panel--colors-only" : ""}`} aria-label="Kustomisasi tema">
      <div>
        <h3>{isColorsOnly ? "Warna tampilan" : "Kustomisasi Tema"}</h3>
        <p>
          {isColorsOnly
            ? "Pilih warna yang nyaman untuk membaca dashboard. Pengaturan tersimpan lokal di perangkat ini."
            : "Pengaturan ini tersimpan lokal dan siap disambungkan ke backend nanti."}
        </p>
      </div>
      <div className="theme-panel__grid">
        {!isColorsOnly && (
          <>
            <TextField label="Nama aplikasi" value={theme.appName} onChange={(event) => updateTheme({ appName: event.target.value })} />
            <TextField label="Nama bisnis" value={theme.businessName} onChange={(event) => updateTheme({ businessName: event.target.value })} />
            <TextField label="Nama owner" value={theme.ownerName} onChange={(event) => updateTheme({ ownerName: event.target.value })} />
          </>
        )}
        {!isColorsOnly && (
          <div className="field">
            <span className="field__label">Mode tampilan</span>
            <div className="theme-switch" role="group" aria-label="Mode tampilan">
              <button className={theme.mode === "light" ? "active" : ""} onClick={() => updateTheme({ mode: "light" })}>Terang</button>
              <button className={theme.mode === "dark" ? "active" : ""} onClick={() => updateTheme({ mode: "dark" })}>Gelap</button>
            </div>
          </div>
        )}
        <label className="field">
          <span className="field__label">Warna utama</span>
          <input type="color" value={theme.primaryColor} onChange={(event) => updateTheme({ primaryColor: event.target.value })} />
        </label>
        <label className="field">
          <span className="field__label">Warna aksen</span>
          <input type="color" value={theme.accentColor} onChange={(event) => updateTheme({ accentColor: event.target.value })} />
        </label>
        <label className="field">
          <span className="field__label">Warna status positif</span>
          <input type="color" value={theme.successColor} onChange={(event) => updateTheme({ successColor: event.target.value })} />
        </label>
      </div>
      <Button className="btn--dashboard-hover" variant="secondary" onClick={() => setIsResetConfirmOpen(true)}>Reset Tema</Button>
      {isResetConfirmOpen && (
        <div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="theme-reset-title">
          <div className="confirm-dialog__card">
            <span className="confirm-dialog__icon">
              <Icon name="palette" size={34} />
            </span>
            <h2 id="theme-reset-title">Reset tema?</h2>
            <p>Warna dan preferensi tampilan lokal akan dikembalikan ke pengaturan awal.</p>
            <div className="confirm-dialog__actions">
              <Button variant="secondary" onClick={() => setIsResetConfirmOpen(false)}>Batal</Button>
              <Button
                onClick={() => {
                  resetTheme();
                  setIsResetConfirmOpen(false);
                }}
              >
                Ya, Reset
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
