import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { DashboardShell } from "../components/organisms/DashboardShell";
import { Button } from "../components/atoms/Button";
import { Icon } from "../components/atoms/Icon";
import * as adminApi from "../services/api/admin";

export function AdminLimitPage() {
  const [businessLimitInput, setBusinessLimitInput] = useState("2");
  const [settingMessage, setSettingMessage] = useState("");
  const [isSavingLimit, setIsSavingLimit] = useState(false);
  const [isLimitConfirmOpen, setIsLimitConfirmOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const limitData = await adminApi.adminBusinessLimit();
        if (isMounted) setBusinessLimitInput(String(limitData.value));
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : "Gagal memuat limit toko");
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const saveBusinessLimit = (event: FormEvent) => {
    event.preventDefault();
    setSettingMessage("");
    setIsLimitConfirmOpen(true);
  };

  const confirmBusinessLimitSave = async () => {
    setIsSavingLimit(true);
    try {
      const updated = await adminApi.updateBusinessLimit(Number(businessLimitInput));
      setBusinessLimitInput(String(updated.value));
      setSettingMessage("Limit toko per user berhasil diperbarui.");
    } catch (err) {
      setSettingMessage(err instanceof Error ? err.message : "Gagal memperbarui limit toko");
    } finally {
      setIsSavingLimit(false);
      setIsLimitConfirmOpen(false);
    }
  };

  return (
    <DashboardShell activeView="adminLimit" title="Admin Dashboard">
      <section className="admin-page">
        {error && <article className="panel empty-state retry-state"><span>{error}</span></article>}
        <section className="admin-section panel admin-anchor">
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
            <button className="btn btn--shiny-dashboard" type="submit" disabled={isSavingLimit}>
              {isSavingLimit ? "Menyimpan..." : "Simpan Limit"}
            </button>
            {settingMessage && <p>{settingMessage}</p>}
          </form>
        </section>
      </section>

      {isLimitConfirmOpen && (
        <div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="limit-confirm-title">
          <div className="confirm-dialog__card">
            <span className="confirm-dialog__icon"><Icon name="settings" size={34} /></span>
            <h2 id="limit-confirm-title">Simpan perubahan limit?</h2>
            <p>Limit toko per user akan diubah menjadi <strong>{businessLimitInput}</strong>.</p>
            <div className="confirm-dialog__actions">
              <Button className="btn--dashboard-hover" variant="secondary" disabled={isSavingLimit} onClick={() => setIsLimitConfirmOpen(false)}>
                Tidak
              </Button>
              <Button className="btn--shiny-dashboard" disabled={isSavingLimit} onClick={confirmBusinessLimitSave}>
                {isSavingLimit ? "Menyimpan..." : "Ya, Simpan"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
