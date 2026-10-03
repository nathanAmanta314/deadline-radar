# Deadline Radar

**See what’s getting closer.** Aplikasi deadline local-first dengan radar SVG: pusat adalah hari ini, dan jarak dari pusat menunjukkan waktu tersisa. Tanpa akun, backend, analytics, font eksternal, atau API berbayar.

## Masalah dan solusi

Daftar tanggal memaksa pengguna menghitung sendiri pekerjaan yang mendekat. Radar memberikan konteks spasial, sementara daftar dan dialog detail menyediakan tanggal, prioritas, progress, dan aksi lengkap. Prioritas pilihan pengguna terpisah dari urgensi waktu.

## Menjalankan

Gunakan Node.js 22.12+ (pengujian dilakukan dengan Node 24) dan npm.

```sh
npm install
npm run dev
```

Buka alamat localhost yang ditampilkan Vite. Instalasi dependency pertama membutuhkan koneksi internet; aplikasi tidak membutuhkan internet atau server backend saat dipakai.

```sh
npm run build
npm run preview
```

Build statis berada di `dist/`. Untuk menguji offline/PWA gunakan **build produksi + preview**, bukan development server. Tunggu pemuatan pertama selesai, reload sekali, lalu putuskan koneksi. Browser yang mendukungnya menawarkan Install app/Add to Home Screen. Asset disimpan service worker; task tetap di IndexedDB. Dukungan dan UI instalasi bergantung browser.

Gunakan origin yang sama: `localhost`, `127.0.0.1`, port lain, dan domain lain memiliki penyimpanan yang berbeda. Jangan membuka `dist/index.html` melalui `file://`; jalankan server file statis atau install PWA terlebih dahulu. Localhost diperbolehkan untuk service worker; deployment memerlukan HTTPS.

## Fitur

- CRUD deadline, deskripsi, tanggal/jam, optional start, progress 0–100, kategori, warna, dan prioritas.
- Complete/reopen, duplikasi, arsip/pulihkan, konfirmasi hapus, dan reschedule cepat/custom.
- Radar 7/14/30/90 hari dan All; orbit overdue khusus, progress ring, node deterministik, keyboard/tap/hover.
- Summary clickable; pencarian judul/deskripsi/kategori; filter status/kategori/prioritas; enam mode sort. Radar dan daftar memakai hasil filter yang sama.
- Progress health sederhana dengan toleransi 10 poin persentase; tanpa start date tidak ada prediksi.
- Kategori CRUD; menghapus kategori tidak menghapus task. Perubahan warna kategori memperbarui warna task yang masih mengikuti warna kategori; override warna task tetap dipertahankan.
- Backup JSON versioned, validasi, preview import, merge berdasarkan ID, replace dengan konfirmasi `REPLACE`, reset dengan `RESET`.
- Light/dark/system, reduced motion, responsive layout, native dialog focus trap, Escape, shortcut `N` dan `/`.
- Demo hanya dimuat melalui tombol **Load demo data**. Workspace baru kosong secara default.

## Arsitektur dan file penting

React 19 + TypeScript strict + Vite; CSS variables; SVG custom; Dexie/IndexedDB; Zod; lucide-react; vite-plugin-pwa/Workbox; Vitest dan Playwright. Font DM Sans (OFL) dibundel lokal melalui Fontsource dan di-cache PWA. Tidak ada library chart atau global state manager tambahan.

```text
src/
  App.tsx                     koordinasi state, navigasi, dan dashboard
  components/                 shell, summary, dialog, empty state
  db/repository.ts            schema IndexedDB, CRUD, transaksi import/reset
  features/
    deadlines/                form, detail/actions, daftar
    radar/                    panel, SVG, pure geometry
    settings/                 preferences, categories, backup management
  hooks/useData.ts            liveQuery, preferences, clock
  lib/demo.ts                 contoh relatif terhadap hari ini
  types/index.ts             types dan validasi runtime
  utils/dates.ts             seluruh perhitungan tanggal dan health
  styles/theme.css           tema krem/hijau, responsive, accessibility
e2e/                         skenario browser
public/                      favicon dan icon PWA lokal
```

