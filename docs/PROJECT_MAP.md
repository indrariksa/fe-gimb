# Project Map

Peta ini membantu Codex berikutnya memilih file yang perlu dibaca sebelum mengubah halaman atau fitur frontend. Baca source aktual sebelum mengubah, karena dokumen ini hanya snapshot.

## Root dan Konfigurasi

| Path | Fungsi | Kapan dibaca/diubah |
| --- | --- | --- |
| `AGENTS.md` | Instruksi kerja repository. | Wajib dibaca sebelum semua tugas frontend. |
| `README.md` | Overview stack, setup, route utama, alur user, payload inventory, role. | Saat onboarding atau memperbarui dokumentasi publik frontend. |
| `package.json` | Dependency dan script npm. | Saat menjalankan project atau mengubah script/dependency. |
| `package-lock.json` | Versi dependency resolved. | Saat memverifikasi versi aktual atau update dependency. |
| `vite.config.ts` | Konfigurasi Vite dan React plugin. | Saat mengubah bundler/dev server/plugin. |
| `tsconfig.json` | Konfigurasi TypeScript strict/noEmit. | Saat mengubah aturan TS. |
| `vercel.json` | Rewrite SPA untuk deployment Vercel. | Saat mengubah hosting/routing production. |
| `.env.example` | Daftar env frontend. | Saat menambah/mengubah environment variable. |
| `public/gimb-icon.svg` | Asset ikon SVG untuk favicon dan brand mark. | Saat mengubah identitas visual aplikasi pada browser tab atau logo sidebar/brand. |

## Entry dan Routing

| Path | Fungsi | Kapan dibaca/diubah |
| --- | --- | --- |
| `src/main.tsx` | Entry point React dan import CSS global. | Saat mengubah provider root/import global. |
| `src/App.tsx` | Provider order dan semua route. | Saat menambah/menghapus route atau mengubah proteksi halaman. |
| `src/components/guards/RequireAuth.tsx` | Route guard auth/admin/user. | Saat mengubah redirect, role access, atau loader session. |

## Auth dan API

| Path | Fungsi | Kapan dibaca/diubah |
| --- | --- | --- |
| `src/context/AuthContext.tsx` | Session state; `user`/`refreshToken` di localStorage `gimb:auth`, `accessToken` in-memory saja (variabel modul `liveAccessToken`); bootstrap refresh; logout (termasuk menyapu localStorage `gimb:sbd:*`); API client config. | Saat mengubah login lifecycle, token storage, refresh behavior, timeout/unauthorized handling. |
| `src/services/api/client.ts` | Base URL, fetch wrapper, auth header, timeout, retry timeout GET/HEAD, API errors. | Saat mengubah API transport, envelope handling, base URL, timeout/retry, atau friendly errors. |
| `src/services/api/auth.ts` | Auth endpoints. | Saat mengubah login/register/email verification/refresh/logout/me/link/unlink Google/setup password/ubah password integration. |
| `src/services/api/businesses.ts` | User business/inventory endpoints. | Saat mengubah fitur toko/inventory user. |
| `src/services/api/admin.ts` | Admin endpoints. | Saat mengubah dashboard admin, audit, users, business limit, diagnosis watchlist. |
| `src/services/api/notifications.ts` | Admin notification REST endpoints dan WebSocket URL helper. | Saat mengubah notifikasi bell admin, unread count, mark read, atau realtime connection. |
| `src/services/api/types.ts` | Type kontrak API. | Saat backend contract berubah atau field response/request baru dipakai. |

## Theme dan Styling

| Path | Fungsi | Kapan dibaca/diubah |
| --- | --- | --- |
| `src/theme/ThemeContext.tsx` | Theme state, localStorage `gimb:sbd:theme`, document title. | Saat mengubah penyimpanan/penerapan tema. |
| `src/theme/theme.ts` | Default theme, CSS variable apply, readable text color. | Saat mengubah token warna/default theme/dark mode logic. |
| `src/styles/global.css` | Semua style, responsive, dark mode, layout, component classes. | Saat mengubah tampilan global, breakpoint, accessibility focus state, atau design system. |
| `src/components/molecules/ThemeCustomizer.tsx` | UI pengaturan warna/theme. | Saat mengubah form setting tema. |
| `src/components/molecules/PublicThemeToggle.tsx` | Toggle light/dark untuk halaman publik landing/login/register. | Saat mengubah kontrol tema di halaman sebelum login. |

## Layout dan Komponen

