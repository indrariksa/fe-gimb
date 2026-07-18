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
| `src/context/AuthContext.tsx` | Session state, localStorage `gimb:auth`, bootstrap refresh, logout, API client config. | Saat mengubah login lifecycle, token storage, refresh behavior, timeout/unauthorized handling. |
| `src/services/api/client.ts` | Base URL, fetch wrapper, auth header, timeout, retry timeout GET/HEAD, API errors. | Saat mengubah API transport, envelope handling, base URL, timeout/retry, atau friendly errors. |
| `src/services/api/auth.ts` | Auth endpoints. | Saat mengubah login/register/email verification/refresh/logout/me/link Google/setup password/ubah password integration. |
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
| `src/components/organisms/LandingHero.tsx` | Hero landing dan CTA. | Saat mengubah landing page atas. |
| `src/components/organisms/RadarProfile.tsx` | Business snapshot dari inventory metrics. | Saat mengubah snapshot dashboard. |
| `src/components/organisms/TrendChart.tsx` | Action plan 30 hari dari `analysis.action_plan`, fallback ke issues/recommendations untuk response lama. | Saat mengubah rekomendasi dashboard. |
| `src/components/atoms/Button.tsx` | Button base dengan variant. | Saat menambah variant/button behavior. |
| `src/components/atoms/Icon.tsx` | Inline SVG icon registry. | Saat menambah icon. |
| `src/components/atoms/LoadingState.tsx` | Loading state reusable dengan spinner theme-aware. | Saat mengubah tampilan loading halaman/table. |
| `src/components/atoms/TextField.tsx` | Field input dengan prefix/suffix/note/example. | Saat mengubah field inventory/theme input. |
| `src/components/molecules/Brand.tsx` | Brand/logo text dan brand mark dari SVG publik. | Saat mengubah brand display. |
| `src/components/molecules/HolographicCard.tsx` | Wrapper card ringan dengan mouse tilt dan CSS variable untuk efek holographic. | Saat mengubah animasi card ringkasan. |
| `src/components/molecules/ScoreCard.tsx` | Score card reusable. | Saat mengubah card score dashboard. |

## Pages

| Path | Fungsi | Kapan dibaca/diubah |
| --- | --- | --- |
| `src/pages/LandingPage.tsx` | Landing sections bawah hero. | Saat mengubah copy/section landing. |
| `src/pages/LoginPage.tsx` | Login form dan redirect after login. | Saat mengubah login UX/validasi. |
| `src/pages/RegisterPage.tsx` | Register form dan instruksi verifikasi email. | Saat mengubah register UX/validasi. |
| `src/pages/RegistrationSuccessPage.tsx` | Halaman pemberitahuan setelah register, resend verification, dan countdown. | Saat mengubah alur setelah register email/password. |
| `src/pages/VerifyEmailPage.tsx` | Halaman public untuk submit token verifikasi email dari query string. | Saat mengubah alur verifikasi email. |
| `src/pages/BusinessesPage.tsx` | List/create business, business limit, completed inventory check, industry combobox. | Saat mengubah toko/user workspace. |
| `src/pages/InventoryPage.tsx` | Inventory form, local draft, numeric formatting, validation, submit. | Saat mengubah field/payload inventory. |
| `src/pages/AnalysisPage.tsx` | Progress animation dan CTA score. | Saat mengubah flow setelah submit. |
| `src/pages/ScoreResultPage.tsx` | Hasil skor keseluruhan. | Saat mengubah score summary. |
| `src/pages/DashboardPage.tsx` | Dashboard diagnosis utama. | Saat mengubah summary dashboard/user insight. |
| `src/pages/SubScoresPage.tsx` | Detail enam sub-score, radar, bar chart, insight inventory operasional, dan legend. | Saat mengubah visualisasi sub-score atau data inventarisasi. |
| `src/pages/SettingsPage.tsx` | Pengaturan setup/ubah password mandiri dan tema lokal. | Saat mengubah settings atau keamanan akun. |
| `src/pages/AdminPage.tsx` | Admin summary, diagnosis, limit, users, audit logs. | Saat mengubah fitur admin utama. |
| `src/pages/AdminInventoryDetailPage.tsx` | Detail input inventory shared untuk admin dan user, memilih service API berdasarkan role. | Saat mengubah review/detail inventory. |

## Data, Types, Utilities

| Path | Fungsi | Kapan dibaca/diubah |
| --- | --- | --- |
| `src/data/inventoryFields.ts` | Sumber label/order/note/example field inventory. | Wajib dibaca sebelum mengubah form inventory atau payload mapping. |
| `src/data/dashboardData.ts` | Fallback score cards/trend sample. | Saat mengubah fallback visual sebelum data ada. |
| `src/types.ts` | Type UI umum: `View`, `ThemeSettings`, `InventoryField`. | Saat mengubah view enum, navigasi, theme, atau inventory field model. |
| `src/utils/formValidation.ts` | Sanitasi text dan validasi string sederhana. | Saat mengubah validasi form lokal. |
| `src/utils/number.ts` | `formatScore`, `clampPercent`. | Saat mengubah formatting score/progress. |
| `src/utils/exportReport.ts` | `downloadPdfReport`, `downloadWorkbook`, formatter Rupiah, dan filename export. | Saat mengubah export PDF/Excel frontend. |
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
