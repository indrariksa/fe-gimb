import { useEffect, useState } from "react";
import { Button } from "../atoms/Button";
import { Icon } from "../atoms/Icon";
import { TextField } from "../atoms/TextField";
import { useThemeSettings } from "../../theme/ThemeContext";
import type { ThemeSettings } from "../../types";

type ThemeCustomizerProps = {
  scope?: "full" | "colors";
};

type ColorKey = "primaryColor" | "accentColor" | "successColor";

const colorFields: Array<{ key: ColorKey; label: string }> = [
  { key: "primaryColor", label: "Warna utama" },
  { key: "accentColor", label: "Warna aksen" },
  { key: "successColor", label: "Warna status positif" },
];

function normalizeHex(value: string) {
  const clean = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(clean)) return clean.toUpperCase();
  if (/^[0-9a-fA-F]{6}$/.test(clean)) return `#${clean.toUpperCase()}`;
  return "";
}

export function ThemeCustomizer({ scope = "full" }: ThemeCustomizerProps) {
  const { theme, updateTheme, resetTheme } = useThemeSettings();
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [hexDrafts, setHexDrafts] = useState<Record<ColorKey, string>>({
    primaryColor: theme.primaryColor.toUpperCase(),
    accentColor: theme.accentColor.toUpperCase(),
    successColor: theme.successColor.toUpperCase(),
  });
  const isColorsOnly = scope === "colors";

  useEffect(() => {
    setHexDrafts({
      primaryColor: theme.primaryColor.toUpperCase(),
      accentColor: theme.accentColor.toUpperCase(),
      successColor: theme.successColor.toUpperCase(),
    });
  }, [theme.primaryColor, theme.accentColor, theme.successColor]);

  const updateColor = (key: ColorKey, value: string) => {
    const normalized = normalizeHex(value);
    setHexDrafts((current) => ({ ...current, [key]: value }));
    if (normalized) updateTheme({ [key]: normalized } as Pick<ThemeSettings, ColorKey>);
  };

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
        {colorFields.map((field) => (
          <label className="field theme-color-field" key={field.key}>
            <span className="field__label">{field.label}</span>
            <div className="theme-color-row">
              <input
                aria-label={`${field.label} picker`}
                type="color"
                value={theme[field.key]}
                onChange={(event) => updateColor(field.key, event.target.value)}
              />
              <input
                aria-label={`${field.label} kode hex`}
                className="theme-hex-input"
                inputMode="text"
                maxLength={7}
                spellCheck={false}
                value={hexDrafts[field.key]}
                onBlur={() => {
                  const normalized = normalizeHex(hexDrafts[field.key]);
                  setHexDrafts((current) => ({ ...current, [field.key]: normalized || theme[field.key].toUpperCase() }));
                }}
                onChange={(event) => updateColor(field.key, event.target.value)}
              />
            </div>
          </label>
        ))}
      </div>
      {isColorsOnly && (
        <div className="theme-preview" aria-label="Preview tema">
          <div className="theme-preview__bar">
            <span />
            <strong>Preview tema</strong>
            <i />
          </div>
          <div className="theme-preview__body">
            <div>
              <span>Panel dashboard</span>
              <strong>Skor 92.7</strong>
            </div>
            <button type="button">Aksi utama</button>
          </div>
        </div>
      )}
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
