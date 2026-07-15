# Project Instructions

Untuk semua tugas coding di repository ini, selalu gunakan skill `ponytail`
dengan intensitas `full`, kecuali pengguna secara eksplisit meminta intensitas
lain.

Utamakan solusi paling sederhana yang memenuhi kebutuhan. Hindari abstraksi,
dependency, fleksibilitas, dan boilerplate yang belum diperlukan. Tetap ikuti
pola codebase yang ada serta pertahankan keamanan, aksesibilitas, dan perilaku
yang sudah berjalan.

## Pemeliharaan Dokumentasi Project

Sebelum mengerjakan perubahan, baca:

- `docs/PROJECT_CONTEXT.md`
- `docs/PROJECT_MAP.md`
- `docs/PAGE_MAP.md`
- `docs/API_INTEGRATION_MAP.md`
- `docs/CURRENT_PROGRESS.md`

Gunakan source code dan konfigurasi aktual sebagai sumber kebenaran utama
apabila dokumentasi berbeda dengan implementasi.

Setelah melakukan perubahan pada project, periksa dan perbarui dokumentasi yang
terdampak agar tetap sesuai dengan kondisi source code terbaru.

Perbarui dokumentasi apabila perubahan memengaruhi:

- fitur atau perilaku aplikasi;
- halaman, route, redirect, navigasi, atau hak akses;
- endpoint API, request, response, atau integrasi backend;
- autentikasi, session, role, atau route guard;
- struktur folder, file penting, komponen, service, hook, utility, atau type;
- validasi, state management, localStorage, konfigurasi, atau environment;
- build, test, lint, deployment, atau keputusan teknis;
- risiko, kendala, TODO, atau pekerjaan lanjutan.

Gunakan ketentuan berikut:

- Perbarui `docs/PROJECT_CONTEXT.md` apabila terjadi perubahan pada gambaran
  umum aplikasi, arsitektur, teknologi, autentikasi, aturan bisnis,
  konfigurasi, atau pola implementasi utama.
- Perbarui `docs/PROJECT_MAP.md` apabila terjadi perubahan struktur folder,
  file penting, tanggung jawab modul, komponen, service, hook, utility, atau
  konfigurasi.
- Perbarui `docs/PAGE_MAP.md` apabila terjadi perubahan halaman, route,
  redirect, layout, navigasi, role, proteksi halaman, atau komponen utama
  halaman.
- Perbarui `docs/API_INTEGRATION_MAP.md` apabila terjadi perubahan endpoint,
  method, request, response, type kontrak API, service API, autentikasi API,
  atau penanganan error.
- Perbarui `docs/CURRENT_PROGRESS.md` setelah pekerjaan selesai atau ketika
  kondisi project berubah secara berarti.

## Aturan CURRENT_PROGRESS.md

`docs/CURRENT_PROGRESS.md` harus menggambarkan kondisi source code terbaru,
bukan menjadi changelog lengkap atau salinan percakapan.

Saat memperbaruinya:

1. Pertahankan struktur dokumen yang sudah ada.
2. Tambahkan fitur yang benar-benar sudah terimplementasi ke bagian
   `Fitur yang Sudah Terimplementasi`.
3. Tambahkan, ubah, atau hapus route pada bagian
   `Halaman yang Sudah Tersedia` sesuai routing aktual.
4. Pindahkan fitur yang sudah selesai dari bagian
   `Fitur yang Tampak Sedang Dikerjakan atau Lokal/Sementara`.
5. Hapus catatan sementara yang sudah tidak relevan.
6. Tambahkan TODO, risiko, atau masalah hanya jika benar-benar ditemukan dari
   source code atau hasil verifikasi.
7. Perbarui bagian `Test atau Build yang Tersedia` apabila script project
   berubah.
8. Perbarui bagian `Verifikasi Saat Dokumen Ini Dibuat` hanya berdasarkan
   perintah yang benar-benar dijalankan.
9. Perbarui bagian `Risiko atau Bagian yang Perlu Dikonfirmasi` dengan hanya
   menyisakan hal yang masih relevan.
10. Jangan menyatakan fitur, build, test, lint, atau verifikasi berhasil jika
    belum benar-benar diperiksa atau dijalankan.
11. Jangan menebak informasi yang tidak ditemukan pada source code.
12. Untuk informasi yang belum pasti, gunakan keterangan
    `Belum teridentifikasi` atau `Perlu dikonfirmasi`.
13. Jangan menambahkan perubahan kecil seperti typo atau formatting, kecuali
    perubahan tersebut memengaruhi perilaku atau pemahaman project.
14. Cantumkan tanggal pembaruan terakhir pada bagian awal dokumen.

Sebelum menyelesaikan tugas:

1. Bandingkan perubahan source code dengan dokumentasi.
2. Perbarui hanya file dokumentasi yang terdampak.
3. Pastikan dokumentasi tidak bertentangan dengan implementasi aktual.
4. Laporkan:
   - source code yang diubah;
   - dokumentasi yang diperbarui;
   - build, test, lint, atau verifikasi yang dijalankan;
   - hasil verifikasi;
   - informasi yang belum dapat dipastikan;
   - pekerjaan lanjutan yang masih tersisa.

## Ketentuan Tambahan

- Jangan menjalankan Git.
- Apabila tugas hanya berupa analisis, penjelasan, atau pemeriksaan tanpa
  perubahan source code, dokumentasi tidak wajib diperbarui kecuali ditemukan
  ketidaksesuaian antara dokumentasi dan implementasi aktual.