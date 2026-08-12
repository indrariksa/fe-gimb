# Current Progress

Terakhir diperbarui: 11 Agustus 2026

Dokumen ini mencatat kondisi source code frontend `fe-gimb` saat ini. Jangan menganggap build/test berhasil kecuali bagian verifikasi menyebut perintah yang benar-benar dijalankan.

## Fitur yang Sudah Terimplementasi

- React/Vite SPA dengan BrowserRouter.
- Landing page untuk Smart Business Dashboard.
- Login email-password dan register email-password dengan verifikasi email; register mengikuti response backend yang membuat token lalu mengirim email di background via Resend API atau SMTP, dan retry register untuk akun belum verified dengan password yang sama mengikuti response sukses backend sebagai recovery email verifikasi.
- Halaman verifikasi email `/verify-email` dengan deduplicate request per token, retry sekali untuk `404` sesaat, CTA login yang membawa email agar field login otomatis terisi, countdown resend dari response backend, dan `retry_after_seconds` saat `429`.
- Halaman sukses registrasi `/registration-success` dengan resend email verification, countdown dari response backend, dan `retry_after_seconds` saat `429`.
- Login/register Google via Google Identity Services jika `VITE_GOOGLE_CLIENT_ID` diisi.
- Update nama profile, tautkan/lepas tautan Google, setup password akun Google-only, dan ubah password mandiri dari halaman settings.
- Session auth: `user` dan `refreshToken` disimpan di `localStorage` key `gimb:auth`; `accessToken` sengaja hanya disimpan in-memory (variabel modul `liveAccessToken` di `AuthContext.tsx`, tidak di-persist) supaya tidak nyangkut di disk kalau ada XSS — konsekuensinya reload halaman selalu memicu `/auth/refresh` karena access token hilang saat memory di-reset.
- Lazy refresh token saat bootstrap aplikasi jika access token expired atau hampir expired.
- API client fetch wrapper dengan timeout 15 detik, retry timeout sekali untuk request GET/HEAD, auth header, envelope parsing, refresh-on-401 sekali, dan unauthorized handler.
- Route guard authenticated, admin-only, user-only, dan loader sesi dengan spinner ringan.
- Loading state halaman/table memakai spinner reusable yang mengikuti tema.
- Redirect role:
  - admin ke `/admin`;
  - user ke `/businesses`.
- DashboardShell untuk halaman authenticated:
  - sidebar desktop/mobile;
  - collapse sidebar lokal;
  - role-based navigation termasuk menu user Hasil Input ke detail data inventarisasi;
  - theme toggle;
  - logout confirmation.
