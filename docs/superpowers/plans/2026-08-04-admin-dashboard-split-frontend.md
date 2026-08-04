# Admin Dashboard Route Split — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single `/admin` page (which fetches all 6 admin datasets on every load via anchor-scroll "sections") with 5 real routes — `/admin`, `/admin/diagnosis`, `/admin/limit`, `/admin/users`, `/admin/audit-log` — each fetching only its own data, plus 4 new analytics charts on `/admin`.

**Architecture:** `src/pages/AdminPage.tsx` (977 lines) is deleted and replaced by 5 focused page components, following the exact pattern already used for regular users in `App.tsx` (`DashboardPage`, `ScoreResultPage`, `SubScoresPage`, etc. — one route, one component, one fetch). Shared pagination logic moves out into `src/utils/pagination.ts` and `src/components/organisms/PaginationControls.tsx` so the 3 paginated pages (Diagnosis, User, Audit Log) don't duplicate it. The 4 new charts reuse the existing `AIReportChart` component and `AIReportChartData` type verbatim (already generic — used today for AI report charts) — no new chart component or dependency.

**Tech Stack:** React 19, TypeScript, react-router-dom v7. No new dependencies.

**Depends on:** The backend plan (`be-gimb/docs/superpowers/plans/2026-08-04-admin-dashboard-split-backend.md`) must be implemented first — Task 5 of this plan calls `GET /admin/dashboard/analytics`, which doesn't exist until that plan's Task 6 is done.

## Global Constraints

- No new npm dependency for charts — reuse `components/organisms/AIReportChart.tsx` and the `AIReportChartData` type from `services/api/types.ts`, matching this codebase's existing hand-rolled-SVG pattern.
- This repo has no test runner configured (`package.json` has no `test` script, no vitest/jest config, no `*.test.tsx` files) — verification is `npx tsc --noEmit`, `npm run build`, and a manual browser walkthrough. Do not invent a test framework setup that isn't already in this repo.
- Preserve every existing CSS class name referenced by the moved JSX (`admin-grid`, `admin-metric`, `admin-section`, `admin-table`, `data-table`, `audit-log-panel`, `inventory-insight-grid`, etc.) — this plan does not touch `src/styles`.
- Preserve all existing route paths that are *not* `/admin` itself (`/admin/businesses/:businessId/inventory-input`, `/admin/businesses/:businessId/ai-report`) — only the bare `/admin` section splits.

---

### Task 1: Add `adminAnalytics()` API client function and response type

**Files:**
- Modify: `src/services/api/types.ts`
- Modify: `src/services/api/admin.ts`

**Interfaces:**
- Produces: `type AdminAnalyticsResponse = { charts: AIReportChartData[] }`, `function adminAnalytics(): Promise<AdminAnalyticsResponse>` — consumed by Task 6 (`AdminSummaryPage`).

- [ ] **Step 1: Add the response type**

In `src/services/api/types.ts`, add right after the `AdminSummary` type (after line 186):

```ts
export type AdminAnalyticsResponse = {
  charts: AIReportChartData[];
};
```

`AIReportChartData` is declared later in this same file (line 259) — TypeScript type aliases don't need to be declared before use within a module, so this is valid as-is.

- [ ] **Step 2: Add the API client function**

In `src/services/api/admin.ts`, add the type to the import list on line 2 and add the function after `adminSummary` (after line 6):

```ts
import { apiRequest } from "./client";
import type { AdminAnalyticsResponse, AdminSummary, AIReport, AuditLog, Business, BusinessLimitSetting, InventorySubmission, ListResponse, User, UserStatus } from "./types";

export function adminSummary() {
  return apiRequest<AdminSummary>("/admin/dashboard/summary");
}

export function adminAnalytics() {
  return apiRequest<AdminAnalyticsResponse>("/admin/dashboard/analytics");
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit` (from `fe-gimb/`)
Expected: no errors (nothing calls `adminAnalytics` yet, so this only checks syntax).

- [ ] **Step 4: Commit**

```bash
git add src/services/api/types.ts src/services/api/admin.ts
git commit -m "feat(api): add adminAnalytics client function and response type"
```

---

### Task 2: Extract pagination utilities

**Files:**
- Create: `src/utils/pagination.ts`

**Interfaces:**
- Produces: `emptyPaginationMeta(limit: number): PaginationMeta`, `normalizePaginationMeta(meta: Partial<PaginationMeta> | undefined, itemCount: number, limit: number, offset: number): PaginationMeta`, `paginationPages(currentPage: number, totalPages: number): Array<number | string>` — consumed by Task 3 (`PaginationControls`) and Tasks 7-9 (Diagnosis/User/Audit Log pages).

This is a verbatim move of `src/pages/AdminPage.tsx` lines 106-153 (`emptyPaginationMeta`, `normalizePaginationMeta`, `paginationPages`) — no logic changes.

- [ ] **Step 1: Create the file**

```ts
import type { PaginationMeta } from "../services/api/types";

export function emptyPaginationMeta(limit: number): PaginationMeta {
  return {
    limit,
    offset: 0,
    count: 0,
    total: 0,
    page: 1,
    total_pages: 0,
    has_next: false,
    has_prev: false,
  };
}

export function normalizePaginationMeta(meta: Partial<PaginationMeta> | undefined, itemCount: number, limit: number, offset: number): PaginationMeta {
  const count = Number.isFinite(meta?.count) ? Number(meta?.count) : itemCount;
  const total = Number.isFinite(meta?.total) ? Number(meta?.total) : offset + count;
  const page = Number.isFinite(meta?.page) ? Number(meta?.page) : Math.floor(offset / limit) + 1;
  const totalPages = Number.isFinite(meta?.total_pages)
    ? Number(meta?.total_pages)
    : total > 0 ? Math.max(1, Math.ceil(total / limit)) : 0;

  return {
    limit: Number.isFinite(meta?.limit) ? Number(meta?.limit) : limit,
    offset: Number.isFinite(meta?.offset) ? Number(meta?.offset) : offset,
    count,
    total,
    page,
    total_pages: totalPages,
    has_next: typeof meta?.has_next === "boolean" ? meta.has_next : count === limit,
    has_prev: typeof meta?.has_prev === "boolean" ? meta.has_prev : offset > 0,
  };
}

export function paginationPages(currentPage: number, totalPages: number) {
  if (totalPages <= 0) return [1];
  if (totalPages <= 6) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  const sorted = Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  return sorted.reduce<Array<number | string>>((acc, page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) acc.push(`ellipsis-${page}`);
    acc.push(page);
    return acc;
  }, []);
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/utils/pagination.ts
git commit -m "refactor(admin): extract pagination helpers to src/utils/pagination.ts"
```

---

### Task 3: Extract `PaginationControls` component

**Files:**
- Create: `src/components/organisms/PaginationControls.tsx`

**Interfaces:**
- Consumes: `paginationPages` (Task 2), `PaginationMeta` (`services/api/types.ts`), `Icon` (`components/atoms/Icon.tsx`).
- Produces: `<PaginationControls page pageSize meta isLoading onPageChange onPageSizeChange />` — consumed by Tasks 7-9.