| Path | Fungsi | Kapan dibaca/diubah |
| --- | --- | --- |
| `src/components/organisms/DashboardShell.tsx` | Layout authenticated, sidebar, nav, topbar, logout, inventory-result nav guard, dan bell notifikasi admin. | Saat mengubah navigasi, shell, logout UI, role nav, sidebar mobile/collapse, atau notifikasi admin. |
| `src/components/organisms/LandingHero.tsx` | Hero landing dan CTA. Entrance animation stagger, aurora background, angka animasi (`AnimatedNumber`), dan tilt panel skor (`HolographicCard`) via library `motion`. | Saat mengubah landing page atas atau animasinya. |
| `src/components/organisms/RadarProfile.tsx` | Business snapshot dari inventory metrics. | Saat mengubah snapshot dashboard. |
| `src/components/organisms/TrendChart.tsx` | Action plan 30 hari dari `analysis.action_plan`, fallback ke issues/recommendations untuk response lama. | Saat mengubah rekomendasi dashboard. |
| `src/components/organisms/AIReportChart.tsx` | Render chart Chart.js (bar horizontal/radar/doughnut/line/doughnut-gauge via `react-chartjs-2`) dari `AIReportChartData` untuk laporan AI; juga meng-export `statusLabel(score)` yang dipakai `AIReportPage`. | Saat mengubah tipe chart atau tampilan visual laporan AI. |
| `src/components/organisms/AdminAnalyticsChart.tsx` | Render chart Chart.js (bar/doughnut/line/pie via `react-chartjs-2`) dari `AIReportChartData` untuk `AdminSummaryPage` saja. | Saat mengubah tipe/tampilan chart di Ringkasan Admin. |
| `src/components/organisms/chartHelpers.ts` | Registrasi elemen Chart.js bersama (`ChartJS.register`) dan helper lintas-chart: `colorsFor`, `buildLegendLabels`, `percentTooltipLabel`, `plainTooltipLabel`, `buildCenterTextPlugin`. Dipakai `AdminAnalyticsChart` dan `AIReportChart`. | Saat mengubah perilaku tooltip/legend/plugin yang dipakai bersama kedua komponen chart. |
| `src/components/organisms/chartTheme.ts` | Palet warna, formatter angka/persen, dan `getChartTheme()` (baca CSS var `--ink`/`--muted`/`--surface`/`--border`) untuk `AdminAnalyticsChart`. | Saat mengubah warna/formatting chart admin atau menambah field tema baru. |
| `src/components/atoms/Button.tsx` | Button base dengan variant. | Saat menambah variant/button behavior. |
| `src/components/atoms/Icon.tsx` | Inline SVG icon registry. | Saat menambah icon. |
| `src/components/atoms/LoadingState.tsx` | Loading state reusable dengan spinner theme-aware. | Saat mengubah tampilan loading halaman/table. |
| `src/components/atoms/TextField.tsx` | Field input dengan prefix/suffix/note/example. | Saat mengubah field inventory/theme input. |
| `src/components/molecules/Brand.tsx` | Brand/logo text dan brand mark dari SVG publik. | Saat mengubah brand display. |
| `src/components/molecules/HolographicCard.tsx` | Wrapper card ringan dengan mouse tilt dan CSS variable untuk efek holographic. | Saat mengubah animasi card ringkasan. |
| `src/components/molecules/ConfirmDialog.tsx` | Dialog konfirmasi reusable (icon, title, message, cancel/confirm button, varian `dashboard`/`plain`, state busy/danger). Dipakai `ThemeCustomizer`, `DashboardShell` (logout), `AdminLimitPage`, `AdminUsersPage`, `InventoryPage`, `SettingsPage` (3 dialog). | Saat menambah/mengubah dialog konfirmasi di halaman mana pun, alih-alih menulis markup `confirm-dialog` baru. |

## Pages

| Path | Fungsi | Kapan dibaca/diubah |
| --- | --- | --- |
| `src/pages/LandingPage.tsx` | Landing sections bawah hero (Tentang, Fitur). Scroll-reveal via `motion` `whileInView`, feature card pakai icon dari `Icon`. | Saat mengubah copy/section landing atau animasinya. |
| `src/pages/LoginPage.tsx` | Login form dan redirect after login. | Saat mengubah login UX/validasi. |
| `src/pages/RegisterPage.tsx` | Register form dan instruksi verifikasi email. | Saat mengubah register UX/validasi. |
| `src/pages/RegistrationSuccessPage.tsx` | Halaman pemberitahuan setelah register, resend verification, dan countdown. | Saat mengubah alur setelah register email/password. |
| `src/pages/VerifyEmailPage.tsx` | Halaman public untuk submit token verifikasi email dari query string. | Saat mengubah alur verifikasi email. |
| `src/pages/BusinessesPage.tsx` | List/create business, business limit, completed inventory check, dropdown jenis usaha (10 kategori tetap + fallback). | Saat mengubah toko/user workspace. |
| `src/pages/InventoryPage.tsx` | Inventory form, local draft, numeric formatting, validation, submit. | Saat mengubah field/payload inventory. |
| `src/pages/AnalysisPage.tsx` | Progress animation dan CTA score. | Saat mengubah flow setelah submit. |
| `src/pages/ScoreResultPage.tsx` | Hasil skor keseluruhan. | Saat mengubah score summary. |
| `src/pages/SubScoresPage.tsx` | Halaman utama diagnosis toko (menggantikan `DashboardPage` yang sudah dihapus): health ring skor keseluruhan, business snapshot, action plan 30 hari, insight prioritas/kekuatan/rekomendasi, enam sub-score detail, radar, bar chart, insight inventory operasional, legend, dan export PDF/XLSX gabungan. | Saat mengubah ringkasan dashboard atau visualisasi sub-score/data inventarisasi. |
| `src/pages/SettingsPage.tsx` | Pengaturan profil, tautkan/lepas tautan Google, setup/ubah password mandiri, dan tema lokal. | Saat mengubah settings atau keamanan akun. |
| `src/pages/AdminSummaryPage.tsx` | Ringkasan admin: metrics, business limit, dan 6 chart analytics. | Saat mengubah kartu ringkasan atau chart admin. |
| `src/pages/AdminDiagnosisPage.tsx` | Tabel Monitoring Diagnosis dengan pagination dan aksi per baris. | Saat mengubah tabel/aksi diagnosis admin. |
| `src/pages/AdminLimitPage.tsx` | Form limit toko per user. | Saat mengubah pengaturan limit toko. |
| `src/pages/AdminUsersPage.tsx` | Tabel user, update status, verifikasi manual email. | Saat mengubah fitur manajemen user admin. |
| `src/pages/AdminAuditLogPage.tsx` | Panel audit log dengan pagination dan search/filter. | Saat mengubah fitur audit log admin. |
| `src/pages/AdminInventoryDetailPage.tsx` | Detail input inventory shared untuk admin dan user, memilih service API berdasarkan role; punya tombol admin ke Laporan Kesehatan Bisnis. | Saat mengubah review/detail inventory. |
| `src/pages/AIReportPage.tsx` | Laporan bisnis AI: polling status, narasi per sub-skor, alternative solutions, chart, export PDF/XLSX, dan regenerate saat gagal. | Saat mengubah tampilan/alur laporan AI. |