- Daftar toko user.
- Halaman user utama menyediakan tombol coba lagi saat load data gagal.
- Create toko dengan validasi lokal dan business limit dari backend.
- Status inventory tiap toko melalui latest inventory check; kartu usaha yang sudah ada submission menampilkan tombol Sub Skor/Lihat Hasil Input berukuran compact (`.business-card__actions .btn`), plus tombol keempat yang bergantian tergantung status kunci laporan AI (dicek lewat `GET .../health-report` per item): "Edit" menuju form edit kalau belum terkunci, atau "Laporan Kesehatan Bisnis" kalau sudah terkunci (`processing`/`ready`).
- Detail data inventarisasi untuk user dari Sub Skor toko dan daftar toko. Kartu ringkasan (omzet, transaksi, repeat ratio, dll) di halaman ini sudah dihapus karena dobel dengan Business Snapshot di Sub Skor — sekaligus memperbaiki bug "Repeat Ratio" di Business Snapshot (`RadarProfile.tsx`) yang sebelumnya salah pakai field `repeat_to_new_ratio` (bisa >100%) padahal seharusnya `retention_rate`.
- Form inventarisasi business-scoped, dengan mode edit: kalau submission sudah ada dan belum terkunci laporan AI, form ke-prefill dari data lama dan submit memanggil `PUT` (bukan redirect otomatis ke Sub Skor seperti sebelumnya); kalau sudah terkunci, tetap redirect seperti semula. Status terkunci dicek lewat `GET .../health-report` (`processing`/`ready` = terkunci).
- Draft inventory per business di localStorage (`gimb:sbd:inventory:<businessId>`); ikut dibersihkan otomatis saat logout/sesi invalid (`AuthContext.tsx` menyapu semua key berprefix `gimb:sbd:`).
- Confirmation dialog submit inventory.
- Analysis progress page berbasis timer lokal.
- Score result page.
- Halaman `DashboardPage` terpisah sudah dihapus dan digabung ke `/businesses/:businessId/sub-scores` (`SubScoresPage`) supaya tidak ada dua halaman dengan informasi sama; `/businesses/:businessId/dashboard` sekarang redirect ke sub-scores. Sub-scores page kini berisi (urut dari atas): health ring skor keseluruhan, business snapshot (`RadarProfile`, disusun vertikal di bawah health ring, bukan 2 kolom), card enam sub-skor, radar SVG, bar chart, insight operasional inventory termasuk sisa margin, dan legend — semua readable di light/dark mode. Action plan 30 hari dari `analysis.action_plan` dan insight prioritas/kekuatan/rekomendasi (rule-based) selalu tampil untuk semua toko. Sebelumnya disembunyikan untuk toko dengan omzet 6 bulan di atas Rp 50 juta (`aiReportRevenueThreshold` di `SubScoresPage.tsx`, mirror `AI_REPORT_REVENUE_THRESHOLD` backend) karena Laporan Kesehatan Bisnis dulu auto-generate di atas threshold itu; sejak generate laporan jadi manual/opt-in dan backend sudah menghapus `AI_REPORT_REVENUE_THRESHOLD` sama sekali, gating omzet ini dihapus (`aiReportRevenueThreshold` konstanta ikut dihapus dari `SubScoresPage.tsx` dan `AdminDiagnosisPage.tsx`) supaya toko yang belum generate laporan tetap dapat insight, dan admin bisa lihat link Laporan Kesehatan Bisnis untuk semua toko bukan cuma yang omzetnya besar.
- Business Snapshot (`RadarProfile.tsx`) memuat 8 metrik: omzet 6 bulan, estimasi laba bersih, total biaya, total transaksi, rata-rata transaksi, repeat ratio, pelanggan aktif, aset, dan modal.
- CSS efek hover/dekorasi kartu (`health-card`, `trend-card`, `radar-card`, `snapshot-card`, `insight-card`) di `global.css` di-rescope dari `.dashboard` (class yang sudah tidak ada sejak `DashboardPage` dihapus, sehingga efeknya mati total) ke `.subscores-page`, satu-satunya halaman yang memakai komponen-komponen ini sekarang.
- Export PDF report dan XLSX gabungan (satu tombol masing-masing) untuk seluruh laporan kesehatan bisnis di sub-scores page (sebelumnya terpisah antara dashboard summary dan sub-scores detailed analysis).
- Page navigation (pill nav dengan style tersendiri, bukan tombol biasa) antar halaman Sub Skor, Lihat Input, dan Laporan Kesehatan Bisnis untuk memudahkan pindah halaman satu sama lain.
- Kartu "Analisis Keuangan" (BEP, CAPEX, payback period, ROI) di Sub Skor page, dihitung dari data inventarisasi yang sudah ada (tanpa field input baru) — CVP analysis standar untuk bisnis dagang (HPP = biaya variabel, biaya operasional+gaji+marketing = biaya tetap). Semua nominal rupiah di halaman ini pakai format penuh (`formatRupiah`), bukan format ringkas "jt"/"rb", supaya nominalnya jelas.
- Settings page untuk update nama profile dengan konfirmasi, metode login readonly, tautkan atau lepas tautan Google dengan konfirmasi, guard agar akun Google-only membuat password dulu sebelum unlink, dan setup/ubah password mandiri dalam layout 50/50, lalu warna tema lokal tampil full-width dengan preview tema mini.
- Theme provider dengan dark/light mode, OS preference initial mode, CSS variable colors, document title, dan toggle tema di landing/login/register.
- Admin dashboard dipecah jadi 5 route/halaman terpisah (`AdminSummaryPage`, `AdminDiagnosisPage`, `AdminLimitPage`, `AdminUsersPage`, `AdminAuditLogPage`), masing-masing fetch data sendiri:
  - `AdminSummaryPage` (`/admin`): summary metrics, efek holographic ringan pada card summary, update business limit, 6 chart Chart.js (bar toko per industri dengan top-6 + "Lainnya" (bucket "Lainnya" dijumlah), doughnut distribusi status kesehatan, line tren submission 12 bulan dengan label bulan-tahun Indonesia, line tren user baru 12 bulan, bar rata-rata omzet per industri dengan top-6 + "Lainnya" (bucket "Lainnya" dirata-rata, bukan dijumlah, karena nilainya sudah berupa rata-rata) dan format Rupiah di tooltip/sumbu-Y, pie user aktif vs suspended), dan tombol coba lagi saat load gagal;
  - `AdminDiagnosisPage` (`/admin/diagnosis`): diagnosis watchlist dengan pagination dan tombol coba lagi;
  - `AdminLimitPage` (`/admin/limit`): update business limit;
  - `AdminUsersPage` (`/admin/users`): user list dengan pagination, update status selain akun admin sendiri, badge email verified, verifikasi manual email dengan konfirmasi, urutan user biasa terbaru lebih dulu, dan admin paling akhir;
  - `AdminAuditLogPage` (`/admin/audit-log`): audit log list dengan pagination, search/filter server-side, detail expand, reload seamless, fullscreen, dan kolom row rata kiri, dengan tombol coba lagi.
