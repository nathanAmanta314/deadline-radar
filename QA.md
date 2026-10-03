# QA — 2 Oktober 2026

## Pembaruan UI — 3 Oktober 2026

Desain diperbarui mengikuti referensi: latar krem, navigasi atas, DM Sans yang dibundel lokal, judul besar dengan garis hijau, radar berdampingan dengan judul, ringkasan berlatar hijau, dan kartu bernomor dengan progress ring. Tema gelap, dialog, pengaturan, dan layout mobile mengikuti sistem visual yang sama.

Build TypeScript/Vite/PWA berhasil. Ketiga skenario E2E kembali lulus, meliputi CRUD, backup/import, offline, keyboard, tema, dan viewport 360/390/768/1024/1440 px. Screenshot desktop/mobile/dark diperiksa secara visual; preview development tidak menghasilkan page error dan tidak memiliki horizontal overflow. Data pada browser pengguna tidak dimuat atau diubah selama pemeriksaan.

Font DM Sans di-cache service worker. Lisensi OFL disertakan di `public/dm-sans-license.txt` dan disalin ke hasil build.

## Verifikasi implementasi awal

Verifikasi dilakukan pada Windows, Node.js 24.19, Chrome desktop melalui Playwright. Aplikasi diuji memakai penyimpanan browser terisolasi; tidak mengubah deadline pada profil pengguna.

| Pemeriksaan | Hasil |
|---|---|
| `npm install` | Berhasil, lockfile tersedia |
| Dependency audit setelah upgrade Vite | 0 vulnerability yang dilaporkan npm |
| `npm run dev` | Server Vite 8 berjalan; smoke test browser berhasil memuat React, membuat lima demo task, tanpa page error |
| TypeScript strict + `npm run build` | Lulus; static assets, manifest, dan service worker dihasilkan |
| `npm test` | 30 tes lulus |
| Kalender pada timezone dengan DST | 30 tes lulus dengan `TZ=America/New_York` |
| `npm run test:e2e` | 3 skenario browser; lihat cakupan di bawah |
| Responsive | 360, 390, 768, 1024, 1440 px; tidak ada horizontal overflow dokumen |
| Light dan dark | Screenshot diperiksa secara visual |
| Offline | Reload build produksi saat network offline dan create task berhasil |

## Cakupan browser

1. Create, edit, reschedule, duplicate, confirmed delete, complete, archive/restore, search, range, theme, category create, export, reset, merge import, reload persistence, service worker readiness, offline reload dan create. Normal flow memeriksa tidak ada uncaught page error.
2. Demo data, seluruh range, kelima ukuran layar, keyboard node Enter, Escape, shortcut N, dark mode, serta konsistensi filter priority pada radar dan daftar.
3. Invalid JSON, category rename/delete, import preview dan konfirmasi REPLACE, create melalui mobile form, dan persistence setelah reload.

## Cakupan unit/repository

- Hari 0/1/3/7/14/30/90/tahun berikutnya dan overdue satu tahun.
- Leap day, batas tengah malam, selisih hari kalender pada DST, tepat sekarang dan lewat 1 ms.
- Completed mengalahkan status temporal, urgency thresholds, format waktu, progress health serta optional start.
- Linear/log radius, clamp outer edge, overdue orbit, determinisme ketika urutan input berubah, 20 task hari ini dan 500 node.
- Validasi backup, ID ganda/referensi kategori hilang/nilai invalid; create/edit/archive/reopen database/delete; category delete mempertahankan task; pewarisan warna kategori; merge/replace/reset.

## Batas verifikasi

Tidak diuji di Safari, Firefox, iOS/Android fisik, native PWA installation, screen reader, atau lintas semua versi browser. Pengujian responsive memakai viewport Chrome, bukan pengujian perangkat fisik. Tidak dilakukan sertifikasi WCAG atau audit keamanan eksternal. Kepadatan ekstrem pada satu orbit masih bisa overlap; daftar tetap memberi akses semua item.

Tidak ada hosting publik yang dibuat. Data tetap browser-local. File README menjelaskan instalasi, struktur, backup, dan deployment statis opsional.