## Data, Types, Utilities

| Path | Fungsi | Kapan dibaca/diubah |
| --- | --- | --- |
| `src/data/inventoryFields.ts` | Sumber label/order/note/example field inventory. | Wajib dibaca sebelum mengubah form inventory atau payload mapping. |
| `src/types.ts` | Type UI umum: `View`, `ThemeSettings`, `InventoryField`. | Saat mengubah view enum, navigasi, theme, atau inventory field model. |
| `src/utils/formValidation.ts` | Sanitasi text dan validasi string sederhana. | Saat mengubah validasi form lokal. |
| `src/utils/number.ts` | `formatScore`, `clampPercent`. | Saat mengubah formatting score/progress. |
| `src/utils/exportReport.ts` | `downloadPdfReport`, `downloadWorkbook`, formatter Rupiah, dan filename export. | Saat mengubah export PDF/Excel frontend. |
| `src/utils/color.ts` | `hexToRgb(hex?, fallback?)` — parser hex ke `{r,g,b}` dipakai bersama oleh `exportReport.ts` (warna PDF) dan `theme/theme.ts` (relative luminance). | Saat menambah kebutuhan parsing warna baru; jangan re-implement hex parser di file lain. |
| `src/hooks/useAdminRealtimeSignal.ts` | Hook `useAdminRealtimeSignal()` — listen event `gimb:admin-notification`, return counter yang naik tiap kali event masuk. Dipakai `AdminAuditLogPage`, `AdminUsersPage`, `AdminDiagnosisPage`, `AdminSummaryPage` untuk trigger soft-refresh data tanpa reload penuh. | Saat menambah halaman admin baru yang perlu ikut realtime-refresh saat ada notifikasi. |
| `src/vite-env.d.ts` | Type env Vite. | Saat menambah type env custom jika diperlukan. |

## Existing Docs

| Path | Fungsi | Kapan dibaca/diubah |
| --- | --- | --- |
| `docs/PROJECT_CONTEXT.md` | Konteks frontend menyeluruh. | Baca saat onboarding chat/agent baru. |
| `docs/PAGE_MAP.md` | Peta route dan halaman. | Baca sebelum mengubah routing/akses halaman. |
| `docs/API_INTEGRATION_MAP.md` | Peta service API dan endpoint. | Baca sebelum mengubah integrasi backend. |
| `docs/CURRENT_PROGRESS.md` | Snapshot fitur, risiko, dan verifikasi. | Baca saat meneruskan pekerjaan. |
| `docs/PROJECT_MAP.md` | Peta file penting. | Baca saat menentukan file yang perlu disentuh. |

## Pola Aman Saat Mengubah

- Jangan menjalankan perintah Git.
- Untuk route baru: update `src/App.tsx`, `src/types.ts` jika perlu view baru, dan `DashboardShell` jika masuk navigasi.
- Untuk endpoint baru: tambahkan type di `services/api/types.ts`, fungsi service domain, lalu panggil dari page.
- Untuk protected API: gunakan `apiRequest` default auth; pakai `auth:false` hanya untuk endpoint public/auth.
- Untuk user/admin shared page: ikuti pola `isAdmin ? adminApi... : businessApi...`.
- Untuk form: bersihkan text dengan helper lokal dan tetap anggap backend sebagai validasi final.
- Untuk inventory: ubah `inventoryFields`, mapping payload di `InventoryPage`, type `InventoryPayload`, dan response type jika backend berubah.
- Untuk styling: ubah `global.css` dan pertahankan CSS variable/dark mode `data-theme`.
- Untuk state yang harus survive reload, pakai key localStorage yang eksplisit dan dokumentasikan.
