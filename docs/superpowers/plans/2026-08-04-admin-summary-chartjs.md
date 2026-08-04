# Admin Summary Chart.js Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 4 hand-rolled SVG/CSS charts on `AdminSummaryPage` with Chart.js (via `react-chartjs-2`), with each chart's type chosen to fit its data (bar, doughnut, line, pie).

**Architecture:** A new frontend component `AdminAnalyticsChart.tsx` renders `AIReportChartData` (the existing generic chart contract — `id`/`type`/`title`/`labels`/`series`) using `react-chartjs-2` components (`Bar`/`Line`/`Doughnut`/`Pie`), dispatched on `chart.type`. Two backend chart builders change their `Type` string (`"pie"` → `"doughnut"`, `"bar"` → `"line"`) so the existing generic contract carries the new shape without any data-shape changes. `AIReportChart.tsx` (used by the unrelated `AIReportPage`) is untouched.

**Tech Stack:** React 19 + TypeScript (fe-gimb), Go (be-gimb). New dependencies: `chart.js@^4.5.1`, `react-chartjs-2@^5.3.1`.

## Global Constraints

- Scope is `AdminSummaryPage` only. Do not modify `AIReportChart.tsx` or `AIReportPage.tsx`.
- fe-gimb has no test runner configured (no `test` script, no vitest/jest, no `*.test.tsx` files anywhere in the repo). Verification for every frontend task is `npx tsc --noEmit` (from `fe-gimb/`) plus a final manual browser walkthrough. Do not add a test framework.
- be-gimb changes get a real Go test (existing convention: `internal/service/admin_service_test.go`).
- Chart type mapping (locked in from the approved spec, `fe-gimb/docs/superpowers/specs/2026-08-04-admin-summary-chartjs-design.md`):
  - `businesses_by_industry` ("Toko per Industri") → `bar`
  - `status_distribution` ("Distribusi Status Kesehatan") → `doughnut` (with center text: top status + %)
  - `submissions_trend` ("Tren Submission per Bulan") → `line`
  - `user_status` ("User Aktif vs Suspended", hardcoded client-side in `AdminSummaryPage.tsx`) → `pie`
- Charts must re-render with correct colors when the user toggles light/dark theme (`useThemeSettings()` from `fe-gimb/src/theme/ThemeContext.tsx`, `theme.mode` is `"light" | "dark"`), by reading CSS custom properties (`--ink`, `--muted`, `--surface`, `--border`) at render time — Chart.js canvases don't inherit CSS vars automatically.
- Do not commit or `git add` anything — the user manages git manually. Leave changes on disk after each step; skip the "Commit" step in every task below.
- `fe-gimb/AGENTS.md` requires updating `docs/PAGE_MAP.md`, `docs/PROJECT_MAP.md`, `docs/API_INTEGRATION_MAP.md`, and `docs/CURRENT_PROGRESS.md` for anything this plan touches (routes, components, endpoints, dependencies) — handled in Task 8, run last so it reflects the final state of Tasks 1-7.

---

### Task 1: Backend — change chart types for status and trend charts

**Files:**
- Modify: `be-gimb/internal/service/admin_service.go:245-266` (`statusChart`), `be-gimb/internal/service/admin_service.go:268-288` (`trendChart`)
- Test: `be-gimb/internal/service/admin_service_test.go` (extend `TestAdminServiceAnalyticsAggregatesChartsCorrectly`, starts at line 108)

**Interfaces:**
- Produces: `AdminService.Analytics(ctx)` still returns `AdminAnalytics{Charts: []domain.AIReportChart}` with the same 3-element order (`industry`, `status`, `trend`) and same `Labels`/`Series` shape — only `status.Type` becomes `"doughnut"` and `trend.Type` becomes `"line"`. `industry.Type` stays `"bar"`.

- [ ] **Step 1: Write the failing assertions**

Add these two checks inside `TestAdminServiceAnalyticsAggregatesChartsCorrectly` in `be-gimb/internal/service/admin_service_test.go`, right after the existing `industry := analytics.Charts[0]` block (after line 151, before `status := analytics.Charts[1]`) and right after the existing `status := analytics.Charts[1]` block (after line 162, before `trend := analytics.Charts[2]`):

