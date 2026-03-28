# AisleFlow

Platform multi-event untuk reservasi kursi resepsi pernikahan berbasis QR.

## Jalankan

```bash
npm install
npm run dev
```

Lalu buka `http://localhost:3000`.

## Storage

- Tanpa environment database, app memakai file lokal `data/store.json`
- Di Cloudflare Workers, app akan otomatis memakai binding D1 `AISLEFLOW_DB` bila tersedia
- Jika `DATABASE_URL` atau `NETLIFY_DATABASE_URL` tersedia, app otomatis pindah ke Postgres
- Mode Postgres memakai row-lock pada tabel `app_state` untuk menjaga booking tetap atomik
- Mode D1 memakai optimistic concurrency pada baris `app_state` agar update booking tetap aman saat ada request bersamaan

## Akun Awal

- Email: `superadmin@example.com`
- Password: `superadmin123`

## Deploy Cloudflare Workers

Project ini sudah disiapkan untuk deploy ke Cloudflare Workers memakai `@opennextjs/cloudflare`.

1. Install dependency:

```bash
npm install
```

2. Login ke Cloudflare:

```bash
npx wrangler login
```

3. Pilih salah satu storage production:

Opsi A, rekomendasi untuk Cloudflare native: buat D1 lalu bind sebagai `AISLEFLOW_DB`

```bash
npx wrangler d1 create aisleflow
```

Lalu masukkan `database_id` hasilnya ke `wrangler.jsonc` pada binding `AISLEFLOW_DB`.

Opsi B, pakai Postgres eksternal:

```bash
npx wrangler secret put DATABASE_URL
```

4. Preview lokal di runtime Workers:

```bash
npm run preview
```

5. Deploy:

```bash
npm run deploy:cloudflare
```

Catatan:

- Karena app ini full-stack SSR, gunakan Cloudflare Workers, bukan static Pages deploy
- Untuk local preview Cloudflare, copy `.dev.vars.example` menjadi `.dev.vars`
- Tanpa database persistent, deployment serverless tidak aman untuk flow reservasi kursi dan anti double-booking
- Jika `AISLEFLOW_DB` ada, app akan memprioritaskan D1 dibanding `DATABASE_URL`

## Cakupan v1

- Multi-event admin console dengan role `superadmin` dan `event_admin`
- Pengaturan tema, sesi, kapasitas, dan target tamu
- Input tamu manual dan impor CSV/Excel
- QR unik per tamu dengan preview admin
- Seat map tamu dengan temporary lock 2 menit
- Booking final immutable di sisi tamu
- E-ticket final saat QR dipindai ulang
