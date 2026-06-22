import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/atoms/Button";
import { Icon } from "../components/atoms/Icon";
import { TextField } from "../components/atoms/TextField";
import { DashboardShell } from "../components/organisms/DashboardShell";
import { inventoryFields } from "../data/inventoryFields";

const storageKey = "gimb:sbd:inventory";

function readDraft() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return {};
  try {
    return JSON.parse(saved) as Record<string, string>;
  } catch {
    return {};
  }
}

export function InventoryPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState<Record<string, string>>(() => readDraft());
  const completed = inventoryFields.filter((field) => values[field.id]).length;
  const progress = Math.round((completed / inventoryFields.length) * 100);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(values));
  }, [values]);

  return (
    <DashboardShell activeView="inventory" title="Input Inventarisasi Masalah">
      <section className="inventory-page">
        <div className="form-hero">
          <h2>Lengkapi data bisnis 6 bulan terakhir</h2>
          <p>Setiap angka akan dipakai sebagai bahan diagnosis kesehatan bisnis yang lebih komprehensif.</p>
        </div>

        <div className="inventory-layout">
          <form className="inventory-form" onSubmit={(event) => event.preventDefault()}>
            <header>
              <Icon name="chart" />
              <h3>Data Keuangan & Operasional</h3>
            </header>
            <div className="inventory-form__grid">
              {inventoryFields.map((field) => (
                <TextField
                  key={field.id}
                  label={field.label}
                  prefix={field.prefix}
                  suffix={field.suffix}
                  note={field.note}
                  example={field.example}
                  type="number"
                  min="0"
                  inputMode="numeric"
                  placeholder="0"
                  value={values[field.id] ?? ""}
                  onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value }))}
                />
              ))}
            </div>
            <label className="field field--wide">
              <span className="field__label">Deskripsi masalah bisnis lainnya</span>
              <textarea
                maxLength={1000}
                placeholder="Ceritakan kendala atau tantangan spesifik yang sedang dihadapi bisnis Anda..."
                value={values.description ?? ""}
                onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
              />
              <small>Maksimal 1000 karakter. Informasi ini membantu mentor memberikan rekomendasi yang lebih tajam.</small>
            </label>
            <footer>
              <Button variant="secondary" onClick={() => navigate("/dashboard")}>Batal</Button>
              <Button onClick={() => navigate("/analysis")}>Simpan & Lanjutkan <Icon name="arrow" size={18} /></Button>
            </footer>
          </form>

          <aside className="form-aside">
            <article className="tips-card">
              <span><Icon name="bulb" /></span>
              <h3>Tips Input Akurat</h3>
              <p>Gunakan rekap laporan laba rugi dan catatan transaksi 6 bulan terakhir agar validitas skor lebih kuat.</p>
            </article>
            <article className="progress-card">
              <div>
                <span>Progress</span>
                <strong>{progress}% Complete</strong>
              </div>
              <div className="meter"><i style={{ width: `${progress}%` }} /></div>
              <ul>
                <li className="done">Identitas Bisnis</li>
                <li className="active">Inventarisasi Masalah</li>
                <li>Diagnosis & Skor</li>
              </ul>
            </article>
          </aside>
        </div>
      </section>
    </DashboardShell>
  );
}
