# Duitku — Student Cash Balance & Finance Tracker

A static, zero-build personal finance tracker designed for college students. Track your **cash balance (saldo)**, claim a **daily allowance**, save toward a **wishlist**, and manage **debts** — all synced in real time between your phone and laptop via Supabase.

---

## Key Features

- **Balance-First Model**: The dashboard shows your total cash balance (`saldo = pemasukan − pengeluaran`), not a monthly budget. Log income once (e.g. 131k) and it becomes your balance; each expense reduces it.
- **Daily Allowance**: Set a daily amount (default Rp 20.000). One tap on **"Klaim Uang Saku Hari Ini"** adds it to your balance — perfect for students who get a fixed allowance each campus day.
- **Wishlist & Debt Goals**: Add a target (e.g. "Baju Jersey — 175k"). A progress bar shows how close your balance is. When your saldo reaches the target, tap **"Realisasikan"** (or **"Bayar Utang"**) to pay it — your balance drops accordingly and the goal is marked done.
- **Dual Mode (Local & Cloud)**: Automatically stores data in `localStorage` when unconfigured or offline; seamlessly upgrades to cloud storage when Supabase credentials are provided in `config.js`.
- **Reliable Local-First Sync**: Every edit is written locally first and queued to Supabase in the background — no manual refresh, no lost data, works offline and catches up on reconnect.
- **Bilingual Interface**: Seamless toggle between **Bahasa Indonesia** and **English**.
- **Quick Logging**: Fast "+ Catat" modal with automatic thousand separators, numeric keypad focus, and quick-repeat chips.
- **CSV & JSON Import/Export**: RFC 4180 compliant CSV parser with delimiter auto-detection, column mapping, duplicate detection, and full JSON backup/restore.
- **PWA + Offline**: Installable to the home screen (service worker + manifest + icons); the app shell is cached and loads offline.

---

## Setup Guide

### 1. Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a free account.
2. Click **New Project**, name it (e.g., `duitku`), choose a region close to you (e.g., `Singapore / ap-southeast-1`), set a strong database password, and click **Create new project**.

### 2. Execute Database Schema (`schema.sql` then `migration_v4.sql`)
1. In the Supabase dashboard sidebar, navigate to **SQL Editor**.
2. Click **New query**, then copy the entire content of `schema.sql`.
3. Paste into the editor and click **Run**. This creates the core tables (`categories`, `transactions`, `budgets`), timestamp triggers, indexes, Row Level Security (RLS) policies, and enables the Realtime publication.
4. Run `migration_v4.sql` the same way. This adds the balance-based tables:
   - `goals` — wishlist & debts (`kind`: `wish`/`debt`, `status`: `active`/`done`, `amount`, `paid`, `due`, `tx_id`).
   - `app_settings` — per-user daily allowance config (amount, enabled, last claim date).
   - `transactions.source` — marker column (`''`, `allowance`, or `goal`).

### 3. Configure Authentication
1. Go to **Authentication** > **Providers** > **Email**.
2. For convenient personal use, turn off **"Confirm email"** so you can sign in immediately after registration without email verification links.
3. Click **Save**.

### 4. Configure `config.js`
1. Go to **Project Settings** (gear icon in bottom-left) > **API**.
2. Copy the following values:
   - **Project URL**
   - **anon / public key** (under *Project API keys*)
3. Open `config.js` and paste your credentials:
   ```javascript
   window.APP_CONFIG = {
     SUPABASE_URL: "https://your-project-id.supabase.co",
     SUPABASE_ANON_KEY: "eyJhbGciOi..."
   };
   ```
4. **Security Note**:
   - The `anon` key is **safe to expose in frontend code** because database access is governed by PostgreSQL **Row Level Security (RLS)** — users can only view and mutate their own rows (`auth.uid() = user_id`).
   - **NEVER** expose the `service_role` key in frontend code, as it bypasses all RLS checks.

### 5. Push to GitHub
Open your terminal in the project directory:
```bash
git add .
git commit -m "feat: setup Duitku personal budget tracker"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO_NAME.git
git push -u origin main
```

### 6. Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New...** > **Project**.
3. Import your `DuitKu` repository.
4. In the project configuration:
   - **Framework Preset**: select **Other**.
   - **Build and Output Settings**: leave blank (no build command, output directory root).
5. Click **Deploy**. Your app will be live at `https://your-app.vercel.app` in seconds.

### 7. Add Vercel URL to Supabase Auth
1. In Supabase Dashboard, go to **Authentication** > **URL Configuration**.
2. Under **Site URL**, enter your production Vercel domain (e.g., `https://your-app.vercel.app`).
3. Under **Redirect URLs**, add `https://your-app.vercel.app/**`.
4. Click **Save**.

### 8. Install on Android (PWA / Add to Home screen)
1. Open **Google Chrome** on your Android smartphone.
2. Navigate to your Vercel URL.
3. Log in with the same credentials used on your desktop.
4. Tap the three dots menu in the top-right corner of Chrome > select **"Add to Home screen"** or **"Install app"**.
5. The **Duitku** app icon will appear on your home screen and launch in standalone full-screen mode.

---

## Troubleshooting

1. **Data does not sync between mobile and laptop**:
   - Ensure both devices are signed in to the **same email account**.
   - Check the header sync indicator: it should display **"Synced"** / **"Tersinkron"**. If it shows "Offline", check your internet connection.
   - Verify `schema.sql` was executed completely and Realtime is enabled for `categories`, `transactions`, and `budgets`.
   - Switching tabs triggers a `visibilitychange` background sync to pull latest remote changes.

2. **Login or Registration Fails**:
   - Inspect the browser console (F12 on desktop).
   - Ensure `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `config.js` have no trailing slashes or typo whitespaces.
   - Verify that your Vercel URL is listed in Supabase **Site URL** and **Redirect URLs**.

3. **Shortcut Icon does not appear on Xiaomi / Poco / Redmi (MIUI / HyperOS)**:
   - MIUI / HyperOS blocks home screen shortcut creation by default.
   - Go to phone **Settings** > **Apps** > **Manage Apps**.
   - Select **Chrome**.
   - Tap **Other permissions**.
   - Enable **"Home screen shortcuts"** (green checkmark / *Allow*).
   - Return to Chrome and tap **Add to Home screen** again.

---

## License

MIT License — Free to use, adapt, and build upon.
