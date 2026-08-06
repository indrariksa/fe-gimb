import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { DashboardShell } from "../components/organisms/DashboardShell";
import { ConfirmDialog } from "../components/molecules/ConfirmDialog";
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
        <ConfirmDialog
          variant="dashboard"
          titleId="limit-confirm-title"
          icon="settings"
          title="Simpan perubahan limit?"
          message={<>Limit toko per user akan diubah menjadi <strong>{businessLimitInput}</strong>.</>}
          cancelLabel="Tidak"
          confirmLabel={isSavingLimit ? "Menyimpan..." : "Ya, Simpan"}
          onCancel={() => setIsLimitConfirmOpen(false)}
          onConfirm={confirmBusinessLimitSave}
          isBusy={isSavingLimit}
        />
      )}
    </DashboardShell>
  );
}