- Admin bell notification:
  - load recent notifications;
  - unread count;
  - mark one/read all;
  - WebSocket realtime dengan reconnect sederhana;
  - dropdown dan toast menampilkan waktu notifikasi di kanan judul dengan format relatif lalu tanggal/jam Asia/Jakarta untuk data lama.
- Admin inventory detail/input readout page (`AdminInventoryDetailPage`, dipakai user & admin); sisi user menampilkan link "Edit Data" di page-nav kalau submission belum terkunci laporan AI.
- Laporan Kesehatan Bisnis `/businesses/:businessId/health-report` (dan versi admin `/admin/businesses/:businessId/health-report`): polling status processing/ready/failed, narasi per sub-skor dengan score drivers dan alternative solutions, kartu "Analisis Keuangan" sekarang menampilkan `financial_analysis.points` (4-6 poin pendek) sebagai bullet list (`<ul className="financial-tiles__points">`), bukan paragraf narasi panjang, 10 chart Chart.js (`AIReportChart`) per submission — bar horizontal (`indexAxis: 'y'`, tinggi menyesuaikan jumlah baris) untuk 7 chart nilai, radar untuk profil skor, doughnut dengan teks tengah untuk struktur biaya, dan doughnut gauge (nilai vs sisa 100) dengan teks tengah skor+status untuk skor keseluruhan sebagai capstone card full-width, export PDF/XLSX reuse `downloadPdfReport`/`downloadWorkbook` (poin financial analysis diexport sebagai baris "Poin 1", "Poin 2", dst). Prompt Claude di backend (`claude_client.go`) diinstruksikan pakai bahasa Indonesia sehari-hari yang santai untuk seluruh teks narasi laporan, bukan bahasa baku/formal. Generate laporan sekarang manual (tidak lagi otomatis saat submit inventory): copy pitch marketing "Ungkap Kesehatan Bisnis Anda Lebih Dalam" + tombol "Buat Laporan Sekarang" muncul untuk user saat laporan belum pernah ada (`404`), tombol "Generate Ulang" saat status `failed` — keduanya lewat `ConfirmDialog` yang memperingatkan data inventarisasi akan terkunci begitu laporan berhasil dibuat; copy tombol/judul tidak menyebut "AI". Admin cuma dapat tombol "Generate Ulang" saat `failed`, tidak bisa memicu generate pertama kali.
- `chartTheme.ts` (`getChartTheme`) sekarang menurunkan warna chart Chart.js langsung dari `theme.mode` (lookup statis light/dark) alih-alih membaca `getComputedStyle(document.documentElement)`. Sebelumnya ada race condition: `ThemeProvider` menerapkan atribut `data-theme` lewat `useEffect` yang berjalan setelah render komponen chart, jadi `getChartTheme()` bisa membaca warna tema sebelumnya. Dipakai di `AIReportChart.tsx` dan `AdminAnalyticsChart.tsx`.
- Semua komponen `<Radar>/<Doughnut>/<Pie>/<Bar>/<Line>` di `AIReportChart.tsx` dan `AdminAnalyticsChart.tsx` diberi `key={theme.mode}` supaya chart di-remount penuh saat ganti tema — sebelumnya plugin custom penggambar teks tengah gauge (`centerText` di `chartHelpers.ts`) bisa "kebeku" pakai warna dari tema saat chart pertama kali mount, karena react-chartjs-2 tidak selalu re-register plugin lewat prop `plugins` setelah chart aktif, sehingga teks jadi tidak kelihatan (warna gelap di atas background gelap) setelah pindah ke dark mode.
- `buildLegendLabels` (`chartHelpers.ts`) sekarang menerima parameter warna dan set `fontColor` eksplisit per item legend. Sebelumnya `generateLabels` custom pada legend doughnut/pie tidak pernah kasih `fontColor`, jadi Chart.js pakai warna default internalnya sendiri (bukan `chartTheme.muted`), teks legend jadi selalu gelap tidak peduli tema.
- SVG favicon dan brand mark aplikasi melalui `public/gimb-icon.svg`.
- TypeScript type kontrak API di `src/services/api/types.ts`.
- Helper tanggal/jam terpusat `src/utils/dateTime.ts` memformat tampilan manusia dengan timezone eksplisit `Asia/Jakarta`.
- Responsive styling di `global.css`.
- Beberapa atribut ARIA untuk dialog, menu, pagination, icons, timeout alert.
- Vercel SPA rewrite.