Verbatim move of `AdminPage.tsx` lines 101 (`paginationSizeOptions`) and 155-257 (`PaginationControlsProps` type + `PaginationControls` component) — no logic changes.

- [ ] **Step 1: Create the file**

```tsx
import { useState } from "react";
import { Icon } from "../atoms/Icon";
import type { PaginationMeta } from "../../services/api/types";
import { paginationPages } from "../../utils/pagination";

const paginationSizeOptions = [5, 10, 20, 50];

type PaginationControlsProps = {
  page: number;
  pageSize: number;
  meta: PaginationMeta;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

export function PaginationControls({ page, pageSize, meta, isLoading, onPageChange, onPageSizeChange }: PaginationControlsProps) {
  const [isSizeMenuOpen, setIsSizeMenuOpen] = useState(false);
  const start = meta.count === 0 ? 0 : meta.offset + 1;
  const end = meta.offset + meta.count;
  const canGoNext = meta.has_next;
  const displayPage = page + 1;
  const totalPages = meta.total_pages || displayPage;
  const pages = paginationPages(displayPage, totalPages);

  return (
    <div className="admin-pagination">
      <div className="admin-pagination__meta">
        <span>
          {isLoading
            ? "Memuat data..."
            : meta.total > 0
              ? `Showing ${start} to ${end} of ${meta.total} entries`
              : "Showing 0 entries"}
        </span>
        <label>
          Tampilkan
          <span className="admin-pagination__size">
            <button
              type="button"
              className={isSizeMenuOpen ? "is-open" : ""}
              aria-haspopup="listbox"
              aria-expanded={isSizeMenuOpen}
              disabled={isLoading}
              onClick={() => setIsSizeMenuOpen((current) => !current)}
            >
              {pageSize}
              <Icon name="chevron" size={16} />
            </button>
            {isSizeMenuOpen && (
              <span className="admin-pagination__size-menu" role="listbox" aria-label="Jumlah data yang ditampilkan">
                {paginationSizeOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="option"
                    aria-selected={option === pageSize}
                    className={option === pageSize ? "is-selected" : ""}
                    disabled={isLoading}
                    onClick={() => {
                      setIsSizeMenuOpen(false);
                      onPageSizeChange(option);
                    }}
                  >
                    {option === pageSize && <Icon name="check" size={16} />}
                    <span>{option}</span>
                  </button>
                ))}
              </span>
            )}
          </span>
          data
          <select
            className="admin-pagination__native-size"
            value={pageSize}
            disabled={isLoading}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            aria-hidden="true"
            tabIndex={-1}
          >
            {paginationSizeOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="admin-pagination__controls">
        <button type="button" disabled={!meta.has_prev || isLoading} onClick={() => onPageChange(Math.max(0, page - 1))}>Previous</button>
        <div className="admin-pagination__pages" aria-label="Pilihan halaman">
          {pages.map((pageItem) => (
            typeof pageItem === "number" ? (
              <button
                key={pageItem}
                type="button"
                className={pageItem === displayPage ? "is-active" : ""}
                disabled={isLoading}
                onClick={() => onPageChange(pageItem - 1)}
              >
                {pageItem}
              </button>
            ) : (
              <span key={pageItem}>...</span>
            )
          ))}
        </div>
        <button type="button" disabled={!canGoNext || isLoading} onClick={() => onPageChange(page + 1)}>Next</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/organisms/PaginationControls.tsx
git commit -m "refactor(admin): extract PaginationControls to its own component file"
```

---

### Task 4: Add the 5 admin views to `View` and update `DashboardShell` navigation

**Files:**
- Modify: `src/types.ts`
- Modify: `src/components/organisms/DashboardShell.tsx`
- Modify: `src/pages/AdminInventoryDetailPage.tsx:137`

**Interfaces:**
- Produces: `View` now includes `"adminSummary" | "adminDiagnosis" | "adminLimit" | "adminUsers" | "adminAuditLog"` instead of `"admin"` — consumed by Tasks 6-10 (the 5 new pages) and `AdminInventoryDetailPage.tsx`.

- [ ] **Step 1: Update the `View` type**

In `src/types.ts` line 1, replace `"admin"` with the 5 new values:

```ts
export type View = "landing" | "businesses" | "score" | "dashboard" | "subscores" | "inventoryInput" | "inventory" | "aiReport" | "settings" | "adminSummary" | "adminDiagnosis" | "adminLimit" | "adminUsers" | "adminAuditLog";
```

- [ ] **Step 2: Update `routeByView` in `DashboardShell.tsx`**

Replace line 37 (`admin: "/admin",`) with:

```ts
    adminSummary: "/admin",
    adminDiagnosis: "/admin/diagnosis",
    adminLimit: "/admin/limit",
    adminUsers: "/admin/users",
    adminAuditLog: "/admin/audit-log",
```

- [ ] **Step 3: Remove `sectionId` from `NavigationItem` and simplify navigation**

Remove the `sectionId?: string;` field from the `NavigationItem` type (line 51):

```ts
type NavigationItem = {
  view: View;
  label: string;
  icon: Parameters<typeof Icon>[0]["name"];
  disabledReason?: string;
};
```

Replace `adminNavigation` (lines 215-221):

```ts
  const adminNavigation: NavigationItem[] = [
    { view: "adminSummary", label: "Ringkasan", icon: "chart" },
    { view: "adminDiagnosis", label: "Diagnosis", icon: "alert" },
    { view: "adminLimit", label: "Limit", icon: "settings" },
    { view: "adminUsers", label: "User", icon: "home" },
    { view: "adminAuditLog", label: "Audit Log", icon: "file" },
  ];
```

Delete the `navigate` function (lines 225-235) — with `sectionId` gone it's identical to `navigateToView`, which already exists below it. Update the sidebar button's `onClick` (around line 317) from `onClick={() => navigate(item)}` to `onClick={() => navigateToView(item.view)}`.

Replace `isNavigationActive` (lines 242-247):

```ts
  const isNavigationActive = (item: NavigationItem) => activeView === item.view;
```

- [ ] **Step 4: Fix the other page that used the old `"admin"` view value**