```go
	if industry.Type != "bar" {
		t.Fatalf("industry chart Type = %q, want %q", industry.Type, "bar")
	}
```

```go
	if status.Type != "doughnut" {
		t.Fatalf("status chart Type = %q, want %q", status.Type, "doughnut")
	}
```

And after the existing `trend := analytics.Charts[2]` block (after line 166, before the `trend.Series[0].Values` check), add:

```go
	if trend.Type != "line" {
		t.Fatalf("trend chart Type = %q, want %q", trend.Type, "line")
	}
```

- [ ] **Step 2: Run the test to verify the new assertions fail**

Run: `go test ./internal/service/... -run TestAdminServiceAnalyticsAggregatesChartsCorrectly -v` (from `be-gimb/`)
Expected: FAIL — `status chart Type = "pie", want "doughnut"` and `trend chart Type = "bar", want "line"`.

- [ ] **Step 3: Change the chart type strings**

In `be-gimb/internal/service/admin_service.go`, inside `statusChart` (around line 259):

```go
	return domain.AIReportChart{
		ID:     "status_distribution",
		Type:   "doughnut",
		Title:  "Distribusi Status Kesehatan",
		Labels: labels,
		Series: []domain.AIReportChartSeries{{Name: "Toko", Values: values}},
	}
```

Inside `trendChart` (around line 281):

```go
	return domain.AIReportChart{
		ID:     "submissions_trend",
		Type:   "line",
		Title:  "Tren Submission per Bulan",
		Labels: labels,
		Series: []domain.AIReportChartSeries{{Name: "Submission", Values: values}},
	}
```