## Halaman yang Sudah Tersedia

- `/`
- `/login`
- `/register`
- `/registration-success`
- `/verify-email`
- `/businesses`
- `/businesses/:businessId/score`
- `/businesses/:businessId/sub-scores`
- `/businesses/:businessId/inventory-input`
- `/businesses/:businessId/inventory/new`
- `/businesses/:businessId/analysis`
- `/businesses/:businessId/health-report`
- `/settings`
- `/admin`
- `/admin/diagnosis`
- `/admin/limit`
- `/admin/users`
- `/admin/audit-log`
- `/admin/businesses/:businessId/inventory-input`
- `/admin/businesses/:businessId/health-report`

Redirect/fallback:

- `/businesses/:businessId/dashboard` -> `/businesses/:businessId/sub-scores` (halaman dashboard terpisah sudah dihapus)
- `/dashboard` -> `/businesses`
- `/inventory` -> `/businesses`
- `/analysis` -> `/businesses`
- `*` -> `/`

## Fitur yang Tampak Sedang Dikerjakan atau Lokal/Sementara

- Theme settings masih lokal dan copy menyebut siap disambungkan ke backend.
- Landing page masih punya copy "Form Inventarisasi ... siap disimpan lokal sebelum integrasi backend", padahal form inventory sekarang memanggil backend.
- Tombol `Rekomendasi` terlihat sebagai UI tetapi belum ditemukan aksi nyata.
- Service `listBusinessInventories` dan `adminInventorySubmissions` tersedia, tetapi belum ditemukan pemakaian di halaman.
## TODO yang Ditemukan

Tidak ditemukan marker `TODO`, `FIXME`, `HACK`, atau `XXX` di source frontend.

Catatan penting yang ditemukan:

- Tidak ada field `scoring_version` di type `BusinessHealthAnalysis` frontend.
- `AdminUsersPage.updateStatus` tidak memiliki try/catch lokal saat update user status.
- `AdminInventoryDetailPage` pada mode admin mencari submitter dari `adminUsers({ limit: 100, offset: 0 })`, sehingga user di luar 100 pertama bisa tidak ditemukan.
- Halaman Laporan Kesehatan Bisnis (state not-generated/processing/ready/failed, termasuk alur generate manual + dialog konfirmasi baru) dan mode edit `InventoryPage`/link "Edit Data" di `AdminInventoryDetailPage` belum diverifikasi manual end-to-end di browser karena membutuhkan backend `be-gimb` hidup (dan `ANTHROPIC_API_KEY` terisi untuk laporan AI) serta login user; baru diverifikasi lewat type-check dan build.

## Test atau Build yang Tersedia

Script tersedia di `package.json`:

```bash
npm run dev
npm run build
npm run preview
```

Script lint: Belum teridentifikasi.

Script test: Belum teridentifikasi.

File test/spec: Belum teridentifikasi.

## Verifikasi Saat Dokumen Ini Dibuat

Pemeriksaan yang dijalankan:

```bash
node ./node_modules/typescript/bin/tsc --noEmit
npm run build
```

Hasil: kedua perintah exit code `0`. Smoke test manual di browser (mode edit inventory, generate manual laporan AI beserta dialog konfirmasi, link "Edit Data") belum dijalankan karena membutuhkan backend `be-gimb` hidup (dan `ANTHROPIC_API_KEY` untuk laporan AI) serta login user.

## Risiko atau Bagian yang Perlu Dikonfirmasi

- Apakah `scoring_version` perlu menjadi kontrak frontend atau tetap internal backend.
- Apakah landing copy lama tentang integrasi backend masih diinginkan.
- Apakah admin inventory detail perlu endpoint submitter/detail user daripada mengambil 100 user pertama.
- Apakah perlu test runner/lint formal untuk CI.
- Migrasi auth token ke httpOnly cookie ditunda sampai domain production (satu induk vs terpisah dari backend) diputuskan; lihat catatan di `PROJECT_CONTEXT.md` bagian localStorage.
