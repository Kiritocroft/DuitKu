# Duitku — Pelacak Budget Mahasiswa

Aplikasi web statis pelacak keuangan dan budget pribadi untuk mahasiswa, tanpa proses build (*no build step*). Data tersinkron realtime antara HP Android dan laptop via Supabase.

---

## Fitur Utama

- **Mode Lokal & Cloud**: Otomatis pakai *localStorage* kalau belum konfigurasi Supabase; beralih ke cloud begitu `config.js` diisi.
- **Realtime Sync**: Data yang diinput di HP langsung muncul di laptop tanpa reload halaman.
- **Transaksi Cepat**: Tombol *+ Catat* selalu terjangkau, input nominal otomatis titik ribuan, quick-repeat chip untuk 5 transaksi terakhir.
- **Budget Bulanan**: Atur batas pengeluaran per kategori. Indikator progress bar tiga warna (hijau <80%, kuning 80-100%, merah >100%) lengkap dengan label teks.
- **Dashboard & Insight**: Ringkasan pemasukan, pengeluaran, sisa budget harian, grafik batang 6 bulan terakhir (SVG murni), dan insight otomatis berbahasa Indonesia.
- **Impor & Ekspor CSV**: Parse standar RFC 4180 (support koma dalam tanda petik, BOM), tebak pemetaan kolom otomatis, toleran terhadap format nominal ribuan.
- **PWA Ready**: Bisa di-install ke layar utama Android (Add to Home Screen).

---

## Langkah Setup (Lengkap)

### 1. Buat Project di Supabase
1. Buka [supabase.com](https://supabase.com) dan buat akun (gratis).
2. Klik **New Project**, beri nama misalnya `duitku`, pilih region terdekat (misal Singapore), tentukan database password, lalu klik **Create new project**.

### 2. Jalankan `schema.sql`
1. Di sidebar dashboard Supabase, buka menu **SQL Editor**.
2. Klik **New query**, lalu salin seluruh isi file `schema.sql`.
3. Tempel (*paste*) ke editor dan klik tombol **Run** (Ctrl+Enter).
4. Pastikan keluar pesan `Success. No rows returned`. Ini membuat 3 tabel (`categories`, `transactions`, `budgets`), fungsi trigger, index, Row Level Security (RLS), dan mengaktifkan publication Realtime.

### 3. Atur Authentication (Email)
1. Buka menu **Authentication** > **Providers** > klik **Email**.
2. Untuk pemakaian pribadi yang praktis, matikan toggle **"Confirm email"** agar bisa langsung login setelah mendaftar tanpa harus klik link verifikasi email.
3. Klik **Save**.

### 4. Isi `config.js`
1. Buka menu **Project Settings** (ikon gear di kiri bawah) > **API**.
2. Salin nilai:
   - **Project URL**
   - **anon / public key** (di bagian *Project API keys*)
3. Buka file `config.js` di text editor dan tempel nilainya:
   ```javascript
   window.APP_CONFIG = {
     SUPABASE_URL: "https://xxxxxxxxxxxx.supabase.co",
     SUPABASE_ANON_KEY: "eyJh......"
   };
   ```
4. **Catatan Keamanan**:
   - `anon` key **aman** diletakkan di frontend karena seluruh data dilindungi **Row Level Security (RLS)** di level database — user A tidak akan pernah bisa membaca/mengubah data milik user B.
   - **JANGAN PERNAH** memakai `service_role` key di frontend karena key tersebut mengabaikan RLS.

### 5. Push ke GitHub
Buka terminal di folder project ini:
```bash
git init
git add .
git commit -m "Initial commit Duitku"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO_NAME.git
git push -u origin main
```

### 6. Deploy di Vercel
1. Buka [vercel.com](https://vercel.com) dan login dengan akun GitHub.
2. Klik **Add New...** > **Project**.
3. Pilih repository `duitku` yang baru saja di-push, klik **Import**.
4. Pada halaman konfigurasi:
   - **Framework Preset**: pilih **Other**.
   - **Build and Output Settings**: biarkan kosong (Build Command kosong, Output Directory root/kosong).
5. Klik **Deploy**. Dalam beberapa detik situs akan aktif dengan domain `https://duitku-xxxx.vercel.app`.

### 7. Tambahkan URL Vercel ke Supabase
1. Kembali ke dashboard Supabase > **Authentication** > **URL Configuration**.
2. Di bagian **Site URL**, masukkan domain Vercel kamu (misal `https://duitku-xxxx.vercel.app`).
3. Di bagian **Redirect URLs**, tambahkan `https://duitku-xxxx.vercel.app/**`.
4. Klik **Save**.

### 8. Pasang di HP Android (PWA / Add to Home screen)
1. Buka browser **Google Chrome** di HP Android kamu.
2. Akses URL Vercel aplikasi kamu.
3. Login memakai email & password yang sama seperti di laptop.
4. Ketuk ikon titik tiga di pojok kanan atas Chrome > pilih **"Add to Home screen"** / **"Install app"** / **"Tambahkan ke Layar Utama"**.
5. Ikon **Duitku** akan muncul di home screen layaknya aplikasi bawaan Android, berjalan dalam mode *standalone* tanpa address bar browser.

---

## Panduan Troubleshooting

1. **Data tidak tersinkron antara HP dan Laptop**:
   - Pastikan kedua perangkat login memakai **email yang sama**.
   - Cek indikator di kanan atas header: harus tertulis **"Tersinkron"**. Jika "Offline", periksa koneksi internet.
   - Pastikan step 2 (`schema.sql`) sudah dijalankan sampai selesai dan Realtime aktif untuk semua tabel (`categories`, `transactions`, `budgets`).
   - Coba ganti tab atau minimize lalu buka kembali aplikasi (ada trigger otomatis `visibilitychange` untuk menyegarkan data).

2. **Login atau Daftar Gagal**:
   - Buka console browser (F12 di laptop).
   - Jika muncul pesan error Supabase, pesan sudah diterjemahkan ke Bahasa Indonesia di layar (misal: "Email atau kata sandi salah" atau "Kata sandi minimal 6 karakter").
   - Pastikan URL dan Anon Key di `config.js` tidak ada spasi tambahan atau salah ketik.
   - Pastikan Site URL di Supabase sudah sesuai dengan domain Vercel.

3. **Shortcut/Icon tidak muncul di Home Screen (HP Xiaomi / Poco / Redmi / MIUI / HyperOS)**:
   - Masalah umum di MIUI/HyperOS: izin pembuatan shortcut dimatikan secara default oleh sistem.
   - Buka **Settings (Setelan)** HP > **Apps (Aplikasi)** > **Manage Apps (Kelola Aplikasi)**.
   - Cari aplikasi **Chrome**.
   - Masuk ke **Other permissions (Perizinan lainnya)**.
   - Aktifkan toggle **"Home screen shortcuts" (Pintasan layar utama)** ke status centang hijau / *Allow*.
   - Buka kembali Chrome dan ulangi proses *Add to Home screen*.

---

## Lisensi
MIT License — Bebas digunakan dan dimodifikasi untuk kebutuhan pribadi maupun tugas.
