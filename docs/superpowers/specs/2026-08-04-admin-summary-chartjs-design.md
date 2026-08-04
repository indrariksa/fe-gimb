# Desain: Migrasi Chart Ringkasan Admin ke Chart.js

Status: disetujui user, belum diimplementasikan.
Tanggal: 2026-08-04.
Repo terdampak: `fe-gimb` (utama) dan `be-gimb` (perubahan kecil).

## Latar Belakang & Tujuan

`AdminSummaryPage.tsx` merender 4 chart lewat `AIReportChart.tsx`, komponen
hand-rolled berbasis SVG/CSS (bukan library chart beneran): bar row custom,
donut lewat conic-gradient CSS, radar lewat SVG polygon manual, dll.
Komponen ini juga dipakai `AIReportPage.tsx` (laporan AI per bisnis).

Tujuan: ganti rendering 4 chart di `AdminSummaryPage` dengan Chart.js
(via `react-chartjs-2`) supaya lebih variatif bentuknya, interaktif
(tooltip, legend toggle), dan mengurangi kode custom SVG/CSS yang harus
dirawat manual.

**Scope: hanya `AdminSummaryPage`.** `AIReportChart.tsx` dan
`AIReportPage.tsx` tidak diubah sama sekali — tetap pakai implementasi
SVG/CSS yang ada sekarang.

## Dependency baru

- `chart.js` — library chart inti, belum ada di `package.json`.
- `react-chartjs-2` — wrapper React resmi untuk Chart.js, dipilih dibanding
  vanilla `useRef`/`useEffect` manual karena lifecycle canvas (create/
  destroy/update instance saat data berubah) sudah ditangani wrapper;
  selisih kode nyata dan itu memang fungsi utamanya.

## Komponen baru

`fe-gimb/src/components/organisms/AdminAnalyticsChart.tsx` — komponen baru,
terpisah dari `AIReportChart.tsx`. Menerima `AIReportChartData` yang sama
(tipe data tidak berubah) dan me-render salah satu dari 4 chart Chart.js
berdasarkan `chart.type`:

- `"bar"` → `<Bar />`
- `"line"` → `<Line />` dengan `fill: true` (area tipis di bawah garis)
- `"doughnut"` → `<Doughnut />` + plugin custom `afterDraw` untuk teks di
  tengah (persentase kategori terbesar + labelnya, meniru tampilan
  `.cost-donut` yang ada sekarang)
- `"pie"` → `<Pie />`

`AdminSummaryPage.tsx` diedit untuk import `AdminAnalyticsChart` alih-alih
`AIReportChart`, baris 116-118.

## Pemetaan tipe chart per data

| Chart (id) | Tipe sekarang | Tipe baru | Alasan |
| --- | --- | --- | --- |
| `businesses_by_industry` (Toko per Industri) | `bar` | `bar` | Perbandingan kategori, tetap paling pas |
| `status_distribution` (Distribusi Status Kesehatan) | `pie` | `doughnut` | Sama seperti tampilan sekarang (angka+label di tengah), versi Chart.js |
| `submissions_trend` (Tren Submission per Bulan) | `bar` | `line` | 12 bulan data time-series, line lebih jelas untuk tren naik/turun |
| `user_status` (User Aktif vs Suspended, hardcoded di frontend) | `pie` | `pie` | Data biner sederhana, beda bentuk dari doughnut biar variatif |

### Perubahan backend

`be-gimb/internal/service/admin_service.go`: ganti string `Type` di 2 chart
builder yang dipakai `AdminService.Analytics()`:

- `statusChart()` (baris ~259): `Type: "pie"` → `Type: "doughnut"`
- `trendChart()` (baris ~281): `Type: "bar"` → `Type: "line"`

`industryChart()` tidak berubah (`"bar"` tetap `"bar"`). Shape data
(`Labels`/`Series`) tidak berubah sama sekali, cuma string tipe. Fungsi
`statusChart`/`trendChart`/`industryChart` hanya dipakai oleh
`AdminService.Analytics()` (endpoint `adminAnalytics`) — tidak dipakai
generator laporan AI, jadi `AIReportPage` tidak terdampak.

### Perubahan tipe TypeScript

`fe-gimb/src/services/api/types.ts` baris 265, tambah literal `"doughnut"`
ke union:

```ts
type: "bar" | "line" | "radar" | "pie" | "gauge" | "doughnut";
```

`userStatusChart` hardcoded di `AdminSummaryPage.tsx` (baris 78-84) diubah
`type: "pie"` (tidak berubah, memang sudah `"pie"`).

## Theming (light/dark)

Canvas Chart.js tidak otomatis ikut CSS custom property. Tambah util kecil
`fe-gimb/src/components/organisms/chartTheme.ts`:

```ts
export function getChartTheme() {
  const style = getComputedStyle(document.documentElement);
  return {
    ink: style.getPropertyValue("--ink").trim(),
    muted: style.getPropertyValue("--muted").trim(),
    surface: style.getPropertyValue("--surface").trim(),
    gridColor: style.getPropertyValue("--border").trim(),
  };
}
```

Palet warna kategori (`palette` array yang sudah ada di `AIReportChart.tsx`,
baris 8) dipindah ke util ini dan dipakai bareng, tidak didefinisikan dua
kali.

`AdminAnalyticsChart` baca `theme.mode` lewat `useThemeSettings()` dan
bungkus `options` Chart.js dengan `useMemo(() => ..., [theme.mode])` supaya
chart re-render dengan warna yang benar saat mode berubah.

## Legend & tooltip

Pakai legend dan tooltip bawaan Chart.js, bukan markup custom
(`.chart-legend` yang ada sekarang di `AIReportChart.tsx` tidak direplikasi
di komponen baru). Kustomisasi minimal:

- `plugins.legend.labels.generateLabels` — override supaya tiap item
  legend tetap nampilin `label: value (persen%)`, mirip tampilan lama.
- `plugins.tooltip.callbacks.label` — format angka pakai `Intl.NumberFormat("id-ID")`
  yang sudah ada polanya di `AIReportChart.tsx` (`formatValue`/`formatPercent`,
  dipindah ke util bareng atau diduplikasi kecil, sesuai kebutuhan saat
  implementasi).

## Verifikasi

Tidak ada logic bercabang/parsing kompleks yang butuh unit test terpisah —
ini murni rendering. Verifikasi manual:

1. Jalankan dev server, buka `/admin` (Ringkasan Admin).
2. Cek 4 chart render dengan tipe yang benar (bar, doughnut+teks tengah,
   line, pie), tooltip muncul saat hover, klik item legend toggle dataset.
3. Toggle light/dark mode dari pengaturan tema, pastikan warna chart ikut
   berubah tanpa perlu reload halaman.
4. Buka halaman Laporan AI (`AIReportPage`) salah satu bisnis, pastikan
   chart di sana masih tampil seperti sebelumnya (tidak ada regresi —
   halaman ini tetap pakai `AIReportChart.tsx` lama).
