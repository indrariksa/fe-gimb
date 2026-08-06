import { useEffect, useState } from "react";
import { Button } from "../atoms/Button";
import { ConfirmDialog } from "./ConfirmDialog";
import { useThemeSettings } from "../../theme/ThemeContext";
import type { ThemeSettings } from "../../types";

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

export function ThemeCustomizer() {
  const { theme, updateTheme, resetTheme } = useThemeSettings();
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [hexDrafts, setHexDrafts] = useState<Record<ColorKey, string>>({
    primaryColor: theme.primaryColor.toUpperCase(),
    accentColor: theme.accentColor.toUpperCase(),
    successColor: theme.successColor.toUpperCase(),
  });

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
    <section className="theme-panel theme-panel--colors-only" aria-label="Kustomisasi tema">
      <div>
        <h3>Warna tampilan</h3>
        <p>Pilih warna yang nyaman untuk membaca dashboard. Pengaturan tersimpan lokal di perangkat ini.</p>
      </div>
      <div className="theme-panel__grid">
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
      <Button className="btn--dashboard-hover" variant="secondary" onClick={() => setIsResetConfirmOpen(true)}>Reset Tema</Button>
      {isResetConfirmOpen && (
        <ConfirmDialog
          titleId="theme-reset-title"
          icon="palette"
          title="Reset tema?"
          message="Warna dan preferensi tampilan lokal akan dikembalikan ke pengaturan awal."
          cancelLabel="Batal"
          confirmLabel="Ya, Reset"
          onCancel={() => setIsResetConfirmOpen(false)}
          onConfirm={() => {
            resetTheme();
            setIsResetConfirmOpen(false);
          }}
        />
      )}
    </section>
  );
}