Navigasi memakai hash (`/#/`, `/#/archive`, `/#/settings`) agar dapat di-host sebagai file statis tanpa konfigurasi route fallback. Komponen tidak memanggil IndexedDB mentah; repository menyediakan operasi tersentralisasi, dan Dexie liveQuery menyegarkan UI termasuk perubahan antar-tab.

## Cara radar bekerja

`calculateDeadlinePosition` adalah fungsi pure yang menerima deadline, range, index, radius, dan clock yang dapat diinjeksi saat tes.

Untuk range angka:

```text
normalized = clamp(calendarDaysRemaining / range, 0, 1)
radius = 88 + normalized × (270 - 88)
```

Today berada pada radius 88 agar label pusat aman; overdue berada di orbit khusus radius 54. Deadline melewati batas range dikumpulkan di outer edge. All menggunakan `log(1 + days) / log(1 + 1825)`, lalu clamp; di atas lima tahun juga berada di tepi.

Hash ID menentukan sudut awal. Urutan ID tetap dan pencarian sudut golden-angle menjaga hasil deterministik, termasuk ketika daftar di-sort. Collision avoidance memprioritaskan perpindahan sudut, kemudian toleransi radius maksimal ±10 SVG unit. Kepadatan ekstrem tetap bisa menghasilkan overlap; filter dan daftar tetap menyediakan akses ke setiap record. Penghitungan 500 node diuji.

Radius memakai selisih **hari kalender lokal**, bukan pembagian durasi 24 jam, sehingga hari DST tidak menggeser ring. Overdue memakai timestamp yang tepat: deadline yang lewat beberapa menit pada hari ini tetap overdue, bukan due today. Tepat pada timestamp deadline masih due today; pembaruan berikutnya akan menjadikannya overdue.

Tanggal input tanpa jam memakai 23:59 lokal. Waktu disimpan sebagai ISO timestamp dengan zona waktu; tampilan mengikuti timezone browser. Jika timezone perangkat berubah, waktu lokal dan hari kalender dapat berubah, sementara momen deadline yang disimpan tetap sama. Label hari ini menampilkan jam/menit tersisa; besok memakai “Tomorrow”. Clock diperbarui setiap 30 detik dan saat halaman mendapat fokus/kembali terlihat.

Health membandingkan progress aktual dengan bagian durasi start→deadline yang terpakai, dibatasi 0–100. Selisih lebih dari +10 adalah Ahead, kurang dari −10 Behind, sisanya On track. Ini indikator linear sederhana, bukan estimasi kapasitas kerja.

## Penyimpanan dan backup

IndexedDB `deadline-radar`, schema database versi 1, menyimpan deadlines, categories, dan initialization marker. Mutasi transaksi menunggu penyimpanan berhasil sebelum dialog ditutup. localStorage hanya menyimpan preferences/onboarding. Kegagalan penyimpanan ditampilkan kepada pengguna; tidak ada fallback task ke memori yang diam-diam tampak tersimpan.

Di Settings, **Export backup** mengunduh:

```json
{"app":"deadline-radar","schemaVersion":1,"exportedAt":"…","deadlines":[],"categories":[],"settings":{}}
```

Contoh di atas hanya menunjukkan bentuk; ekspor aktual berisi preferences lengkap. Import memvalidasi seluruh file sebelum mutasi. Maksimum file 10 MB, 10.000 deadlines, 1.000 kategori; ID ganda, tanggal invalid, progress di luar batas, completion tidak konsisten, atau referensi kategori hilang ditolak.

Merge memperbarui ID yang sama, mempertahankan record lain, dan tidak mengganti preferences lokal. Replace mengganti seluruh task/kategori secara atomik dan mengembalikan preferences backup. Backup versi selain 1 ditolak sampai migrasi format diimplementasikan. Ekspor tidak menyertakan cache PWA.

Data tidak dikirim ke server. Menghapus site data/browser profile bisa menghapus semua deadline; simpan backup secara berkala. Tidak ada sinkronisasi perangkat atau pemulihan cloud.

## Pengujian

```sh
npm test
npm run build
npm run test:e2e
```