(`industryChart` is unchanged — its `Type: "bar"` stays as-is; the Step 1 assertion for it is just a regression guard.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `go test ./internal/service/... -run TestAdminServiceAnalyticsAggregatesChartsCorrectly -v` (from `be-gimb/`)
Expected: PASS

- [ ] **Step 5: Run the full backend test suite**

Run: `go test ./...` (from `be-gimb/`)
Expected: PASS (no other test asserts on chart `Type` — confirmed by reading `admin_service_test.go` and grepping for `"pie"`/`"bar"` chart type literals elsewhere in `be-gimb/internal`).

---

### Task 2: Frontend — add dependencies and extend the chart type union

**Files:**
- Modify: `fe-gimb/package.json`
- Modify: `fe-gimb/src/services/api/types.ts:265`

**Interfaces:**
- Produces: `AIReportChartData["type"]` now includes `"doughnut"` as a valid literal, so both backend payloads and the hardcoded `userStatusChart` in `AdminSummaryPage.tsx` type-check.

- [ ] **Step 1: Install the dependencies**

Run: `npm install chart.js react-chartjs-2` (from `fe-gimb/`)
Expected: `package.json` gains `"chart.js": "^4.5.1"` and `"react-chartjs-2": "^5.3.1"` (or newer compatible versions) under `"dependencies"`, `package-lock.json` updates, `node_modules/chart.js` and `node_modules/react-chartjs-2` exist.

- [ ] **Step 2: Add the `"doughnut"` literal to the chart type union**

In `fe-gimb/src/services/api/types.ts`, line 265:

```ts
  type: "bar" | "line" | "radar" | "pie" | "gauge" | "doughnut";
```

- [ ] **Step 3: Verify the project still type-checks**

Run: `npx tsc --noEmit` (from `fe-gimb/`)
Expected: no new errors (this step only widens a union and adds a dependency; nothing consumes `"doughnut"` yet).

---

### Task 3: Frontend — shared chart theming/formatting util

**Files:**
- Create: `fe-gimb/src/components/organisms/chartTheme.ts`

**Interfaces:**
- Produces:
  - `chartPalette: string[]` — 6 hex colors for categorical series (same values as the existing `palette` array in `AIReportChart.tsx:8`, duplicated here as a one-line constant rather than importing from that file, since `AIReportChart.tsx` is out of scope for this change per the Global Constraints).
  - `formatChartValue(value: number): string` — Indonesian-locale number format, mirrors `AIReportChart.tsx`'s `formatValue`.
  - `formatChartPercent(value: number): string` — `"${formatChartValue(value)}%"`.
  - `type ChartTheme = { ink: string; muted: string; surface: string; gridColor: string }`.
  - `getChartTheme(): ChartTheme` — reads `--ink`/`--muted`/`--surface`/`--border` off `getComputedStyle(document.documentElement)`.
- Consumes: nothing (leaf util, only reads the DOM/CSS vars already defined in `fe-gimb/src/styles/global.css`).

- [ ] **Step 1: Write the file**

```ts
export const chartPalette = ["#3b82f6", "#ef4444", "#10b981", "#8b5cf6", "#d97706", "#ec4899"];

export function formatChartValue(value: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value || 0);
}

export function formatChartPercent(value: number) {
  return `${formatChartValue(value)}%`;
}

export type ChartTheme = {
  ink: string;
  muted: string;
  surface: string;
  gridColor: string;
};

export function getChartTheme(): ChartTheme {
  const style = getComputedStyle(document.documentElement);
  return {
    ink: style.getPropertyValue("--ink").trim(),
    muted: style.getPropertyValue("--muted").trim(),
    surface: style.getPropertyValue("--surface").trim(),
    gridColor: style.getPropertyValue("--border").trim(),
  };
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit` (from `fe-gimb/`)
Expected: no errors. This file has no consumers yet, so this just confirms the syntax/types are valid on their own.

---

### Task 4: Frontend — `AdminAnalyticsChart` component

**Files:**
- Create: `fe-gimb/src/components/organisms/AdminAnalyticsChart.tsx`

**Interfaces:**
- Consumes:
  - `AIReportChartData` from `fe-gimb/src/services/api/types.ts` (`{ id, type, title, unit?, labels: string[], series: { name: string; values: number[] }[] }`).
  - `useThemeSettings()` from `fe-gimb/src/theme/ThemeContext.tsx` → `{ theme: { mode: "light" | "dark" } }`.
  - `chartPalette`, `formatChartValue`, `formatChartPercent`, `getChartTheme`, `ChartTheme` from `./chartTheme` (Task 3).
- Produces: `export function AdminAnalyticsChart({ chart }: { chart: AIReportChartData }): JSX.Element` — the only export, drop-in replacement for `<AIReportChart chart={...} />` on `AdminSummaryPage`.

- [ ] **Step 1: Write the component**

```tsx
import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import type { Plugin, TooltipItem } from "chart.js";
import { Bar, Doughnut, Line, Pie } from "react-chartjs-2";
import type { AIReportChartData } from "../../services/api/types";
import { useThemeSettings } from "../../theme/ThemeContext";
import { chartPalette, formatChartValue, formatChartPercent, getChartTheme, type ChartTheme } from "./chartTheme";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
);

type AdminAnalyticsChartProps = {
  chart: AIReportChartData;
};

function colorsFor(count: number) {
  return Array.from({ length: count }, (_, index) => chartPalette[index % chartPalette.length]);
}

function buildLegendLabels(labels: string[], values: number[]) {
  return (chart: ChartJS) => {
    const total = values.reduce((sum, value) => sum + Math.max(0, value), 0) || 1;
    return labels.map((label, index) => ({
      text: `${label}: ${formatChartValue(values[index] ?? 0)} (${formatChartPercent(((values[index] ?? 0) / total) * 100)})`,
      fillStyle: chartPalette[index % chartPalette.length],
      strokeStyle: chartPalette[index % chartPalette.length],
      hidden: !chart.getDataVisibility(index),
      index,
    }));
  };
}

function percentTooltipLabel(values: number[]) {
  return (context: TooltipItem<"pie"> | TooltipItem<"doughnut">) => {
    const total = values.reduce((sum, value) => sum + Math.max(0, value), 0) || 1;
    const value = values[context.dataIndex] ?? 0;
    return `${context.label}: ${formatChartValue(value)} (${formatChartPercent((value / total) * 100)})`;
  };
}

function plainTooltipLabel(context: TooltipItem<"bar"> | TooltipItem<"line">) {
  const value = typeof context.parsed === "object" ? context.parsed.y : context.parsed;
  return `${context.dataset.label}: ${formatChartValue(value as number)}`;
}

function buildCenterTextPlugin(value: string, label: string, theme: ChartTheme): Plugin<"doughnut"> {
  return {
    id: "centerText",
    afterDraw(chartInstance) {
      const { ctx, chartArea } = chartInstance;
      if (!chartArea) return;
      const centerX = (chartArea.left + chartArea.right) / 2;
      const centerY = (chartArea.top + chartArea.bottom) / 2;
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = theme.ink;
      ctx.font = "700 22px sans-serif";
      ctx.fillText(value, centerX, centerY - 10);
      ctx.font = "800 11px sans-serif";
      ctx.fillStyle = theme.muted;
      ctx.fillText(label.toUpperCase(), centerX, centerY + 14);
      ctx.restore();
    },
  };
}

export function AdminAnalyticsChart({ chart }: AdminAnalyticsChartProps) {
  const { theme } = useThemeSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- theme.mode drives CSS var values read here
  const chartTheme = useMemo(() => getChartTheme(), [theme.mode]);
  const values = chart.series[0]?.values ?? [];
  const colors = colorsFor(chart.labels.length);

  const categoricalPlugins = {
    legend: {
      position: "bottom" as const,
      labels: { color: chartTheme.muted, generateLabels: buildLegendLabels(chart.labels, values), boxWidth: 12, padding: 12 },
    },
    tooltip: {
      backgroundColor: chartTheme.surface,
      titleColor: chartTheme.ink,
      bodyColor: chartTheme.ink,
      borderColor: chartTheme.gridColor,
      borderWidth: 1,
      callbacks: { label: percentTooltipLabel(values) },
    },
  };

  if (chart.type === "doughnut") {
    const topIndex = values.reduce((best, value, index) => (value > (values[best] ?? 0) ? index : best), 0);
    const total = values.reduce((sum, value) => sum + Math.max(0, value), 0) || 1;
    const centerPlugin = buildCenterTextPlugin(
      formatChartPercent(((values[topIndex] ?? 0) / total) * 100),
      chart.labels[topIndex] ?? "",
      chartTheme,
    );
    return (
      <article className="panel inventory-insight-card admin-chart-card">
        <h4>{chart.title}</h4>
        <div className="admin-chart-canvas">
          <Doughnut
            data={{ labels: chart.labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 0 }] }}
            options={{ responsive: true, maintainAspectRatio: false, cutout: "68%", plugins: categoricalPlugins }}
            plugins={[centerPlugin]}
          />
        </div>
      </article>
    );
  }

  if (chart.type === "pie") {
    return (
      <article className="panel inventory-insight-card admin-chart-card">
        <h4>{chart.title}</h4>
        <div className="admin-chart-canvas">
          <Pie
            data={{ labels: chart.labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 0 }] }}
            options={{ responsive: true, maintainAspectRatio: false, plugins: categoricalPlugins }}
          />
        </div>
      </article>
    );
  }

  const axisOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { ...categoricalPlugins.tooltip, callbacks: { label: plainTooltipLabel } },
    },
    scales: {
      x: { ticks: { color: chartTheme.muted }, grid: { display: false } },
      y: { ticks: { color: chartTheme.muted }, grid: { color: chartTheme.gridColor }, beginAtZero: true },
    },
  };

  if (chart.type === "line") {
    return (
      <article className="panel inventory-insight-card admin-chart-card">
        <h4>{chart.title}</h4>
        <div className="admin-chart-canvas">
          <Line
            data={{
              labels: chart.labels,
              datasets: [
                {
                  label: chart.series[0]?.name ?? chart.title,
                  data: values,
                  borderColor: chartPalette[0],
                  backgroundColor: `${chartPalette[0]}33`,
                  fill: true,
                  tension: 0.35,
                  pointRadius: 3,
                },
              ],
            }}
            options={axisOptions}
          />
        </div>
      </article>
    );
  }

  return (
    <article className="panel inventory-insight-card admin-chart-card">
      <h4>{chart.title}</h4>
      <div className="admin-chart-canvas">
        <Bar
          data={{
            labels: chart.labels,
            datasets: [{ label: chart.series[0]?.name ?? chart.title, data: values, backgroundColor: colors, borderRadius: 6 }],
          }}
          options={axisOptions}
        />
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit` (from `fe-gimb/`)
Expected: no errors. If `TooltipItem`/`Plugin` generic mismatches appear, fix the generic type arguments to match the exact Chart.js v4 types (`chart.js`'s `TooltipItem<TType>` and `Plugin<TType>` — check `node_modules/chart.js/dist/types.d.ts` if the error is unclear).

---

### Task 5: Frontend — canvas sizing CSS

**Files:**
- Modify: `fe-gimb/src/styles/global.css`

**Interfaces:**
- Produces: `.admin-chart-card` and `.admin-chart-canvas` classes consumed by `AdminAnalyticsChart.tsx` (Task 4).

Chart.js with `maintainAspectRatio: false` needs an explicitly-sized parent — canvases stretch to fill it. `.inventory-insight-card` (reused as part of the wrapper's className) has no fixed height, so add a dedicated canvas container.

- [ ] **Step 1: Add the CSS**

Add this right after the `.cost-donut` rules (after line 4800, following `.cost-donut span { ... }`) in `fe-gimb/src/styles/global.css`:

```css
.admin-chart-card h4 {
  margin-bottom: 4px;
}

.admin-chart-canvas {
  position: relative;
  height: 260px;
  margin-top: 12px;
}
```

- [ ] **Step 2: Add the mobile override**

Add this inside the existing `@media (max-width: 560px)` block (starts at line 5859), next to the `.cost-donut` mobile override (around line 5953-5956):

```css
  .admin-chart-canvas {
    height: 200px;
  }
```

- [ ] **Step 3: Sanity-check the CSS file is still valid**

Run: `npx tsc --noEmit` (from `fe-gimb/`) — this won't catch CSS errors, but confirms the surrounding TS build isn't broken. CSS syntax itself gets visually verified in Task 7's manual walkthrough (Vite dev server would also fail to start / show an overlay on a genuine CSS parse error).

---

### Task 6: Frontend — wire `AdminSummaryPage` to the new component

**Files:**
- Modify: `fe-gimb/src/pages/AdminSummaryPage.tsx`

**Interfaces:**
- Consumes: `AdminAnalyticsChart` from `../components/organisms/AdminAnalyticsChart` (Task 4).

- [ ] **Step 1: Swap the import**

In `fe-gimb/src/pages/AdminSummaryPage.tsx`, replace line 7:

```ts
import { AIReportChart } from "../components/organisms/AIReportChart";
```

with:

```ts
import { AdminAnalyticsChart } from "../components/organisms/AdminAnalyticsChart";
```

- [ ] **Step 2: Swap the usages**

Replace lines 114-119:

```tsx
            <div className="inventory-insight-grid">
              {charts.map((chart) => (
                <AIReportChart key={chart.id} chart={chart} />
              ))}
              <AIReportChart chart={userStatusChart} />
            </div>
```

with:

```tsx
            <div className="inventory-insight-grid">
              {charts.map((chart) => (
                <AdminAnalyticsChart key={chart.id} chart={chart} />
              ))}
              <AdminAnalyticsChart chart={userStatusChart} />
            </div>
```

`userStatusChart` (defined at lines 78-84) already has `type: "pie"` — no change needed there.

- [ ] **Step 3: Verify it type-checks**

Run: `npx tsc --noEmit` (from `fe-gimb/`)
Expected: no errors.

---

### Task 7: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Backend test suite**

Run: `go test ./...` (from `be-gimb/`)
Expected: PASS.

- [ ] **Step 2: Frontend production build**

Run: `npm run build` (from `fe-gimb/`)
Expected: build succeeds (this also re-runs the TypeScript check via Vite's build step and catches any bundling issue with the new dependencies).

- [ ] **Step 3: Manual browser walkthrough**

Run: `npm run dev` (from `fe-gimb/`) — requires the backend running too (`AdminSummaryPage` calls `adminSummary`, `adminBusinessLimit`, `adminAnalytics`).

Log in as an admin, open `/admin` (Ringkasan Admin), and confirm:
- "Toko per Industri" renders as a bar chart, one bar per industry, tooltip on hover shows the count.
- "Distribusi Status Kesehatan" renders as a doughnut with the dominant status's percentage + name centered inside the ring, legend below lists each status with value and %, clicking a legend item toggles that slice.
- "Tren Submission per Bulan" renders as a line chart with a filled area under the line, 12 months on the x-axis, tooltip shows the value per month.
- "User Aktif vs Suspended" renders as a pie chart with a 2-item legend.
- Toggle the app's light/dark theme (theme settings) and confirm all 4 charts' text/grid colors switch immediately without a page reload.
- Resize the window to mobile width (~375px) and confirm charts shrink to the 200px mobile height and stay readable (no overflow/clipping).

- [ ] **Step 4: Regression check on the untouched AI report page**

Open the AI report for any business (`AIReportPage`, e.g. via a business's "Laporan AI" action) and confirm its charts still render exactly as before — this page still uses `AIReportChart.tsx`, unchanged by this plan.

---

### Task 8: Update project documentation

`fe-gimb/AGENTS.md` requires reading `docs/PROJECT_CONTEXT.md`, `docs/PROJECT_MAP.md`, `docs/PAGE_MAP.md`, `docs/API_INTEGRATION_MAP.md`, and `docs/CURRENT_PROGRESS.md` before changing anything, and updating whichever of them the change affects. Reading them for this plan surfaced two things:

1. This plan's own changes affect `PAGE_MAP.md` (new component on the `/admin` row), `PROJECT_MAP.md` (two new component files), and `API_INTEGRATION_MAP.md` (the `/admin/dashboard/analytics` endpoint was never documented there at all).
2. Pre-existing staleness unrelated to this plan: `PAGE_MAP.md` and `PROJECT_MAP.md` still describe a single `AdminPage.tsx` handling all admin sections, but that page was already split into 5 separate routes/pages (`AdminSummaryPage`, `AdminDiagnosisPage`, `AdminLimitPage`, `AdminUsersPage`, `AdminAuditLogPage` — confirmed present in `fe-gimb/src/App.tsx:56-60`, `AdminPage.tsx` confirmed absent from `fe-gimb/src/pages/`) by earlier, already-shipped work that never updated these docs. `CURRENT_PROGRESS.md`'s route list and one of its notes are stale the same way. The user approved fixing both (this plan's own changes, and this adjacent pre-existing staleness) in this one task, since they land in the same paragraphs/rows.

**Files:**
- Modify: `fe-gimb/docs/PAGE_MAP.md`
- Modify: `fe-gimb/docs/PROJECT_MAP.md`
- Modify: `fe-gimb/docs/API_INTEGRATION_MAP.md`
- Modify: `fe-gimb/docs/CURRENT_PROGRESS.md`
- Modify: `be-gimb/docs/superpowers/specs/2026-08-04-admin-dashboard-split-design.md`

**Interfaces:** none (documentation only).

- [ ] **Step 1: Fix the `/admin` row in `PAGE_MAP.md`**

In `fe-gimb/docs/PAGE_MAP.md`, in the `## Admin-Only` table, replace the single row:

```markdown
| `/admin` | `AdminPage` | `DashboardShell`, admin metrics, diagnosis table, users list, audit logs, pagination, confirmation dialog | Yes | `admin` | `GET /admin/dashboard/summary`, `GET /admin/settings/business-limit`, `PATCH /admin/settings/business-limit`, `GET /admin/users`, `PATCH /admin/users/:id/status`, `PATCH /admin/users/:id/email/verify`, `GET /admin/businesses`, `GET /admin/diagnosis-watchlist`, `GET /admin/audit-logs` | Dashboard admin untuk monitoring operasional, limit toko, user status, verifikasi manual email user, diagnosis watchlist, audit logs, dan tombol coba lagi saat load data gagal. |
```

with 5 rows:

```markdown
| `/admin` | `AdminSummaryPage` | `DashboardShell`, `HolographicCard` metrics, `AdminAnalyticsChart` (Chart.js: bar/doughnut/line/pie) | Yes | `admin` | `GET /admin/dashboard/summary`, `GET /admin/settings/business-limit`, `GET /admin/dashboard/analytics` | Ringkasan admin: 5 kartu angka, 4 chart (toko per industri, distribusi status kesehatan, tren submission 12 bulan, user aktif vs suspended), dan tombol coba lagi saat load gagal. |
| `/admin/diagnosis` | `AdminDiagnosisPage` | `DashboardShell`, tabel diagnosis, `PaginationControls` | Yes | `admin` | `GET /admin/businesses?limit=100&offset=0`, `GET /admin/diagnosis-watchlist` | Tabel Monitoring Diagnosis (toko skor terendah lebih dulu) dengan pagination, tombol aksi Dashboard/Sub Skor/Lihat Input per baris, tombol Laporan AI jika omzet 6 bulan di atas threshold, dan tombol coba lagi saat load gagal. |
| `/admin/limit` | `AdminLimitPage` | `DashboardShell`, form limit toko/user | Yes | `admin` | `GET /admin/settings/business-limit`, `PATCH /admin/settings/business-limit` | Form ubah limit jumlah toko per user. |
| `/admin/users` | `AdminUsersPage` | `DashboardShell`, tabel user, `PaginationControls`, confirmation dialog | Yes | `admin` | `GET /admin/users`, `PATCH /admin/users/:id/status`, `PATCH /admin/users/:id/email/verify` | Tabel user dengan pagination, update status user (selain akun admin sendiri), badge email verified, dan verifikasi manual email dengan konfirmasi. |
| `/admin/audit-log` | `AdminAuditLogPage` | `DashboardShell`, panel audit log, `PaginationControls` | Yes | `admin` | `GET /admin/audit-logs` | Panel audit log dengan pagination, search/filter server-side, dan detail expand. |
```

- [ ] **Step 2: Fix the `AdminPage.tsx` row in `PROJECT_MAP.md` and add the new chart files**

In `fe-gimb/docs/PROJECT_MAP.md`, `## Pages` table, replace:

```markdown
| `src/pages/AdminPage.tsx` | Admin summary, diagnosis, limit, users, audit logs. | Saat mengubah fitur admin utama. |
```

with:

```markdown
| `src/pages/AdminSummaryPage.tsx` | Ringkasan admin: metrics, business limit, dan 4 chart analytics. | Saat mengubah kartu ringkasan atau chart admin. |
| `src/pages/AdminDiagnosisPage.tsx` | Tabel Monitoring Diagnosis dengan pagination dan aksi per baris. | Saat mengubah tabel/aksi diagnosis admin. |
| `src/pages/AdminLimitPage.tsx` | Form limit toko per user. | Saat mengubah pengaturan limit toko. |
| `src/pages/AdminUsersPage.tsx` | Tabel user, update status, verifikasi manual email. | Saat mengubah fitur manajemen user admin. |
| `src/pages/AdminAuditLogPage.tsx` | Panel audit log dengan pagination dan search/filter. | Saat mengubah fitur audit log admin. |
```

In `## Layout dan Komponen`, right after the existing `AIReportChart.tsx` row:

```markdown
| `src/components/organisms/AIReportChart.tsx` | Render chart generik (bar/line/radar/pie/gauge) dari data `AIReportChartData` laporan AI. | Saat mengubah tipe chart atau tampilan visual laporan AI. |
```

add two new rows:

```markdown
| `src/components/organisms/AdminAnalyticsChart.tsx` | Render chart Chart.js (bar/doughnut/line/pie via `react-chartjs-2`) dari `AIReportChartData` untuk `AdminSummaryPage` saja. | Saat mengubah tipe/tampilan chart di Ringkasan Admin. |
| `src/components/organisms/chartTheme.ts` | Palet warna, formatter angka/persen, dan `getChartTheme()` (baca CSS var `--ink`/`--muted`/`--surface`/`--border`) untuk `AdminAnalyticsChart`. | Saat mengubah warna/formatting chart admin atau menambah field tema baru. |
```

- [ ] **Step 3: Add the missing analytics endpoint to `API_INTEGRATION_MAP.md`**

In `fe-gimb/docs/API_INTEGRATION_MAP.md`, `## Admin` table, right after the "Admin summary" row (`GET /admin/dashboard/summary`), add:

```markdown
| Admin analytics | `src/services/api/admin.ts` | GET | `/admin/dashboard/analytics` | Tidak ada | `AdminAnalyticsResponse` (`{ charts: AIReportChartData[] }`) | `AdminSummaryPage` merender 3 chart dari response (`businesses_by_industry`: bar, `status_distribution`: doughnut, `submissions_trend`: line) lewat `AdminAnalyticsChart`, ditambah 1 chart pie `user_status` yang dihitung di frontend dari `AdminSummary`. Error digabung dalam loading Ringkasan Admin. |
```

- [ ] **Step 4: Update `CURRENT_PROGRESS.md`**

In `fe-gimb/docs/CURRENT_PROGRESS.md`:

a) Update line 3 (`Terakhir diperbarui: 2 Agustus 2026`) to today's date.

b) Replace the route list (lines 84-86):

```markdown
- `/admin`
- `/admin/businesses/:businessId/inventory-input`
- `/admin/businesses/:businessId/ai-report`
```

with:

```markdown
- `/admin`
- `/admin/diagnosis`
- `/admin/limit`
- `/admin/users`
- `/admin/audit-log`
- `/admin/businesses/:businessId/inventory-input`
- `/admin/businesses/:businessId/ai-report`
```

c) Replace the "Admin dashboard" bullet block (the `- Admin dashboard:` block, currently listing summary metrics/holographic effect/diagnosis watchlist/business limit/user list/audit log/tombol coba lagi as sub-bullets of one page) with:

```markdown
- Admin dashboard dipecah jadi 5 route/halaman terpisah (`AdminSummaryPage`, `AdminDiagnosisPage`, `AdminLimitPage`, `AdminUsersPage`, `AdminAuditLogPage`), masing-masing fetch data sendiri:
  - `AdminSummaryPage` (`/admin`): summary metrics, efek holographic ringan pada card summary, update business limit, 4 chart Chart.js (bar toko per industri, doughnut distribusi status kesehatan dengan teks tengah, line tren submission 12 bulan, pie user aktif vs suspended), dan tombol coba lagi saat load gagal;
  - `AdminDiagnosisPage` (`/admin/diagnosis`): diagnosis watchlist dengan pagination dan tombol coba lagi;
  - `AdminLimitPage` (`/admin/limit`): update business limit;
  - `AdminUsersPage` (`/admin/users`): user list dengan pagination, update status selain akun admin sendiri, badge email verified, verifikasi manual email dengan konfirmasi, urutan user biasa terbaru lebih dulu, dan admin paling akhir;
  - `AdminAuditLogPage` (`/admin/audit-log`): audit log list dengan pagination, search/filter server-side, detail expand, reload seamless, fullscreen, dan kolom row rata kiri, dengan tombol coba lagi.
```

d) In the "Catatan penting yang ditemukan" list, fix the stale reference:

```markdown
- `AdminPage.updateStatus` tidak memiliki try/catch lokal saat update user status.
```

becomes:

```markdown
- `AdminUsersPage.updateStatus` tidak memiliki try/catch lokal saat update user status.
```

- [ ] **Step 5: Fix the stale spec status line in `be-gimb`**

In `be-gimb/docs/superpowers/specs/2026-08-04-admin-dashboard-split-design.md`, line 3:

```markdown
Status: disetujui user, belum diimplementasikan.
```

becomes:

```markdown
Status: diimplementasikan.
```

- [ ] **Step 6: Re-read the edited docs for internal consistency**

Re-open the 4 edited `fe-gimb` doc files and the 1 edited `be-gimb` spec file. Confirm: no leftover reference to `AdminPage.tsx` as a route handler, the `/admin` sub-route list matches `fe-gimb/src/App.tsx:56-60` exactly, and the new `admin/dashboard/analytics` row's chart-type list matches Task 1's mapping (`bar`/`doughnut`/`line` from backend + client-side `pie`).