In `src/pages/AdminInventoryDetailPage.tsx:137`, this page is shared between the admin route (`/admin/businesses/:businessId/inventory-input`, reached from the Diagnosis table's "Lihat Input" button) and the regular user route (`/businesses/:businessId/inventory-input`). Update it to highlight "Diagnosis" in the sidebar when an admin is viewing it:

```tsx
    <DashboardShell activeView={isAdmin ? "adminDiagnosis" : "inventoryInput"} title="Detail Data Inventarisasi">
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: errors pointing at `src/pages/AdminPage.tsx` (it still uses `activeView="admin"`, which no longer exists) and `src/App.tsx` (still imports/renders `<AdminPage />`) — these are expected and resolved by Tasks 5-10. No errors should appear in `DashboardShell.tsx`, `types.ts`, or `AdminInventoryDetailPage.tsx` themselves.

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/components/organisms/DashboardShell.tsx src/pages/AdminInventoryDetailPage.tsx
git commit -m "refactor(admin): split admin View into 5 route-backed values"
```

---

### Task 5: Update `App.tsx` routing

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `AdminSummaryPage`, `AdminDiagnosisPage`, `AdminLimitPage`, `AdminUsersPage`, `AdminAuditLogPage` (Tasks 6-10 — these imports will be unresolved until those tasks land; that's expected, see Step 3).

- [ ] **Step 1: Replace the `AdminPage` import**

Remove line 8 (`import { AdminPage } from "./pages/AdminPage";`) and add:

```ts
import { AdminAuditLogPage } from "./pages/AdminAuditLogPage";
import { AdminDiagnosisPage } from "./pages/AdminDiagnosisPage";
import { AdminLimitPage } from "./pages/AdminLimitPage";
import { AdminSummaryPage } from "./pages/AdminSummaryPage";
import { AdminUsersPage } from "./pages/AdminUsersPage";
```

Keep the import list alphabetically sorted, matching this file's existing style.

- [ ] **Step 2: Replace the `/admin` route block**

Replace lines 51-55:

```tsx
            <Route element={<RequireAuth adminOnly />}>
              <Route path="/admin" element={<AdminSummaryPage />} />
              <Route path="/admin/diagnosis" element={<AdminDiagnosisPage />} />
              <Route path="/admin/limit" element={<AdminLimitPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/audit-log" element={<AdminAuditLogPage />} />
              <Route path="/admin/businesses/:businessId/inventory-input" element={<AdminInventoryDetailPage />} />
              <Route path="/admin/businesses/:businessId/ai-report" element={<AIReportPage />} />
            </Route>
```

- [ ] **Step 3: Type-check (expected to still fail until Tasks 6-10 land)**

Run: `npx tsc --noEmit`
Expected: errors like `Cannot find module './pages/AdminSummaryPage'` for each of the 5 new imports — this is expected at this point in the plan since those files don't exist yet. Do not treat this as a regression; proceed to Task 6.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "refactor(admin): route /admin to 5 separate page components"
```

---

### Task 6: `AdminSummaryPage.tsx` (Ringkasan + 4 charts)

**Files:**
- Create: `src/pages/AdminSummaryPage.tsx`

**Interfaces:**
- Consumes: `adminApi.adminSummary`, `adminApi.adminBusinessLimit`, `adminApi.adminAnalytics` (Task 1), `AIReportChart` component, `AdminSummary`/`BusinessLimitSetting`/`AIReportChartData` types.
- Produces: `export function AdminSummaryPage()` — consumed by Task 5 (`App.tsx`).

- [ ] **Step 1: Create the file**

```tsx
import { useEffect, useState } from "react";
import { DashboardShell } from "../components/organisms/DashboardShell";
import { Button } from "../components/atoms/Button";
import { Icon } from "../components/atoms/Icon";
import { LoadingState } from "../components/atoms/LoadingState";
import { HolographicCard } from "../components/molecules/HolographicCard";
import { AIReportChart } from "../components/organisms/AIReportChart";
import * as adminApi from "../services/api/admin";
import type { AdminSummary, AIReportChartData, BusinessLimitSetting } from "../services/api/types";

export function AdminSummaryPage() {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [businessLimit, setBusinessLimit] = useState<BusinessLimitSetting | null>(null);
  const [charts, setCharts] = useState<AIReportChartData[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [realtimeRefreshKey, setRealtimeRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const [summaryData, limitData, analyticsData] = await Promise.all([
          adminApi.adminSummary(),
          adminApi.adminBusinessLimit(),
          adminApi.adminAnalytics(),
        ]);
        if (isMounted) {
          setSummary(summaryData);
          setBusinessLimit(limitData);
          setCharts(analyticsData.charts);
        }
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : "Gagal memuat ringkasan admin");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    const refreshOnNotification = () => setRealtimeRefreshKey((current) => current + 1);
    window.addEventListener("gimb:admin-notification", refreshOnNotification);
    return () => window.removeEventListener("gimb:admin-notification", refreshOnNotification);
  }, []);

  useEffect(() => {
    if (realtimeRefreshKey === 0) return;
    let isMounted = true;
    async function refresh() {
      try {
        const [summaryData, limitData, analyticsData] = await Promise.all([
          adminApi.adminSummary(),
          adminApi.adminBusinessLimit(),
          adminApi.adminAnalytics(),
        ]);
        if (!isMounted) return;
        setSummary(summaryData);
        setBusinessLimit(limitData);
        setCharts(analyticsData.charts);
      } catch {
        // Keep the visible data stable; manual reload still reports errors.
      }
    }
    refresh();
    return () => {
      isMounted = false;
    };
  }, [realtimeRefreshKey]);

  const userStatusChart: AIReportChartData = {
    id: "user_status",
    type: "pie",
    title: "User Aktif vs Suspended",
    labels: ["Aktif", "Suspended"],
    series: [{ name: "User", values: [summary?.active_users ?? 0, summary?.suspended_users ?? 0] }],
  };

  return (
    <DashboardShell activeView="adminSummary" title="Admin Dashboard">
      <section className="admin-page">
        <div className="form-hero admin-anchor">
          <h2>Kontrol operasional aplikasi</h2>
          <p>Pantau user, toko, dan submission inventarisasi yang masuk ke sistem.</p>
        </div>

        {isLoading && <LoadingState>Memuat data admin...</LoadingState>}
        {error && (
          <article className="panel empty-state retry-state">
            <span>{error}</span>
            <Button className="btn--dashboard-hover" onClick={() => setReloadKey((current) => current + 1)}>
              Coba lagi <Icon name="refresh" size={18} />
            </Button>
          </article>
        )}

        {!isLoading && !error && (
          <>
            <div className="admin-grid">
              <HolographicCard className="admin-metric panel"><span>Total User</span><strong>{summary?.users ?? 0}</strong></HolographicCard>
              <HolographicCard className="admin-metric panel"><span>User Aktif</span><strong>{summary?.active_users ?? 0}</strong></HolographicCard>
              <HolographicCard className="admin-metric panel"><span>Toko</span><strong>{summary?.businesses ?? 0}</strong></HolographicCard>
              <HolographicCard className="admin-metric panel"><span>Submission</span><strong>{summary?.inventory_submissions ?? 0}</strong></HolographicCard>
              <HolographicCard className="admin-metric panel"><span>Limit toko/user</span><strong>{businessLimit?.value ?? 2}</strong></HolographicCard>
            </div>

            <div className="inventory-insight-grid">
              {charts.map((chart) => (
                <AIReportChart key={chart.id} chart={chart} />
              ))}
              <AIReportChart chart={userStatusChart} />
            </div>
          </>
        )}
      </section>
    </DashboardShell>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors referencing `AdminSummaryPage.tsx` itself (errors about the other 4 not-yet-created pages, still referenced by `App.tsx`, are expected until Tasks 7-10 land).

- [ ] **Step 3: Commit**

```bash
git add src/pages/AdminSummaryPage.tsx
git commit -m "feat(admin): add AdminSummaryPage with stat cards and 4 analytics charts"
```

---

### Task 7: `AdminDiagnosisPage.tsx`

**Files:**
- Create: `src/pages/AdminDiagnosisPage.tsx`

**Interfaces:**
- Consumes: `PaginationControls` (Task 3), `emptyPaginationMeta`/`normalizePaginationMeta` (Task 2), `adminApi.adminBusinesses`/`adminApi.adminDiagnosisWatchlist`.
- Produces: `export function AdminDiagnosisPage()` — consumed by Task 5.

- [ ] **Step 1: Create the file**

```tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardShell } from "../components/organisms/DashboardShell";
import { Icon } from "../components/atoms/Icon";
import { LoadingState } from "../components/atoms/LoadingState";
import { PaginationControls } from "../components/organisms/PaginationControls";
import * as adminApi from "../services/api/admin";
import type { Business, InventorySubmission } from "../services/api/types";
import { emptyPaginationMeta, normalizePaginationMeta } from "../utils/pagination";
import { formatJakartaDate } from "../utils/dateTime";
import { formatScore } from "../utils/number";

// Mirrors AI_REPORT_REVENUE_THRESHOLD on the backend (default Rp 50 juta) — below this,
// AI report generation is never triggered, so the button would only ever 404.
const aiReportRevenueThreshold = 50_000_000;
const defaultDiagnosisPageSize = 5;

export function AdminDiagnosisPage() {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessesError, setBusinessesError] = useState("");
  const [businessesReloadKey, setBusinessesReloadKey] = useState(0);
  const [diagnosisRows, setDiagnosisRows] = useState<InventorySubmission[]>([]);
  const [diagnosisPage, setDiagnosisPage] = useState(0);
  const [diagnosisPageSize, setDiagnosisPageSize] = useState(defaultDiagnosisPageSize);
  const [diagnosisMeta, setDiagnosisMeta] = useState(() => emptyPaginationMeta(defaultDiagnosisPageSize));
  const [diagnosisError, setDiagnosisError] = useState("");
  const [isDiagnosisLoading, setIsDiagnosisLoading] = useState(true);
  const [diagnosisReloadKey, setDiagnosisReloadKey] = useState(0);
  const [realtimeRefreshKey, setRealtimeRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    async function loadBusinesses() {
      setBusinessesError("");
      try {
        const response = await adminApi.adminBusinesses({ limit: 100, offset: 0 });
        if (isMounted) setBusinesses(response.items);
      } catch (err) {
        if (isMounted) setBusinessesError(err instanceof Error ? err.message : "Gagal memuat daftar toko");
      }
    }
    loadBusinesses();
    return () => {
      isMounted = false;
    };
  }, [businessesReloadKey]);

  useEffect(() => {
    let isMounted = true;
    async function loadDiagnosis() {
      setIsDiagnosisLoading(true);
      setDiagnosisError("");
      const offset = diagnosisPage * diagnosisPageSize;
      try {
        const response = await adminApi.adminDiagnosisWatchlist({ limit: diagnosisPageSize, offset });
        if (isMounted) {
          setDiagnosisRows(response.items);
          setDiagnosisMeta(normalizePaginationMeta(response.meta, response.items.length, diagnosisPageSize, offset));
        }
      } catch (err) {
        if (isMounted) {
          setDiagnosisRows([]);
          setDiagnosisMeta(emptyPaginationMeta(diagnosisPageSize));
          setDiagnosisError(err instanceof Error ? err.message : "Gagal memuat monitoring diagnosis");
        }
      } finally {
        if (isMounted) setIsDiagnosisLoading(false);
      }
    }
    loadDiagnosis();
    return () => {
      isMounted = false;
    };
  }, [diagnosisPage, diagnosisPageSize, diagnosisReloadKey]);

  useEffect(() => {
    const refreshOnNotification = () => setRealtimeRefreshKey((current) => current + 1);
    window.addEventListener("gimb:admin-notification", refreshOnNotification);
    return () => window.removeEventListener("gimb:admin-notification", refreshOnNotification);
  }, []);

  useEffect(() => {
    if (realtimeRefreshKey === 0) return;
    let isMounted = true;
    async function refresh() {
      const offset = diagnosisPage * diagnosisPageSize;
      try {
        const [businessesData, diagnosisData] = await Promise.all([
          adminApi.adminBusinesses({ limit: 100, offset: 0 }),
          adminApi.adminDiagnosisWatchlist({ limit: diagnosisPageSize, offset }),
        ]);
        if (!isMounted) return;
        setBusinesses(businessesData.items);
        setDiagnosisRows(diagnosisData.items);
        setDiagnosisMeta(normalizePaginationMeta(diagnosisData.meta, diagnosisData.items.length, diagnosisPageSize, offset));
      } catch {
        // Keep the visible data stable; manual reload buttons still show errors when needed.
      }
    }
    refresh();
    return () => {
      isMounted = false;
    };
  }, [diagnosisPage, diagnosisPageSize, realtimeRefreshKey]);

  const goToBusinessDashboard = (publicId: string) => navigate(`/businesses/${publicId}/dashboard`);
  const goToBusinessSubScores = (publicId: string) => navigate(`/businesses/${publicId}/sub-scores`);
  const goToBusinessInventoryInput = (publicId: string) => navigate(`/admin/businesses/${publicId}/inventory-input`);
  const goToBusinessAIReport = (publicId: string) => navigate(`/admin/businesses/${publicId}/ai-report`);

  return (
    <DashboardShell activeView="adminDiagnosis" title="Admin Dashboard">
      <section className="admin-page">
        <section className="admin-section panel admin-section--wide admin-anchor">
          <div className="admin-section__heading">
            <div>
              <h3>Monitoring Diagnosis</h3>
              <p>Toko dengan skor terendah tampil lebih dulu agar admin bisa cepat melakukan review.</p>
            </div>
            <b>{diagnosisMeta.total} data</b>
          </div>
          {businessesError && (
            <div className="table-retry-state">
              <span>{businessesError}</span>
              <button type="button" onClick={() => setBusinessesReloadKey((current) => current + 1)}>
                Coba lagi <Icon name="refresh" size={16} />
              </button>
            </div>
          )}
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Toko</th>
                  <th>Status</th>
                  <th>Tanggal</th>
                  <th>Skor</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {diagnosisError && (
                  <tr>
                    <td colSpan={5}>
                      <div className="table-retry-state">
                        <span>{diagnosisError}</span>
                        <button type="button" onClick={() => setDiagnosisReloadKey((current) => current + 1)}>
                          Coba lagi <Icon name="refresh" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                {!diagnosisError && isDiagnosisLoading && (
                  <tr><td colSpan={5}><LoadingState inline>Memuat monitoring diagnosis...</LoadingState></td></tr>
                )}
                {!diagnosisError && !isDiagnosisLoading && diagnosisRows.length === 0 && (
                  <tr><td colSpan={5}>Belum ada hasil diagnosis yang bisa dipantau.</td></tr>
                )}
                {!isDiagnosisLoading && !diagnosisError && diagnosisRows.map((submission) => {
                  const business = businesses.find((item) => item.id === submission.business_id);
                  return (
                    <tr key={submission.public_id}>
                      <td>
                        <strong>{submission.business_name || business?.name || submission.public_id}</strong>
                        <span>{business?.industry || "Tanpa industri"}</span>
                      </td>
                      <td><b className="status-pill">{submission.analysis.status}</b></td>
                      <td>{formatJakartaDate(submission.created_at, "short")}</td>
                      <td><strong className="admin-table__score">{formatScore(submission.analysis.overall_score)}</strong></td>
                      <td>
                        <div className="admin-row-actions">
                          {business ? (
                            <>
                              <button className="admin-row-action--dashboard" onClick={() => goToBusinessDashboard(business.public_id)}>Dashboard <Icon name="arrow" size={16} /></button>
                              <button className="admin-row-action--score" onClick={() => goToBusinessSubScores(business.public_id)}>Sub Skor <Icon name="arrow" size={16} /></button>
                              <button className="admin-row-action--input" onClick={() => goToBusinessInventoryInput(business.public_id)}>Lihat Input <Icon name="arrow" size={16} /></button>
                              {submission.six_month_revenue > aiReportRevenueThreshold && (
                                <button className="admin-row-action--ai-report" onClick={() => goToBusinessAIReport(business.public_id)}>Laporan AI <Icon name="arrow" size={16} /></button>
                              )}
                            </>
                          ) : (
                            <span>-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <PaginationControls
            page={diagnosisPage}
            pageSize={diagnosisPageSize}
            meta={diagnosisMeta}
            isLoading={isDiagnosisLoading}
            onPageChange={setDiagnosisPage}
            onPageSizeChange={(pageSize) => {
              setDiagnosisPage(0);
              setDiagnosisPageSize(pageSize);
            }}
          />
        </section>
      </section>
    </DashboardShell>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors referencing `AdminDiagnosisPage.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/AdminDiagnosisPage.tsx
git commit -m "feat(admin): add AdminDiagnosisPage with its own businesses fetch"
```

---

### Task 8: `AdminLimitPage.tsx`

**Files:**
- Create: `src/pages/AdminLimitPage.tsx`

**Interfaces:**
- Consumes: `adminApi.adminBusinessLimit`, `adminApi.updateBusinessLimit`.
- Produces: `export function AdminLimitPage()` — consumed by Task 5.

- [ ] **Step 1: Create the file**

```tsx
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors referencing `AdminLimitPage.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/AdminLimitPage.tsx
git commit -m "feat(admin): add AdminLimitPage"
```

---

### Task 9: `AdminUsersPage.tsx`

**Files:**
- Create: `src/pages/AdminUsersPage.tsx`

**Interfaces:**
- Consumes: `PaginationControls` (Task 3), `emptyPaginationMeta`/`normalizePaginationMeta` (Task 2), `useAuth` (`context/AuthContext`), `adminApi.adminUsers`/`updateUserStatus`/`verifyUserEmailManually`.
- Produces: `export function AdminUsersPage()` — consumed by Task 5.

- [ ] **Step 1: Create the file**

```tsx
import { useEffect, useState } from "react";
import { DashboardShell } from "../components/organisms/DashboardShell";
import { Button } from "../components/atoms/Button";
import { Icon } from "../components/atoms/Icon";
import { LoadingState } from "../components/atoms/LoadingState";
import { PaginationControls } from "../components/organisms/PaginationControls";
import { useAuth } from "../context/AuthContext";
import * as adminApi from "../services/api/admin";
import type { User, UserStatus } from "../services/api/types";
import { emptyPaginationMeta, normalizePaginationMeta } from "../utils/pagination";

const defaultUserPageSize = 5;

export function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [userPage, setUserPage] = useState(0);
  const [userPageSize, setUserPageSize] = useState(defaultUserPageSize);
  const [userMeta, setUserMeta] = useState(() => emptyPaginationMeta(defaultUserPageSize));
  const [userReloadKey, setUserReloadKey] = useState(0);
  const [userError, setUserError] = useState("");
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [emailVerifyTarget, setEmailVerifyTarget] = useState<User | null>(null);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [realtimeRefreshKey, setRealtimeRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    async function loadUsers() {
      setIsUserLoading(true);
      setUserError("");
      const offset = userPage * userPageSize;
      try {
        const response = await adminApi.adminUsers({ limit: userPageSize, offset });
        if (isMounted) {
          setUsers(response.items);
          setUserMeta(normalizePaginationMeta(response.meta, response.items.length, userPageSize, offset));
        }
      } catch (err) {
        if (isMounted) {
          setUsers([]);
          setUserMeta(emptyPaginationMeta(userPageSize));
          setUserError(err instanceof Error ? err.message : "Gagal memuat user");
        }
      } finally {
        if (isMounted) setIsUserLoading(false);
      }
    }
    loadUsers();
    return () => {
      isMounted = false;
    };
  }, [userPage, userPageSize, userReloadKey]);

  useEffect(() => {
    const refreshOnNotification = () => setRealtimeRefreshKey((current) => current + 1);
    window.addEventListener("gimb:admin-notification", refreshOnNotification);
    return () => window.removeEventListener("gimb:admin-notification", refreshOnNotification);
  }, []);

  useEffect(() => {
    if (realtimeRefreshKey === 0) return;
    let isMounted = true;
    async function refresh() {
      const offset = userPage * userPageSize;
      try {
        const response = await adminApi.adminUsers({ limit: userPageSize, offset });
        if (!isMounted) return;
        setUsers(response.items);
        setUserMeta(normalizePaginationMeta(response.meta, response.items.length, userPageSize, offset));
      } catch {
        // Keep the visible data stable; manual reload still reports errors.
      }
    }
    refresh();
    return () => {
      isMounted = false;
    };
  }, [userPage, userPageSize, realtimeRefreshKey]);

  const updateStatus = async (userId: string, status: UserStatus) => {
    const updated = await adminApi.updateUserStatus(userId, status);
    setUsers((current) => current.map((user) => user.id === updated.id ? updated : user));
  };

  const verifyEmailManually = async () => {
    if (!emailVerifyTarget) return;
    setIsVerifyingEmail(true);
    setUserError("");
    try {
      const updated = await adminApi.verifyUserEmailManually(emailVerifyTarget.id);
      setUsers((current) => current.map((user) => user.id === updated.id ? updated : user));
      setEmailVerifyTarget(null);
    } catch (err) {
      setUserError(err instanceof Error ? err.message : "Gagal memverifikasi email user");
      setEmailVerifyTarget(null);
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  return (
    <DashboardShell activeView="adminUsers" title="Admin Dashboard">
      <section className="admin-page">
        <section className="admin-section panel admin-anchor">
          <div className="admin-section__heading">
            <div><h3>User</h3></div>
            <b>{userMeta.total} data</b>
          </div>
          <div className="data-table">
            {userError && (
              <article className="table-retry-state">
                <span>{userError}</span>
                <button type="button" onClick={() => setUserReloadKey((current) => current + 1)}>
                  Coba lagi <Icon name="refresh" size={16} />
                </button>
              </article>
            )}
            {!userError && isUserLoading && <LoadingState inline>Memuat user...</LoadingState>}
            {!userError && !isUserLoading && users.length === 0 && <article>Belum ada user.</article>}
            {!userError && !isUserLoading && users.map((user) => {
              const isCurrentUser = user.id === currentUser?.id;
              return (
                <article className="data-table__user-row" key={user.id}>
                  <div>
                    <strong>{user.full_name}</strong>
                    <span>{user.email}</span>
                  </div>
                  <b className={`email-verify-pill ${user.email_verified ? "is-verified" : "is-pending"}`}>
                    {user.email_verified ? "Email verified" : "Belum verified"}
                  </b>
                  <b className={`status-pill status-pill--${user.role}`}>{user.role}</b>
                  {!user.email_verified ? (
                    <button className="admin-row-action--verify" type="button" onClick={() => setEmailVerifyTarget(user)}>
                      Verifikasi
                    </button>
                  ) : (
                    <span className="admin-row-placeholder">-</span>
                  )}
                  <select
                    value={user.status}
                    disabled={isCurrentUser}
                    title={isCurrentUser ? "Admin tidak bisa mengubah status akunnya sendiri" : undefined}
                    onChange={(event) => updateStatus(user.id, event.target.value as UserStatus)}
                  >
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                    <option value="suspended">suspended</option>
                  </select>
                </article>
              );
            })}
          </div>
          <PaginationControls
            page={userPage}
            pageSize={userPageSize}
            meta={userMeta}
            isLoading={isUserLoading}
            onPageChange={setUserPage}
            onPageSizeChange={(pageSize) => {
              setUserPage(0);
              setUserPageSize(pageSize);
            }}
          />
        </section>
      </section>

      {emailVerifyTarget && (
        <div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="email-verify-confirm-title">
          <div className="confirm-dialog__card">
            <span className="confirm-dialog__icon"><Icon name="check" size={34} /></span>
            <h2 id="email-verify-confirm-title">Verifikasi manual email?</h2>
            <p>
              Akun <strong>{emailVerifyTarget.email}</strong> akan dianggap terverifikasi tanpa klik link email.
            </p>
            <div className="confirm-dialog__actions">
              <Button className="btn--dashboard-hover" variant="secondary" disabled={isVerifyingEmail} onClick={() => setEmailVerifyTarget(null)}>
                Tidak
              </Button>
              <Button className="btn--shiny-dashboard" disabled={isVerifyingEmail} onClick={verifyEmailManually}>
                {isVerifyingEmail ? "Memverifikasi..." : "Ya, Verifikasi"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
```

Note: the original single-page version bumped a shared `auditSoftReloadKey` after a successful email verification so the audit log entry it creates showed up immediately further down the same page. Audit Log is now a separate route that always fetches fresh on navigation, so that cross-section nudge is dropped rather than ported — there is nothing stale to refresh into.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors referencing `AdminUsersPage.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/AdminUsersPage.tsx
git commit -m "feat(admin): add AdminUsersPage"
```

---

### Task 10: `AdminAuditLogPage.tsx`

**Files:**
- Create: `src/pages/AdminAuditLogPage.tsx`

**Interfaces:**
- Consumes: `PaginationControls` (Task 3), `emptyPaginationMeta`/`normalizePaginationMeta` (Task 2), `adminApi.adminAuditLogs`, `formatJakartaDateTime`/`formatJakartaTime` (`utils/dateTime`).
- Produces: `export function AdminAuditLogPage()` — consumed by Task 5.

- [ ] **Step 1: Create the file**

```tsx
import { useEffect, useState } from "react";
import { DashboardShell } from "../components/organisms/DashboardShell";
import { Icon } from "../components/atoms/Icon";
import { LoadingState } from "../components/atoms/LoadingState";
import { PaginationControls } from "../components/organisms/PaginationControls";
import * as adminApi from "../services/api/admin";
import type { AuditLog } from "../services/api/types";
import { emptyPaginationMeta, normalizePaginationMeta } from "../utils/pagination";
import { formatJakartaDateTime, formatJakartaTime } from "../utils/dateTime";

function formatAction(action: string) {
  return action
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).replace(/_/g, " "))
    .join(" / ");
}

function shortValue(value: string, length = 12) {
  if (!value) return "-";
  return value.length > length ? `${value.slice(0, length)}...` : value;
}

type AuditLevel = "info" | "warning" | "error";
type AuditLevelFilter = AuditLevel | "all";

function auditLevel(logOrAction: AuditLog | string): AuditLevel {
  if (typeof logOrAction !== "string" && logOrAction.level) return logOrAction.level;
  const action = typeof logOrAction === "string" ? logOrAction : logOrAction.action;
  const lowered = action.toLowerCase();
  if (lowered.includes("failed") || lowered.includes("error") || lowered.includes("blocked")) return "error";
  if (lowered.includes("updated") || lowered.includes("deleted") || lowered.includes("suspended") || lowered.includes("limit")) return "warning";
  return "info";
}

function auditLevelLabel(level: AuditLevel) {
  return level === "error" ? "Error" : level === "warning" ? "Warning" : "Info";
}

function auditService(log: AuditLog) {
  if (log.service) return log.service;
  const actionRoot = log.action.split(".")[0] || log.entity_type || "system";
  return `${actionRoot.replace(/_/g, "-")}-service`;
}

function auditStatusText(log: AuditLog, level: AuditLevel) {
  if (typeof log.status_code === "number" && log.status_code > 0) return String(log.status_code);
  if (level === "error") return "401";
  if (level === "warning") return "202";
  return "200";
}

function auditDuration(log: AuditLog) {
  if (typeof log.duration_ms !== "number") return "-";
  if (log.duration_ms < 1000) return `${log.duration_ms}ms`;
  return `${(log.duration_ms / 1000).toFixed(1)}s`;
}

function auditIPAddress(log: AuditLog) {
  return log.ip_address || "-";
}

function auditMessage(log: AuditLog) {
  return log.message || formatAction(log.action);
}

function metadataString(log: AuditLog, key: string) {
  const value = log.metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function auditActor(log: AuditLog) {
  if (log.actor_name && log.actor_email) return `${log.actor_name} (${log.actor_email})`;
  if (log.actor_name) return log.actor_name;
  if (log.actor_email) return log.actor_email;
  const email = metadataString(log, "email");
  if (email) return email;
  return log.actor_id ? "Pengguna terdaftar" : "System";
}

function auditEntity(log: AuditLog) {
  if (log.entity_label) return log.entity_label;
  const email = metadataString(log, "email");
  if (log.entity_type === "user" && email) return email;
  return formatAction(log.entity_type || "system");
}

function auditTags(log: AuditLog) {
  const actionParts = log.action.split(".").filter(Boolean);
  const metadataKeys = Object.keys(log.metadata ?? {}).slice(0, 3);
  return Array.from(new Set([log.entity_type, ...actionParts, ...metadataKeys].filter(Boolean))).slice(0, 6);
}

const defaultAuditPageSize = 10;

export function AdminAuditLogPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditPage, setAuditPage] = useState(0);
  const [auditPageSize, setAuditPageSize] = useState(defaultAuditPageSize);
  const [auditMeta, setAuditMeta] = useState(() => emptyPaginationMeta(defaultAuditPageSize));
  const [auditReloadKey, setAuditReloadKey] = useState(0);
  const [auditSoftReloadKey, setAuditSoftReloadKey] = useState(0);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditLevelFilter, setAuditLevelFilter] = useState<AuditLevelFilter>("all");
  const [isAuditFilterOpen, setIsAuditFilterOpen] = useState(false);
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);
  const [auditError, setAuditError] = useState("");
  const [isAuditLoading, setIsAuditLoading] = useState(true);
  const [realtimeRefreshKey, setRealtimeRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    async function loadAuditLogs() {
      setIsAuditLoading(true);
      setAuditError("");
      const offset = auditPage * auditPageSize;
      try {
        const response = await adminApi.adminAuditLogs({
          limit: auditPageSize,
          offset,
          level: auditLevelFilter,
          search: auditSearch,
        });
        if (isMounted) {
          setAuditLogs(response.items);
          setAuditMeta(normalizePaginationMeta(response.meta, response.items.length, auditPageSize, offset));
        }
      } catch (err) {
        if (isMounted) {
          setAuditLogs([]);
          setAuditMeta(emptyPaginationMeta(auditPageSize));
          setAuditError(err instanceof Error ? err.message : "Gagal memuat audit log");
        }
      } finally {
        if (isMounted) setIsAuditLoading(false);
      }
    }
    loadAuditLogs();
    return () => {
      isMounted = false;
    };
  }, [auditLevelFilter, auditPage, auditPageSize, auditReloadKey, auditSearch]);

  useEffect(() => {
    if (auditSoftReloadKey === 0) return;
    let isMounted = true;
    async function refreshAuditLogs() {
      const offset = auditPage * auditPageSize;
      try {
        const response = await adminApi.adminAuditLogs({
          limit: auditPageSize,
          offset,
          level: auditLevelFilter,
          search: auditSearch,
        });
        if (isMounted) {
          setAuditLogs(response.items);
          setAuditMeta(normalizePaginationMeta(response.meta, response.items.length, auditPageSize, offset));
        }
      } catch {
        // Keep current logs visible; hard reload/retry still reports errors.
      }
    }
    refreshAuditLogs();
    return () => {
      isMounted = false;
    };
  }, [auditLevelFilter, auditPage, auditPageSize, auditSearch, auditSoftReloadKey]);

  useEffect(() => {
    const refreshOnNotification = () => setRealtimeRefreshKey((current) => current + 1);
    window.addEventListener("gimb:admin-notification", refreshOnNotification);
    return () => window.removeEventListener("gimb:admin-notification", refreshOnNotification);
  }, []);

  useEffect(() => {
    if (realtimeRefreshKey === 0) return;
    setAuditSoftReloadKey((current) => current + 1);
  }, [realtimeRefreshKey]);

  const hasAuditFilter = auditLevelFilter !== "all" || auditSearch.trim() !== "";
  const toggleAuditFullscreen = () => {
    const panel = document.getElementById("audit-logs");
    if (!panel) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    void panel.requestFullscreen?.();
  };

  return (
    <DashboardShell activeView="adminAuditLog" title="Admin Dashboard">
      <section className="admin-page">
        <section id="audit-logs" className="admin-section panel admin-section--wide admin-anchor audit-log-panel">
          <div className="audit-toolbar" aria-label="Audit log tools">
            <button type="button" aria-label="Mode layar penuh" onClick={toggleAuditFullscreen}>
              <Icon name="maximize" size={20} />
            </button>
            <button
              type="button"
              aria-label="Muat ulang audit log"
              disabled={isAuditLoading}
              onClick={() => setAuditSoftReloadKey((current) => current + 1)}
            >
              <Icon name="refresh" size={20} />
            </button>
          </div>

          <div className="audit-heading">
            <div>
              <h3>Logs</h3>
              <p>{auditLogs.length} of {auditMeta.total} logs</p>
            </div>
            <span>{auditLevelFilter === "all" ? "Semua level" : auditLevelLabel(auditLevelFilter)}</span>
          </div>

          <div className="audit-controls">
            <label className="audit-search">
              <Icon name="search" size={22} />
              <input
                value={auditSearch}
                onChange={(event) => {
                  setAuditSearch(event.target.value);
                  setAuditPage(0);
                }}
                placeholder="Cari log berdasarkan aksi, actor, target, IP, atau metadata..."
              />
            </label>
            <div className="audit-filter">
              <button
                type="button"
                aria-label="Filter audit log"
                aria-haspopup="menu"
                aria-expanded={isAuditFilterOpen}
                onClick={() => setIsAuditFilterOpen((current) => !current)}
              >
                <Icon name="filter" size={22} />
              </button>
              {isAuditFilterOpen && (
                <div className="audit-filter__menu" role="menu">
                  {(["all", "info", "warning", "error"] as AuditLevelFilter[]).map((level) => (
                    <button
                      key={level}
                      type="button"
                      className={auditLevelFilter === level ? "is-active" : ""}
                      onClick={() => {
                        setAuditLevelFilter(level);
                        setAuditPage(0);
                        setIsAuditFilterOpen(false);
                      }}
                    >
                      {level === "all" ? "Semua" : auditLevelLabel(level)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="audit-log-list">
            {auditError && (
              <article className="audit-empty table-retry-state">
                <span>{auditError}</span>
                <button type="button" onClick={() => setAuditReloadKey((current) => current + 1)}>
                  Coba lagi <Icon name="refresh" size={16} />
                </button>
              </article>
            )}
            {!auditError && isAuditLoading && <LoadingState className="audit-empty">Memuat audit log...</LoadingState>}
            {!auditError && !isAuditLoading && auditLogs.length === 0 && (
              <article className="audit-empty">{hasAuditFilter ? "Tidak ada log yang cocok." : "Belum ada audit log."}</article>
            )}
            {!isAuditLoading && !auditError && auditLogs.map((log) => {
              const level = auditLevel(log);
              const isExpanded = expandedAuditId === log.id;
              const tags = auditTags(log);
              return (
                <article key={log.id} className={`audit-log-row audit-log-row--${level} ${isExpanded ? "is-expanded" : ""}`}>
                  <button
                    type="button"
                    className="audit-log-row__toggle"
                    aria-label={isExpanded ? "Tutup detail audit log" : "Buka detail audit log"}
                    onClick={() => setExpandedAuditId((current) => current === log.id ? null : log.id)}
                  >
                    <Icon name="chevron" size={18} />
                  </button>
                  <b className={`audit-level audit-level--${level}`}>{auditLevelLabel(level)}</b>
                  <time>{formatJakartaTime(log.created_at)}</time>
                  <strong>{auditService(log)}</strong>
                  <p>{auditMessage(log)}</p>
                  <span className={`audit-status audit-status--${level}`}>{auditStatusText(log, level)}</span>
                  <small>{auditDuration(log)}</small>
                  <small className="audit-ip">{auditIPAddress(log)}</small>

                  {isExpanded && (
                    <div className="audit-log-detail">
                      <div className="audit-log-detail__message">
                        <span>Message</span>
                        <code>{auditMessage(log)}</code>
                      </div>
                      <div className="audit-log-detail__grid">
                        <div>
                          <span>Actor</span>
                          <code>{auditActor(log)}</code>
                        </div>
                        <div>
                          <span>Entity</span>
                          <code>{auditEntity(log)}</code>
                        </div>
                        <div>
                          <span>Level</span>
                          <code>{auditLevelLabel(level)}</code>
                        </div>
                        <div>
                          <span>Service</span>
                          <code>{auditService(log)}</code>
                        </div>
                        <div>
                          <span>Endpoint</span>
                          <code>{log.endpoint || "-"}</code>
                        </div>
                        <div>
                          <span>Status Code</span>
                          <code>{auditStatusText(log, level)}</code>
                        </div>
                        <div>
                          <span>Duration</span>
                          <code>{auditDuration(log)}</code>
                        </div>
                        <div>
                          <span>IP Address</span>
                          <code>{auditIPAddress(log)}</code>
                        </div>
                        <div>
                          <span>Timestamp</span>
                          <code>{formatJakartaDateTime(log.created_at)} · {formatJakartaTime(log.created_at)}</code>
                        </div>
                        <div>
                          <span>User Agent</span>
                          <code>{shortValue(log.user_agent || "-", 48)}</code>
                        </div>
                      </div>
                      {tags.length > 0 && (
                        <div className="audit-tags">
                          <span>Tags</span>
                          <div>
                            {tags.map((tag) => <b key={tag}>{tag}</b>)}
                          </div>
                        </div>
                      )}
                      <div>
                        <span>Metadata</span>
                        <code>{JSON.stringify(log.metadata ?? {}, null, 2)}</code>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
          <PaginationControls
            page={auditPage}
            pageSize={auditPageSize}
            meta={auditMeta}
            isLoading={isAuditLoading}
            onPageChange={setAuditPage}
            onPageSizeChange={(pageSize) => {
              setAuditPage(0);
              setAuditPageSize(pageSize);
            }}
          />
        </section>
      </section>
    </DashboardShell>
  );
}
```

Realtime refresh reuses the existing `auditSoftReloadKey` effect (bumping it from the notification listener) instead of adding a third near-duplicate fetch — one fewer effect than a literal copy-paste would produce.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors anywhere now — this was the last of the 5 new pages `App.tsx` references.

- [ ] **Step 3: Commit**

```bash
git add src/pages/AdminAuditLogPage.tsx
git commit -m "feat(admin): add AdminAuditLogPage"
```

---

### Task 11: Delete the old `AdminPage.tsx`

**Files:**
- Delete: `src/pages/AdminPage.tsx`

- [ ] **Step 1: Confirm nothing still imports it**

Run: `grep -rn "pages/AdminPage" src/` (or `Select-String -Path src -Pattern "pages/AdminPage" -Recurse` on PowerShell)
Expected: no matches (Task 5 already removed the only import in `App.tsx`).

- [ ] **Step 2: Delete the file**

Run: `rm src/pages/AdminPage.tsx` (or `Remove-Item src/pages/AdminPage.tsx` on PowerShell)

- [ ] **Step 3: Type-check and build**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add -A src/pages/AdminPage.tsx
git commit -m "refactor(admin): remove AdminPage.tsx, fully replaced by 5 route-backed pages"
```

---

### Task 12: Manual verification in the browser

**Files:** none (verification only).

This repo has no automated frontend tests, so this task is the real correctness check for the whole plan — do not skip it or claim the feature works without it.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev` (from `fe-gimb/`) — requires the backend from the backend plan running too, since every admin page calls it.

- [ ] **Step 2: Log in as an admin and open the browser network tab**

Log in with an admin account. Open DevTools → Network, clear it, then load `/admin`.

Expected: only 2-3 XHR requests fire for the page itself (`/admin/dashboard/summary`, `/admin/settings/business-limit`, `/admin/dashboard/analytics`) plus the always-on notification/WebSocket calls from `DashboardShell` — not the 6+ admin requests the old single page fired.

- [ ] **Step 3: Walk each sidebar item and confirm it navigates and fetches independently**

For each of Ringkasan, Diagnosis, Limit, User, Audit Log: click it in the sidebar, confirm the URL changes (`/admin`, `/admin/diagnosis`, `/admin/limit`, `/admin/users`, `/admin/audit-log`), the correct section highlights as active in the sidebar, and clearing the network tab before each click shows only that page's own requests firing — not the other 4 sections'.

- [ ] **Step 4: Confirm the 4 charts render on Ringkasan**

On `/admin`, confirm 4 chart cards render below the stat cards: a bar chart (Toko per Industri), a donut with legend (Distribusi Status Kesehatan), a bar chart (Tren Submission per Bulan, 12 bars), and a donut (User Aktif vs Suspended). If the seed data has businesses, values should be non-zero and match what's visible elsewhere (e.g. total toko count on the stat card should equal the sum of the industry chart's bars).

- [ ] **Step 5: Exercise pagination, filters, and actions on each page**

- Diagnosis: change page size, page forward/back, click "Dashboard"/"Sub Skor"/"Lihat Input"/"Laporan AI" on a row and confirm each navigates correctly and "Lihat Input" highlights "Diagnosis" (not a broken/blank sidebar state) when you navigate back.
- Limit: change the value, submit, confirm the dialog, confirm the success message and that the new value persists after a page reload.
- User: change a user's status via the dropdown, trigger "Verifikasi" on an unverified user and confirm the dialog and resulting pill update.
- Audit Log: search, filter by level, expand a row's detail, use the fullscreen and reload buttons.

- [ ] **Step 6: Confirm realtime notifications only refresh the open page's own data**

Trigger something that creates an admin notification (e.g. a new inventory submission from a non-admin test account) while sitting on `/admin/users`. Confirm the notification toast/badge appears, but the network tab shows only a `users` refetch — not diagnosis/audit/analytics requests firing for a page that isn't open.

- [ ] **Step 7: Report results**

Summarize what was checked and any deviations from the expected behavior above — do not claim the feature is done without having actually run steps 1-6.