Playwright memakai Chrome lokal pada path Windows standar jika tersedia, atau Chromium Playwright pada sistem lain. Untuk menyiapkan Chromium: `npx playwright install chromium`. Override executable dengan environment variable `RADAR_BROWSER` bila perlu. E2E menyalakan preview produksi pada port 4173; build terlebih dahulu. Browser tes memakai context terisolasi, bukan data browser pengguna.

Tes mencakup kalender/leap-year/DST boundary, timestamp tepat sekarang, status completed/overdue, urgency, human remaining time, progress health, radius linear/log, node deterministik dan 500 node, schema backup, CRUD persistence, category deletion, transaksi merge/replace/reset. E2E menguji CRUD lengkap, archive/restore, reschedule, reload, export/import/reset, invalid JSON, konfirmasi replace, kategori, theme, keyboard, filter/range, offline reload dan create, serta lebar 360/390/768/1024/1440 px.

Lihat `QA.md` untuk hasil verifikasi dan batas yang belum diverifikasi. Script Vite menggunakan config loader runner agar tidak memerlukan bundling konfigurasi di lingkungan Windows terbatas.

## Hosting gratis dengan GitHub Pages

Workflow `.github/workflows/pages.yml` membangun `dist/` dan mengirimnya ke GitHub Pages setiap kali ada push ke branch `main`. Path aset relatif dan hash routing mendukung URL project page seperti `https://USERNAME.github.io/deadline-radar/`.

1. Buat repository GitHub baru bernama `deadline-radar` dan salin/push **isi folder proyek ini** ke branch `main`. Jangan push folder `node_modules/`.
2. Buka **Settings → Pages** repo, lalu pilih **GitHub Actions** sebagai build and deployment source.
3. Buka **Actions** dan tunggu workflow “Deploy Deadline Radar to GitHub Pages” selesai. Tautan Pages akan tampil di Settings → Pages dan ringkasan workflow.
4. Bagikan tautan Pages kepada teman. Agar mereka dapat membuka/meng-install PWA, kunjungi alamat tersebut sekali saat online. Perubahan kode selanjutnya dapat diterbitkan dengan `git push` ke `main`.

GitHub Pages dapat digunakan gratis dari repository publik di GitHub Free; situs yang terbit dapat dilihat siapa pun. Jangan memasukkan rahasia atau data pribadi ke repository. Deadline yang dibuat saat memakai situs tetap disimpan **secara lokal di browser masing-masing**. Link yang sama membuka aplikasi, tetapi tidak membagikan atau menyelaraskan task antar teman/perangkat. Masing-masing dapat memakai Settings → Export backup/Import backup untuk berbagi file backup dengan sadar. [Dokumentasi GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site) · [Workflow deploy kustom](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

Jika memilih provider statis selain GitHub, deploy isi `dist/`. Tidak ada environment variable atau database server. Repo source dapat disimpan privat; pada GitHub Free, situs Pages sendiri memerlukan repo publik.

## Keterbatasan dan pengembangan berikutnya

- Tidak ada cloud sync, akun, attachment, kolaborasi, recurring task, atau reminder server sesuai scope V1.
- Banyak deadline pada orbit sama dapat saling berdekatan; v2 dapat menambahkan cluster yang dapat dibuka tanpa mengaburkan jarak waktu.
- UI berbahasa Inggris. Localization Indonesia dapat ditambahkan tanpa mengubah data model.
- Instalasi native PWA, Safari/iOS, dan perangkat fisik belum diuji. Browser tes adalah Chrome desktop dengan simulasi ukuran layar.
- Status waktu dapat terlambat maksimum sekitar 30 detik saat aktif; browser bisa menunda timer tab di background sampai kembali terlihat.
- Service worker baru menunggu tab versi lama ditutup sebelum aktif, untuk menghindari refresh yang mengganggu form.
- Pengembangan selanjutnya: cluster radar, undo untuk mutasi ringan, ekspor CSV, dan local-only reminder opsional.

Tidak ada biaya operasional aplikasi. Browser modern dan penyimpanan perangkat pengguna menyediakan runtime dan database.
