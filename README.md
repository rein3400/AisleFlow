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
- Jika `DATABASE_URL` atau `NETLIFY_DATABASE_URL` tersedia, app otomatis pindah ke Postgres
- Mode database memakai transaksi row-lock pada tabel `app_state` untuk menjaga lock kursi dan booking final tetap atomik

## Akun Awal

- Email: `superadmin@example.com`
- Password: `superadmin123`

## Deploy Netlify

1. Buat site Netlify atau link ke site yang sudah ada
2. Sediakan database Postgres/Neon dan isi `DATABASE_URL` atau `NETLIFY_DATABASE_URL`
3. Set build command `npm run build`
4. Set publish output `.next`
5. Deploy repo ini sebagai Next.js app

Tanpa database persistent, deployment serverless tidak aman untuk flow reservasi kursi dan anti double-booking.

## Cakupan v1

- Multi-event admin console dengan role `superadmin` dan `event_admin`
- Pengaturan tema, sesi, kapasitas, dan target tamu
- Input tamu manual dan impor CSV/Excel
- QR unik per tamu dengan preview admin
- Seat map tamu dengan temporary lock 2 menit
- Booking final immutable di sisi tamu
- E-ticket final saat QR dipindai ulang
