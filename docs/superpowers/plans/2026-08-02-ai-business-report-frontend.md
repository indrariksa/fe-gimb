# AI Business Report (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Laporan AI" page that shows the Claude-generated business report (narrative per sub-score + alternative solutions + charts) produced by the `be-gimb` backend, with processing/failed/not-eligible states and a manual regenerate action.

**Architecture:** Follows the existing `fe-gimb` conventions: a new page component under `src/pages`, API calls added to the existing `businesses.ts`/`admin.ts` service files (mirroring how every other business-scoped endpoint is split user vs. admin), a new reusable chart-rendering organism (no charting library — same raw-SVG approach as the rest of the app), and a new route registered both under the general protected group and the admin-only group (mirroring `AdminInventoryDetailPage`'s dual registration).

**Tech Stack:** React 19, TypeScript, React Router 7, existing `xlsx`/`jspdf`/`jspdf-autotable` (already a dependency — reused via `downloadWorkbook`/`downloadPdfReport`, no new export helper needed).

**Companion backend plan:** `be-gimb/docs/superpowers/plans/2026-08-02-ai-business-report-backend.md`. This frontend plan assumes those backend endpoints exist:

```text
GET  /businesses/:id/ai-report
POST /businesses/:id/ai-report/regenerate
GET  /admin/businesses/:id/ai-report
POST /admin/businesses/:id/ai-report/regenerate
```

Response envelope's `data` shape (via `apiRequest<AIReport>`):

```json
{
  "submission_id": "uuid",
  "status": "processing|ready|failed",
  "model": "claude-sonnet-5",
  "report": null,
  "error_message": "",
  "created_at": "...",
  "updated_at": "..."
}
```

`404` means the submission never crossed the revenue threshold (not eligible).

## Global Constraints

- Do not add a new npm dependency; `xlsx`/`jspdf`/`jspdf-autotable` are already used via `src/utils/exportReport.ts` — reuse `downloadPdfReport`/`downloadWorkbook` as-is.
- Use `public_id` (`businessId` route param) in URLs, never an internal UUID.
- All new API calls must go through `apiRequest<T>` (`src/services/api/client.ts`) so auth headers, timeout, envelope parsing, and refresh-on-401 stay consistent.
- Follow the existing user/admin service-file split: user-facing calls in `src/services/api/businesses.ts`, admin calls in `src/services/api/admin.ts`.
- Keep `DashboardShell` as the layout wrapper for this authenticated page.
- Do not run git commands; the user commits manually per this repo's `AGENTS.md`.
- There is no test runner/lint script in this project (per `docs/CURRENT_PROGRESS.md`); verification is `tsc --noEmit` + `npm run build`, matching the project's existing practice.
- After implementation, update `docs/PROJECT_CONTEXT.md`, `docs/PROJECT_MAP.md`, `docs/PAGE_MAP.md`, `docs/API_INTEGRATION_MAP.md`, `docs/CURRENT_PROGRESS.md` per `AGENTS.md` rules (Task 7).

---

### Task 1: API contract types

**Files:**
- Modify: `src/services/api/types.ts`
- Modify: `src/types.ts`

**Interfaces:**
- Produces: `AIReportStatus`, `AIReportScoreDriver`, `AIReportAlternativeSolution`, `AIReportSubScoreAnalysis`, `AIReportRiskAssessment`, `AIReportChartSeries`, `AIReportChartData`, `AIReportContent`, `AIReport` (all in `services/api/types.ts`); `View` gains `"aiReport"` (in `src/types.ts`).

- [ ] **Step 1: Add the AI report types**

In `src/services/api/types.ts`, add at the end of the file:

```ts
export type AIReportStatus = "processing" | "ready" | "failed";

export type AIReportScoreDriver = {
  factor: string;
  effect: string;
};

export type AIReportAlternativeSolution = {
  title: string;
  description: string;
  trade_off: string;
};

export type AIReportSubScoreAnalysis = {
  dimension: string;
  title: string;
  score: number;
  narrative: string;
  score_drivers: AIReportScoreDriver[];
  alternative_solutions: AIReportAlternativeSolution[];
};

export type AIReportRiskAssessment = {
  narrative: string;
  level: string;
};

export type AIReportChartSeries = {
  name: string;
  values: number[];
};

export type AIReportChartData = {
  id: string;
  type: "bar" | "line" | "radar" | "pie" | "gauge";
  title: string;
  labels: string[];
  series: AIReportChartSeries[];
};

export type AIReportContent = {
  meta: {
    generated_at: string;
    model: string;
    scoring_version: string;
    disclaimer: string;
  };
  executive_summary: string;
  business_profile: { narrative: string };
  sub_score_analysis: AIReportSubScoreAnalysis[];
  risk_assessment: AIReportRiskAssessment;
  recommendations: string[];
  conclusion: string;
  charts: AIReportChartData[];
};

export type AIReport = {
  submission_id: string;
  status: AIReportStatus;
  model: string;
  report: AIReportContent | null;
  error_message?: string;
  created_at: string;
  updated_at: string;
};
```

- [ ] **Step 2: Add the new view to the `View` union**

In `src/types.ts`, change:

```ts
export type View = "landing" | "businesses" | "score" | "dashboard" | "subscores" | "inventoryInput" | "inventory" | "settings" | "admin";
```

to:

```ts
export type View = "landing" | "businesses" | "score" | "dashboard" | "subscores" | "inventoryInput" | "inventory" | "aiReport" | "settings" | "admin";
```

- [ ] **Step 3: Verify the project still type-checks**

Run: `node ./node_modules/typescript/bin/tsc --noEmit`
Expected: no errors (these are additive types; nothing consumes `"aiReport"` yet, which is fine — `View` is a superset used by a `Record`/switch in Task 5).

- [ ] **Step 4: Commit**

```bash
git add src/services/api/types.ts src/types.ts
git commit -m "feat(types): add AI business report contract types"
```

---

### Task 2: API service functions

**Files:**
- Modify: `src/services/api/businesses.ts`
- Modify: `src/services/api/admin.ts`

**Interfaces:**
- Consumes: `AIReport` (Task 1), `apiRequest<T>` (existing `client.ts`).
- Produces: `getBusinessAIReport(publicId)`, `regenerateBusinessAIReport(publicId)` (user); `adminBusinessAIReport(publicId)`, `adminRegenerateBusinessAIReport(publicId)` (admin) — consumed by Task 4 (`AIReportPage`) and Task 5 (`AdminInventoryDetailPage`'s link button).

- [ ] **Step 1: Add user-facing calls**

In `src/services/api/businesses.ts`, update the type import line to include `AIReport`:

```ts
import type { AIReport, Business, BusinessLimitSetting, InventoryPayload, InventorySubmission, ListResponse } from "./types";
```

Add at the end of the file:

```ts
export function getBusinessAIReport(publicId: string) {
  return apiRequest<AIReport>(`/businesses/${publicId}/ai-report`);
}

export function regenerateBusinessAIReport(publicId: string) {
  return apiRequest<AIReport>(`/businesses/${publicId}/ai-report/regenerate`, {
    method: "POST",
  });
}
```

- [ ] **Step 2: Add admin calls**

In `src/services/api/admin.ts`, update the type import line to include `AIReport`:

```ts
import type { AdminSummary, AIReport, AuditLog, Business, BusinessLimitSetting, InventorySubmission, ListResponse, User, UserStatus } from "./types";
```

Add at the end of the file:

```ts
export function adminBusinessAIReport(publicId: string) {
  return apiRequest<AIReport>(`/admin/businesses/${publicId}/ai-report`);
}

export function adminRegenerateBusinessAIReport(publicId: string) {
  return apiRequest<AIReport>(`/admin/businesses/${publicId}/ai-report/regenerate`, {
    method: "POST",
  });
}
```

- [ ] **Step 3: Verify the project still type-checks**

Run: `node ./node_modules/typescript/bin/tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/services/api/businesses.ts src/services/api/admin.ts
git commit -m "feat(api): add ai-report get/regenerate service calls"
```

---

### Task 3: `AIReportChart` component

**Files:**
- Create: `src/components/organisms/AIReportChart.tsx`

**Interfaces:**
- Consumes: `AIReportChartData` (Task 1).
- Produces: `AIReportChart({ chart: AIReportChartData })` React component — consumed by Task 4 (`AIReportPage`).

- [ ] **Step 1: Write the component**

```tsx
import type { AIReportChartData } from "../../services/api/types";

type AIReportChartProps = {
  chart: AIReportChartData;
};

const palette = ["#0ea5e9", "#f59e0b", "#22c55e", "#ef4444", "#a855f7", "#14b8a6"];

function formatValue(value: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value || 0);
}

function BarChart({ chart }: AIReportChartProps) {
  const max = Math.max(1, ...chart.series.flatMap((series) => series.values));
  return (
    <div className="ai-report-chart ai-report-chart--bar">
      {chart.labels.map((label, index) => (
        <div key={label} className="ai-report-chart__row">
          <span className="ai-report-chart__label">{label}</span>
          <div className="ai-report-chart__track">
            {chart.series.map((series, seriesIndex) => (
              <div
                key={series.name}
                className="ai-report-chart__bar"
                style={{ width: `${((series.values[index] ?? 0) / max) * 100}%`, background: palette[seriesIndex % palette.length] }}
              />
            ))}
          </div>
          <span className="ai-report-chart__value">
            {chart.series.map((series) => formatValue(series.values[index] ?? 0)).join(" / ")}
          </span>
        </div>
      ))}
    </div>
  );
}

function LineChart({ chart }: AIReportChartProps) {
  const max = Math.max(1, ...chart.series.flatMap((series) => series.values));
  const width = 280;
  const height = 140;
  return (
    <svg className="ai-report-chart ai-report-chart--line" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={chart.title}>
      {chart.series.map((series, seriesIndex) => {
        const points = series.values
          .map((value, index) => {
            const x = chart.labels.length > 1 ? (index / (chart.labels.length - 1)) * width : width / 2;
            const y = height - (Math.max(0, value) / max) * height;
            return `${x},${y}`;
          })
          .join(" ");
        return <polyline key={series.name} points={points} fill="none" stroke={palette[seriesIndex % palette.length]} strokeWidth={2} />;
      })}
    </svg>
  );
}

function RadarChart({ chart }: AIReportChartProps) {
  const size = 220;
  const center = size / 2;
  const maxRadius = size / 2 - 24;
  const count = chart.labels.length || 1;

  const pointsFor = (values: number[]) =>
    values
      .map((value, index) => {
        const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
        const radius = (Math.max(0, Math.min(100, value)) / 100) * maxRadius;
        return `${center + Math.cos(angle) * radius},${center + Math.sin(angle) * radius}`;
      })
      .join(" ");

  return (
    <svg className="ai-report-chart ai-report-chart--radar" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={chart.title}>
      {chart.labels.map((label, index) => {
        const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
        const x = center + Math.cos(angle) * maxRadius;
        const y = center + Math.sin(angle) * maxRadius;
        return <line key={label} x1={center} y1={center} x2={x} y2={y} stroke="var(--border)" strokeWidth={1} />;
      })}
      {chart.series.map((series, seriesIndex) => (
        <polygon
          key={series.name}
          points={pointsFor(series.values)}
          fill={palette[seriesIndex % palette.length]}
          fillOpacity={0.25}
          stroke={palette[seriesIndex % palette.length]}
          strokeWidth={2}
        />
      ))}
    </svg>
  );
}

function PieChart({ chart }: AIReportChartProps) {
  const values = chart.series[0]?.values ?? [];
  const total = values.reduce((sum, value) => sum + Math.max(0, value), 0) || 1;
  const size = 200;
  const radius = size / 2;
  let cumulativeAngle = -Math.PI / 2;

  const slices = values.map((value, index) => {
    const angle = (Math.max(0, value) / total) * Math.PI * 2;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle = endAngle;
    const largeArc = angle > Math.PI ? 1 : 0;
    const x1 = radius + Math.cos(startAngle) * radius;
    const y1 = radius + Math.sin(startAngle) * radius;
    const x2 = radius + Math.cos(endAngle) * radius;
    const y2 = radius + Math.sin(endAngle) * radius;
    return {
      label: chart.labels[index] ?? `slice-${index}`,
      path: `M${radius},${radius} L${x1},${y1} A${radius},${radius} 0 ${largeArc} 1 ${x2},${y2} Z`,
      color: palette[index % palette.length],
    };
  });

  return (
    <svg className="ai-report-chart ai-report-chart--pie" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={chart.title}>
      {slices.map((slice) => (
        <path key={slice.label} d={slice.path} fill={slice.color} />
      ))}
    </svg>
  );
}

function GaugeChart({ chart }: AIReportChartProps) {
  const value = Math.max(0, Math.min(100, chart.series[0]?.values[0] ?? 0));
  const size = 200;
  const radius = size / 2 - 10;
  const center = size / 2;
  const angle = Math.PI * (value / 100);
  const x = center - Math.cos(angle) * radius;
  const y = center - Math.sin(angle) * radius;
  const largeArc = value > 50 ? 1 : 0;

  return (
    <svg className="ai-report-chart ai-report-chart--gauge" viewBox={`0 0 ${size} ${size / 2 + 20}`} role="img" aria-label={chart.title}>
      <path d={`M10,${center} A${radius},${radius} 0 0 1 ${size - 10},${center}`} fill="none" stroke="var(--border)" strokeWidth={14} />
      <path d={`M10,${center} A${radius},${radius} 0 ${largeArc} 1 ${x},${y}`} fill="none" stroke="var(--primary)" strokeWidth={14} strokeLinecap="round" />
      <text x={center} y={center - 6} textAnchor="middle" fontSize={28} fontWeight={700} fill="var(--ink)">
        {formatValue(value)}
      </text>
    </svg>
  );
}

export function AIReportChart({ chart }: AIReportChartProps) {
  return (
    <article className="panel ai-report-chart-card">
      <h3>{chart.title}</h3>
      {chart.type === "bar" && <BarChart chart={chart} />}
      {chart.type === "line" && <LineChart chart={chart} />}
      {chart.type === "radar" && <RadarChart chart={chart} />}
      {chart.type === "pie" && <PieChart chart={chart} />}
      {chart.type === "gauge" && <GaugeChart chart={chart} />}
      <ul className="ai-report-chart__legend">
        {chart.series.map((series, seriesIndex) => (
          <li key={series.name}>
            <span style={{ background: palette[seriesIndex % palette.length] }} />
            {series.name}
          </li>
        ))}
      </ul>
    </article>
  );
}
```

- [ ] **Step 2: Verify the project still type-checks**

Run: `node ./node_modules/typescript/bin/tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/organisms/AIReportChart.tsx
git commit -m "feat(ui): add AIReportChart renderer for bar/line/radar/pie/gauge"
```

---

### Task 4: `AIReportPage`

**Files:**
- Create: `src/pages/AIReportPage.tsx`

**Interfaces:**
- Consumes: `getBusinessAIReport`, `regenerateBusinessAIReport` (Task 2, user), `adminBusinessAIReport`, `adminRegenerateBusinessAIReport` (Task 2, admin), `AIReport`/`AIReportContent` (Task 1), `AIReportChart` (Task 3), existing `DashboardShell`, `LoadingState`, `Button`, `Icon`, `useAuth`, `getFriendlyApiError`/`ApiError` (`client.ts`), `downloadPdfReport`/`downloadWorkbook`/`reportFilename` (`exportReport.ts`), `formatJakartaDateTime` (`dateTime.ts`).
- Produces: `AIReportPage` component — consumed by Task 5 (`App.tsx` routes).

- [ ] **Step 1: Write the page**

```tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "../components/atoms/Button";
import { Icon } from "../components/atoms/Icon";
import { LoadingState } from "../components/atoms/LoadingState";
import { DashboardShell } from "../components/organisms/DashboardShell";
import { AIReportChart } from "../components/organisms/AIReportChart";
import * as businessApi from "../services/api/businesses";
import * as adminApi from "../services/api/admin";
import type { AIReport } from "../services/api/types";
import { useAuth } from "../context/AuthContext";
import { ApiError, getFriendlyApiError } from "../services/api/client";
import { formatJakartaDateTime } from "../utils/dateTime";
import { downloadPdfReport, downloadWorkbook, reportFilename } from "../utils/exportReport";

const pollIntervalMs = 5000;

export function AIReportPage() {
  const { businessId = "" } = useParams();
  const { isAdmin } = useAuth();
  const [report, setReport] = useState<AIReport | null>(null);
  const [notEligible, setNotEligible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const pollTimer = useRef(0);

  const load = useCallback(async () => {
    const getReport = isAdmin ? adminApi.adminBusinessAIReport : businessApi.getBusinessAIReport;
    try {
      const data = await getReport(businessId);
      setReport(data);
      setNotEligible(false);
      setError("");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setReport(null);
        setNotEligible(true);
        setError("");
      } else {
        setError(getFriendlyApiError(err, "Gagal memuat laporan AI"));
      }
    } finally {
      setIsLoading(false);
    }
  }, [businessId, isAdmin]);

  useEffect(() => {
    if (!businessId) return;
    setIsLoading(true);
    load();
  }, [businessId, load]);

  useEffect(() => {
    window.clearTimeout(pollTimer.current);
    if (report?.status === "processing") {
      pollTimer.current = window.setTimeout(load, pollIntervalMs);
    }
    return () => window.clearTimeout(pollTimer.current);
  }, [report, load]);

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const regenerate = isAdmin ? adminApi.adminRegenerateBusinessAIReport : businessApi.regenerateBusinessAIReport;
      const data = await regenerate(businessId);
      setReport(data);
      setError("");
    } catch (err) {
      setError(getFriendlyApiError(err, "Gagal memulai ulang laporan AI"));
    } finally {
      setIsRegenerating(false);
    }
  };

  const content = report?.report;

  const exportPdf = () => {
    if (!content) return;
    downloadPdfReport({
      filename: reportFilename("ai-business-report", businessId, "pdf"),
      title: "Laporan Bisnis AI",
      subtitle: content.meta.disclaimer,
      summary: [
        ["Ringkasan Eksekutif", content.executive_summary],
        ["Tingkat Risiko", content.risk_assessment.level],
        ["Versi Scoring", content.meta.scoring_version],
        ["Dibuat", formatJakartaDateTime(content.meta.generated_at)],
      ],
      scores: content.sub_score_analysis.map((item) => ({ label: item.title, score: item.score })),
      sections: [
        { title: "Profil Bisnis", headers: ["Narasi"], rows: [[content.business_profile.narrative]] },
        ...content.sub_score_analysis.map((item) => ({
          title: `Analisis ${item.title}`,
          headers: ["Bagian", "Isi"],
          rows: [
            ["Narasi", item.narrative],
            ...item.score_drivers.map((driver) => [`Faktor (${driver.effect})`, driver.factor]),
            ...item.alternative_solutions.map((solution) => [`Solusi: ${solution.title}`, `${solution.description} (${solution.trade_off})`]),
          ],
        })),
        { title: "Penilaian Risiko", headers: ["Narasi", "Level"], rows: [[content.risk_assessment.narrative, content.risk_assessment.level]] },
        { title: "Rekomendasi", headers: ["No", "Rekomendasi"], rows: content.recommendations.map((item, index) => [index + 1, item]) },
        { title: "Kesimpulan", headers: ["Narasi"], rows: [[content.conclusion]] },
      ],
    });
  };

  const exportExcel = () => {
    if (!content) return;
    downloadWorkbook(reportFilename("ai-business-report", businessId, "xlsx"), [
      {
        name: "Ringkasan",
        rows: [
          ["Laporan Bisnis AI"],
          ["Ringkasan Eksekutif", content.executive_summary],
          ["Tingkat Risiko", content.risk_assessment.level],
          ["Kesimpulan", content.conclusion],
        ],
      },
      {
        name: "Sub Skor",
        rows: [
          ["Dimensi", "Skor", "Narasi"],
          ...content.sub_score_analysis.map((item) => [item.title, item.score, item.narrative]),
        ],
      },
      {
        name: "Solusi Alternatif",
        rows: [
          ["Dimensi", "Solusi", "Deskripsi", "Trade-off"],
          ...content.sub_score_analysis.flatMap((item) =>
            item.alternative_solutions.map((solution) => [item.title, solution.title, solution.description, solution.trade_off]),
          ),
        ],
      },
      {
        name: "Rekomendasi",
        rows: [["No", "Rekomendasi"], ...content.recommendations.map((item, index) => [index + 1, item])],
      },
    ]);
  };

  return (
    <DashboardShell activeView="aiReport" title="Laporan Bisnis AI">
      <section className="ai-report">
        {isLoading && <LoadingState>Memuat laporan AI...</LoadingState>}

        {!isLoading && notEligible && (
          <article className="panel empty-state">
            <span><Icon name="bulb" /></span>
            <h3>Laporan AI belum tersedia</h3>
            <p>Laporan AI tersedia otomatis untuk omzet 6 bulan di atas Rp 50 juta setelah submit inventarisasi.</p>
          </article>
        )}

        {!isLoading && error && (
          <article className="panel empty-state retry-state">
            <span>{error}</span>
            <Button
              className="btn--dashboard-hover"
              onClick={() => {
                setIsLoading(true);
                load();
              }}
            >
              Coba lagi <Icon name="refresh" size={18} />
            </Button>
          </article>
        )}

        {!isLoading && !error && !notEligible && report?.status === "processing" && (
          <LoadingState>Laporan AI sedang diproses, biasanya beberapa saat...</LoadingState>
        )}

        {!isLoading && !error && !notEligible && report?.status === "failed" && (
          <article className="panel empty-state retry-state">
            <span><Icon name="alert" /></span>
            <strong>Laporan AI gagal dibuat.</strong>
            <Button className="btn--dashboard-hover" onClick={handleRegenerate} disabled={isRegenerating}>
              {isRegenerating ? "Memulai ulang..." : "Generate Ulang"} <Icon name="refresh" size={18} />
            </Button>
          </article>
        )}

        {!isLoading && !error && !notEligible && report?.status === "ready" && content && (
          <>
            <div className="ai-report__actions">
              <Button className="btn--dashboard-hover" variant="dark" onClick={exportExcel}>
                <Icon name="download" size={18} /> Excel
              </Button>
              <Button className="btn--dashboard-hover" variant="dark" onClick={exportPdf}>
                <Icon name="file" size={18} /> PDF
              </Button>
            </div>
            <article className="panel ai-report__summary">
              <h2>Ringkasan Eksekutif</h2>
              <p>{content.executive_summary}</p>
              <p className="ai-report__disclaimer">{content.meta.disclaimer}</p>
            </article>
            <article className="panel">
              <h2>Profil Bisnis</h2>
              <p>{content.business_profile.narrative}</p>
            </article>
            <div className="ai-report__charts">
              {content.charts.map((chart) => (
                <AIReportChart key={chart.id} chart={chart} />
              ))}
            </div>
            <div className="ai-report__sub-scores">
              {content.sub_score_analysis.map((item) => (
                <article key={item.dimension} className="panel ai-report__sub-score">
                  <h3>
                    {item.title} <span>{item.score}</span>
                  </h3>
                  <p>{item.narrative}</p>
                  <ul className="ai-report__drivers">
                    {item.score_drivers.map((driver) => (
                      <li key={driver.factor}>
                        {driver.factor} - <em>{driver.effect}</em>
                      </li>
                    ))}
                  </ul>
                  {item.alternative_solutions.length > 0 && (
                    <div className="ai-report__solutions">
                      <h4>Alternatif Solusi</h4>
                      {item.alternative_solutions.map((solution) => (
                        <div key={solution.title} className="ai-report__solution">
                          <strong>{solution.title}</strong>
                          <p>{solution.description}</p>
                          <small>Trade-off: {solution.trade_off}</small>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
            <article className="panel">
              <h2>Penilaian Risiko - {content.risk_assessment.level}</h2>
              <p>{content.risk_assessment.narrative}</p>
            </article>
            <article className="panel">
              <h2>Rekomendasi</h2>
              <ul>
                {content.recommendations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article className="panel">
              <h2>Kesimpulan</h2>
              <p>{content.conclusion}</p>
            </article>
          </>
        )}
      </section>
    </DashboardShell>
  );
}
```

Note: the export filename uses `businessId` (the route's `public_id`) rather than the business display name, since this page does not otherwise need to fetch the `Business` record — a deliberate simplification consistent with keeping this page's data needs to just the AI report itself.

- [ ] **Step 2: Verify the project still type-checks**

Run: `node ./node_modules/typescript/bin/tsc --noEmit`
Expected: no errors. (`activeView="aiReport"` will only compile once Task 5 makes `DashboardShell` accept it via the updated `View` union — if running this step before Task 5, expect a type error on that line only; re-run after Task 5.)

- [ ] **Step 3: Commit**

```bash
git add src/pages/AIReportPage.tsx
git commit -m "feat(ui): add AIReportPage with processing/failed/not-eligible states"
```

---

### Task 5: Routing and navigation

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/organisms/DashboardShell.tsx`
- Modify: `src/pages/AdminInventoryDetailPage.tsx`

**Interfaces:**
- Consumes: `AIReportPage` (Task 4), `View` (Task 1).
- Produces: routes `/businesses/:businessId/ai-report` and `/admin/businesses/:businessId/ai-report`; sidebar nav item "Laporan AI" for users; an admin-only link button from the inventory detail page.

- [ ] **Step 1: Register routes in `App.tsx`**

Add the import:

```tsx
import { AIReportPage } from "./pages/AIReportPage";
```

Add inside the general protected `<Route element={<RequireAuth />}>` group, after the `inventory-input` line:

```tsx
              <Route path="/businesses/:businessId/ai-report" element={<AIReportPage />} />
```

Add inside the `<Route element={<RequireAuth adminOnly />}>` group, after the admin `inventory-input` line:

```tsx
              <Route path="/admin/businesses/:businessId/ai-report" element={<AIReportPage />} />
```

- [ ] **Step 2: Add the route mapping and sidebar nav item in `DashboardShell`**

In `routeByView`, add a new local and include it in the returned object:

```ts
  const aiReport = businessId ? `/businesses/${businessId}/ai-report` : "/businesses";
```

and add `aiReport,` to the object literal returned by `routeByView` (alongside `dashboard`, `subscores`, etc.).

In `userNavigation`, add a new entry after the "Hasil Input" (`inventoryInput`) item:

```ts
    { view: "aiReport", label: "Laporan AI", icon: "bulb", disabledReason: needsBusiness ? "Pilih toko dulu" : !hasInventoryResult ? "Isi inventory dulu" : undefined },
```

- [ ] **Step 3: Add an admin entry point from the inventory detail page**

In `src/pages/AdminInventoryDetailPage.tsx`, inside the `.admin-inventory-hero__content` block (the `<h2>{business?.name ...}</h2>` / `<p>...</p>` area), add, only for admins:

```tsx
                {isAdmin && (
                  <Button className="btn--dashboard-hover" variant="secondary" onClick={() => navigate(`/admin/businesses/${businessId}/ai-report`)}>
                    Laporan AI <Icon name="bulb" size={18} />
                  </Button>
                )}
```

(Users already reach the equivalent page through the new sidebar item from Step 2, so this admin-only shortcut avoids duplicating a link for users who already have one.)

- [ ] **Step 4: Verify the project still type-checks and builds**

Run: `node ./node_modules/typescript/bin/tsc --noEmit`
Expected: no errors (this also re-validates Task 4's `activeView="aiReport"` line now that `View` and `DashboardShell`'s nav config accept it).

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/organisms/DashboardShell.tsx src/pages/AdminInventoryDetailPage.tsx
git commit -m "feat(routing): wire ai-report route and navigation entry points"
```

---

### Task 6: Styling

**Files:**
- Modify: `src/styles/global.css`

**Interfaces:** None (CSS only, consumed by class names used in Tasks 3-4).

- [ ] **Step 1: Append the new styles**

Add at the end of `src/styles/global.css`:

```css
.ai-report { display: flex; flex-direction: column; gap: 20px; }
.ai-report__actions { display: flex; gap: 12px; justify-content: flex-end; }
.ai-report__summary p { line-height: 1.7; }
.ai-report__disclaimer { color: var(--text-tertiary); font-size: var(--text-caption); margin-top: 12px; }
.ai-report__charts { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
.ai-report__sub-scores { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
.ai-report__sub-score h3 { display: flex; justify-content: space-between; align-items: baseline; }
.ai-report__sub-score h3 span { color: var(--primary); font-weight: 700; }
.ai-report__drivers { list-style: none; margin: 12px 0; padding: 0; display: flex; flex-direction: column; gap: 6px; color: var(--text-secondary); }
.ai-report__solutions { margin-top: 12px; border-top: 1px solid var(--border); padding-top: 12px; }
.ai-report__solution { margin-top: 8px; }
.ai-report__solution small { color: var(--text-tertiary); }

.ai-report-chart-card h3 { font-size: var(--text-card); margin-bottom: 12px; }
.ai-report-chart { width: 100%; }
.ai-report-chart--bar { display: flex; flex-direction: column; gap: 10px; }
.ai-report-chart__row { display: grid; grid-template-columns: 120px 1fr auto; gap: 10px; align-items: center; }
.ai-report-chart__track { position: relative; height: 10px; border-radius: 6px; background: var(--surface-soft); overflow: hidden; }
.ai-report-chart__bar { position: absolute; top: 0; left: 0; height: 100%; border-radius: 6px; }
.ai-report-chart__label { color: var(--text-secondary); font-size: var(--text-body-sm); }
.ai-report-chart__value { color: var(--text-tertiary); font-size: var(--text-caption); text-align: right; }
.ai-report-chart--line, .ai-report-chart--radar, .ai-report-chart--pie, .ai-report-chart--gauge { max-width: 260px; margin: 0 auto; display: block; }
.ai-report-chart__legend { list-style: none; display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; padding: 0; }
.ai-report-chart__legend li { display: flex; align-items: center; gap: 6px; font-size: var(--text-caption); color: var(--text-secondary); }
.ai-report-chart__legend span { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
```

These rely entirely on the existing custom properties (`--primary`, `--border`, `--surface-soft`, `--text-secondary`, `--text-tertiary`, `--text-caption`, `--text-body-sm`, `--text-card`) that already flip between light/dark via `:root[data-theme="dark"]`, so no separate dark-mode block is needed.

- [ ] **Step 2: Manually smoke-check in the browser**

Run: `npm run dev`
Visit a business with `six_month_revenue` above the configured threshold, log in as its owner, open "Laporan AI" from the sidebar. Confirm: processing/empty/ready states render without layout breakage in both light and dark mode (toggle via the topbar sun/moon control).

- [ ] **Step 3: Commit**

```bash
git add src/styles/global.css
git commit -m "style: add ai-report page and chart styles"
```

---

### Task 7: Update project documentation

**Files:**
- Modify: `docs/PROJECT_CONTEXT.md`
- Modify: `docs/PROJECT_MAP.md`
- Modify: `docs/PAGE_MAP.md`
- Modify: `docs/API_INTEGRATION_MAP.md`
- Modify: `docs/CURRENT_PROGRESS.md`
- Modify: `README.md`

**Interfaces:** None (documentation only).

- [ ] **Step 1: Update `docs/PROJECT_CONTEXT.md`**

Add the new route to "Routing" (protected/general list) and mention the AI report feature and its polling/regenerate behavior under "Fitur Terimplementasi" and wherever inventory/dashboard flow is described.

- [ ] **Step 2: Update `docs/PROJECT_MAP.md`**

Add rows for `src/pages/AIReportPage.tsx` and `src/components/organisms/AIReportChart.tsx`.

- [ ] **Step 3: Update `docs/PAGE_MAP.md`**

Add a row for `/businesses/:businessId/ai-report` (Protected Umum table) and `/admin/businesses/:businessId/ai-report` (Admin-Only table), matching the existing table columns (Route, Halaman, Komponen Utama, Auth, Role, API yang Digunakan, Fungsi).

- [ ] **Step 4: Update `docs/API_INTEGRATION_MAP.md`**

Add the four new endpoints (`GET`/`POST regenerate`, user and admin) with their request/response shape, matching the file's existing format.

- [ ] **Step 5: Update `docs/CURRENT_PROGRESS.md`**

Add a bullet under "Fitur yang Sudah Terimplementasi" and add the new route under "Halaman yang Sudah Tersedia". Update the last-updated date at the top of the document.

- [ ] **Step 6: Update `README.md`**

Add `/businesses/:businessId/ai-report` to "Route Utama".

- [ ] **Step 7: Commit**

```bash
git add docs/PROJECT_CONTEXT.md docs/PROJECT_MAP.md docs/PAGE_MAP.md docs/API_INTEGRATION_MAP.md docs/CURRENT_PROGRESS.md README.md
git commit -m "docs: document AI business report page and routes"
```

---

### Task 8: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Full type-check**

Run: `node ./node_modules/typescript/bin/tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: Full production build**

Run: `npm run build`
Expected: exit code `0`, `dist/` produced.

- [ ] **Step 3: Manual smoke test of all four states**

Using a running `be-gimb` backend (with `ANTHROPIC_API_KEY` set) and `npm run dev`:
- Not-eligible: open a business whose latest submission's `six_month_revenue` is below the threshold — confirm the empty state message shows.
- Processing: submit a new inventory above the threshold, immediately open "Laporan AI" — confirm the processing state shows and polling eventually flips to `ready` (or `failed`).
- Ready: confirm narrative, `alternative_solutions`, charts, PDF and Excel export buttons all work.
- Failed: (if reachable, e.g. by temporarily misconfiguring `ANTHROPIC_API_KEY` on the backend) confirm the "Generate Ulang" button appears and re-triggers processing.

Report back which of these were actually exercised versus skipped due to environment constraints — do not claim a state was verified without running it.

- [ ] **Step 4: Report results to the user**

Summarize: files changed, verification commands run and their results, which of the four UI states were manually exercised, and any follow-up work left (e.g. documentation not yet updated, states not reachable in the current environment).

---

## Self-Review Notes

- **Spec coverage:** get/regenerate for user and admin (Task 2, 4), processing/ready/failed/not-eligible states with polling (Task 4), narrative per sub-score + alternative solutions + charts rendering (Task 3, 4), navigation entry points for both roles (Task 5), PDF/XLSX export reusing existing utilities without new dependencies (Task 4), documentation (Task 7) — all covered.
- **Placeholder scan:** no TBD/TODO; every step has runnable code or an explicit shell/manual-check instruction.
- **Type consistency:** `AIReport`/`AIReportContent`/`AIReportChartData` field names in Task 1 match what Task 3's `AIReportChart` and Task 4's `AIReportPage` destructure; `View`'s `"aiReport"` member (Task 1) matches the `activeView`/`routeByView`/navigation entries added in Task 5.
- **Out of scope (per approved spec, matches backend plan):** no client-side threshold configuration UI, no admin approval/publish step before a `ready` report is visible to the user, no additional charting library.
