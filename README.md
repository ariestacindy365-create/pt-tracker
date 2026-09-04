# PT Tracker

Aplikasi terpisah khusus untuk personal trainer — bukan bagian dari
olympus-gym-tracker (yang untuk bootcamp/kelas grup + CRM leads). Beberapa
trainer bisa punya akun masing-masing; tiap trainer hanya melihat & mengelola
kliennya sendiri. Klien juga bisa login sendiri untuk lihat & input datanya.

## Dua sisi aplikasi

- **Trainer** (`/login`, `/register`) — kelola daftar klien, susun program
  latihan, set target nutrisi, lihat & edit semua data klien miliknya.
- **Member/klien** (`/member/login`) — login pakai email + PIN 4-6 digit yang
  diberikan trainer (diaktifkan dari tab Profil klien). Klien bisa lihat
  program yang disusun trainer, catat sesi latihannya sendiri, lihat target
  nutrisi + catat asupan aktual, catat progress body metric, dan ganti
  email/PIN login-nya sendiri di tab Akun. Klien **tidak** bisa mengubah
  rencana program atau target nutrisi — itu tetap dikontrol trainer.

## Fitur per klien

- **Profil** *(trainer saja)* — nama, no. HP, catatan, aktifkan/reset akses
  login klien (email + PIN); hapus klien (soft delete, histori tetap
  tersimpan).
- **Program & Latihan** — trainer menyusun program (hari + gerakan + target
  set/reps/beban) lebih dulu, baru dijalankan. Trainer maupun klien bisa
  mencatat beban aktual per sesi → estimasi 1RM otomatis (rumus Epley:
  `1RM = berat x (1 + reps/30)`), ditautkan ke gerakan program terkait.
  Dilengkapi kalender bulanan yang bisa dibuka/tutup (lihat program apa yang
  berlaku & sesi apa yang tercatat di tanggal mana pun, termasuk minggu-minggu
  sebelumnya), kalkulator 1RM (isi satu angkatan → tabel target beban untuk
  1/3/5/8/10/12/15 reps, sama seperti "Estimasi Beban" di olympus-gym-tracker),
  dan grafik tren estimasi 1RM per gerakan (naik/turun). Saat mengisi nama
  gerakan, trainer bisa cari dari kamus gerakan bersama (`Movement`, dibawa
  dari olympus-gym-tracker — 434 gerakan lengkap dengan otot primer/sekunder,
  kategori, alat, dan hint set/reps) atau ketik bebas & simpan gerakan baru
  ke kamus untuk dipakai lagi nanti.
- **Kamus gerakan** — data bersama lintas trainer (bukan per-klien), diimpor
  sekali lewat `npx tsx prisma/seed-movements.ts` (aman dijalankan berulang,
  upsert by name; sumber datanya di `prisma/movements-seed-data.json`).
  Trainer bisa nambah gerakan baru sendiri langsung dari combobox saat susun
  program.
- **Nutrisi** — target kalori/makro harian diset trainer (klien lihat saja);
  trainer maupun klien bisa mencatat asupan aktual + catatan bebas per
  tanggal.
- **Progress** — berat badan, body fat %, skeletal muscle mass (SMM), dan
  visceral fat per tanggal, dengan grafik tren berat badan. Bisa diisi
  trainer maupun klien sendiri.

## Stack

Next.js (App Router) + TypeScript + Tailwind v4 + Prisma 7 (driver adapter
`@prisma/adapter-pg`) + PostgreSQL + bcryptjs (hash password/PIN) + jose
(sesi JWT di cookie httpOnly, terpisah untuk trainer dan member) + zod
(validasi) + recharts (grafik) + date-fns (kalender). Sengaja disamakan
polanya dengan olympus-gym-tracker biar familiar.

## Menjalankan lokal

```bash
npm install
npx prisma generate
npx prisma db push               # sinkronkan schema ke database
npx tsx prisma/seed-movements.ts # isi kamus gerakan (opsional tapi disarankan)
npm run dev
```

Salin `.env.example` jadi `.env` dan isi:

- `DATABASE_URL` — connection string PostgreSQL (lihat bagian Deploy di
  bawah untuk cara dapatnya lewat Neon).
- `SESSION_SECRET` — kunci penandatanganan JWT sesi (dipakai untuk sesi
  trainer maupun member). Generate string acak panjang, jangan dipakai ulang
  dari proyek lain.
- `TRAINER_INVITE_CODE` — kode yang diminta saat trainer mendaftar akun baru
  di `/register`, supaya pendaftaran tidak terbuka untuk umum. Bagikan kode
  ini hanya ke trainer yang memang harus punya akses.

**Catatan penting soal path proyek**: folder ini di `D:\pt-tracker` adalah
satu-satunya sumber kode yang benar. Jangan buat "symlink" manual lewat
`ln -s` di lingkungan sandbox — di sini `ln -s` ternyata membuat **copy**
penuh, bukan symlink asli, sehingga gampang jalan dobel dan basi. Kalau butuh
menjalankan dari direktori lain, arahkan langsung pakai path absolut
(`npm --prefix D:/pt-tracker run dev`), jangan lewat symlink.

## Deploy ke Vercel (gratis)

Langkah-langkah berikut butuh akun kamu sendiri (GitHub, Neon, Vercel) —
tidak bisa dikerjakan otomatis dari sini, tapi kodenya sudah disiapkan
(Prisma sudah pakai driver Postgres, bukan SQLite lagi).

1. **Bikin database Postgres gratis** di [neon.tech](https://neon.tech) (atau
   Vercel Postgres langsung dari dashboard Vercel). Setelah dibuat, salin
   connection string-nya (formatnya
   `postgresql://user:password@host/dbname?sslmode=require`).
2. **Push project ke GitHub** — bikin repo baru (mis. `pt-tracker`) di
   GitHub, lalu dari folder `D:\pt-tracker`:
   ```bash
   git remote add origin https://github.com/<username>/pt-tracker.git
   git add -A
   git commit -m "Initial commit"
   git push -u origin main
   ```
3. **Import project di [vercel.com](https://vercel.com)** — pilih "Add New
   Project", connect ke repo GitHub yang barusan dibuat. Framework preset
   Next.js akan otomatis terdeteksi.
4. **Isi Environment Variables** di halaman setup Vercel (atau nanti di
   Project Settings → Environment Variables):
   - `DATABASE_URL` = connection string dari Neon (langkah 1)
   - `SESSION_SECRET` = generate baru, jangan sama dengan yang lokal
   - `TRAINER_INVITE_CODE` = kode undangan buat trainer daftar
5. **Deploy.** Setelah build pertama selesai, jalankan sekali dari lokal
   (dengan `DATABASE_URL` di `.env` diarahkan ke database Neon yang sama)
   untuk membuat semua tabelnya dan isi kamus gerakan:
   ```bash
   npx prisma db push
   npx tsx prisma/seed-movements.ts
   ```
6. Selesai — project bisa diakses di URL `*.vercel.app` yang diberikan
   Vercel. Tiap kali kamu push ke branch `main` di GitHub, Vercel otomatis
   build & deploy ulang.

Kalau nanti mau custom domain (mis. `pt.namastudio.com`), tinggal
ditambahkan di Project Settings → Domains di Vercel.
