# Duitku

Aplikasi web pencatat keuangan harian untuk mahasiswa. Dibuat ringan tanpa build step atau framework besar (hanya vanilla HTML, CSS, dan JavaScript). Bisa dipakai langsung di browser HP maupun laptop, mendukung mode offline (PWA), dan data tersinkron antar perangkat via Supabase.

Aplikasi aktif: [duitku-orpin.vercel.app](https://duitku-orpin.vercel.app)

---

## Masalah yang Diselesaikan

Kebanyakan aplikasi keuangan hanya menghitung satu angka total bulanan. Dalam kehidupan mahasiswa sehari-hari, polanya berbeda:
- Uang terbagi di dua tempat utama: uang fisik (Tunai) dan saldo digital (DANA).
- Sering ada transaksi pinjam-meminjam dengan teman. Uang yang dipinjamkan bukan pengeluaran biasa, melainkan piutang yang harus tercatat dan tidak mengurangi total kekayaan.
- Uang saku sering diterima harian atau mingguan.
- Ada target barang yang ingin dibeli (wishlist) atau utang yang perlu dicicil pelunasannya.

Duitku dirancang khusus untuk alur tersebut.

---

## Fitur Utama

- **Pemisahan Saldo Tunai & DANA**: Catat pengeluaran langsung dari dompet yang sesuai, transfer saldo antar dompet, dan rekonsiliasi manual jika ada selisih uang fisik.
- **Pencatatan Piutang**: Meminjamkan uang ke teman memotong saldo kas dan menambah saldo piutang. Ketika teman membayar kembali ke DANA atau tunai, saldo piutang berkurang tanpa tercatat sebagai pemasukan ganda pada laporan.
- **Klaim Uang Saku Harian**: Tombol klaim satu ketukan untuk mencatat jatah harian (default Rp 20.000) agar tidak perlu input manual tiap pagi.
- **Target Wishlist & Utang**: Atur target pembelian atau batas bayar utang lengkap dengan estimasi hari tercapai berdasarkan sisa uang saku harian.
- **Mode Lokal & Cloud**: Bisa langsung dipakai tanpa login (data tersimpan di localStorage perangkat). Jika ingin data tersinkron antara HP dan laptop, cukup login akun Supabase. Cache tiap akun dan mode lokal terisolasi secara terpisah.
- **PWA & Offline**: Mendukung pemasangan ke layar utama (Add to Home screen) di Android atau desktop, tetap bisa dibuka saat jaringan internet mati.
- **Ekspor & Impor**: Dukungan ekspor/impor file CSV dan backup lengkap JSON.

---

## Struktur Folder

```text
.
├── index.html              # Antarmuka, layout responsif, dan logika UI
├── wallet.js               # Modul logika perhitungan saldo dompet dan piutang
├── sw.js                   # Service worker untuk caching dan mode offline
├── config.js               # Konfigurasi koneksi Supabase (URL & Anon Key)
├── vercel.json             # Pengaturan security headers (CSP, frame-ancestors, dll)
├── package.json            # Konfigurasi npm scripts untuk pengujian
├── manifest.webmanifest    # Metadata PWA (ikon, nama aplikasi, shortcuts)
│
├── supabase/
│   ├── schema.sql          # Skema database lengkap siap pakai (idempotent)
│   └── migrations/         # Riwayat migrasi bertahap (01 s/d 06)
│
└── tests/
    ├── wallet.test.js      # Unit test perhitungan saldo, transfer, dan piutang
    └── storage-scope.test.js # Unit test isolasi data lokal vs akun cloud
```

---

## Menjalankan di Komputer Lokal

Karena tidak memerlukan proses build (*no build step*), aplikasi bisa langsung dijalankan dengan server statis apa saja:

```bash
# Menggunakan Python
python -m http.server 8000

# Atau menggunakan Node.js
npx serve .
```

Buka peramban di `http://localhost:8000`.

### Menjalankan Unit Test

Pengujian menggunakan Node.js test runner bawaan:

```bash
npm test
```

---

## Setup Supabase (Mode Sinkronisasi Cloud)

Jika ingin mengaktifkan sinkronisasi otomatis antar perangkat:

1. Buat proyek baru di [supabase.com](https://supabase.com).
2. Buka menu **SQL Editor**, salin isi file `supabase/schema.sql`, lalu jalankan. Skrip ini akan membuat tabel (`categories`, `transactions`, `budgets`, `goals`, `app_settings`, `ledger_events`), mengatur trigger, mengaktifkan Row Level Security (RLS), dan mendaftarkan publication Realtime.
3. Buka **Project Settings** > **API**, salin **Project URL** dan **anon public key**.
4. Buka file `config.js` dan masukkan kedua nilai tersebut:
   ```javascript
   window.APP_CONFIG = {
     SUPABASE_URL: "https://id-proyek-kamu.supabase.co",
     SUPABASE_ANON_KEY: "eyJhbGciOi..."
   };
   ```
5. Di dashboard Supabase, buka menu **Authentication** > **URL Configuration**, lalu tambahkan URL domain aplikasi kamu pada kolom **Site URL** dan **Redirect URLs**.

*Catatan keamanan: Anon key aman diletakkan di frontend karena seluruh data dilindungi oleh aturan PostgreSQL Row Level Security (RLS) di mana setiap pengguna hanya dapat membaca dan mengubah baris datanya sendiri.*

---

## Memasang di Android (PWA)

1. Buka Chrome di HP Android dan akses alamat aplikasi.
2. Ketuk ikon titik tiga di pojok kanan atas Chrome.
3. Pilih **Tambahkan ke Layar Utama** (*Add to Home screen*) atau **Instal aplikasi**.
4. Ikon Duitku akan muncul di menu HP dan berjalan dalam mode layar penuh seperti aplikasi native.

*(Untuk pengguna Xiaomi/Redmi/Poco dengan MIUI atau HyperOS: pastikan izin "Pintasan layar utama" untuk Google Chrome sudah diaktifkan di Pengaturan Aplikasi HP).*

---

## Lisensi

[MIT License](LICENSE) — Bebas digunakan dan dikembangkan untuk kebutuhan pribadi maupun tugas.
