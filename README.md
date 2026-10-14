# Duitku — Student Budget Tracker

A static, zero-build personal budget and expense tracker designed for college students. Data syncs in real time between your Android phone and laptop via Supabase.

---

## Key Features

- **Dual Mode (Local & Cloud)**: Automatically stores data in `localStorage` when unconfigured or offline; seamlessly upgrades to cloud storage when Supabase credentials are provided in `config.js`.
- **Real-Time Cross-Device Sync**: Transactions entered on your mobile phone appear immediately on your laptop without refreshing the page.
- **Bilingual Interface**: Seamless toggle between **Bahasa Indonesia** and **English** with localized labels, insights, dates, and currency formatting.
- **Quick Logging**: Fast "+ Log" modal with automatic thousand separators, numeric keypad focus, and quick-repeat chips for your 5 most frequent transactions.
- **Monthly Budgets**: Category-based budget limits with responsive color-coded progress bars (green <80%, amber 80–100%, red >100%) and explicit status labels ("On Track", "Almost Gone", "Over Budget").
- **Dashboard & Smart Insights**: At-a-glance income, expense, net balance, remaining daily allowance, 6-month SVG trend bar chart, and automated financial insights.
- **CSV & JSON Import/Export**: Strict RFC 4180 compliant CSV parser with delimiter auto-detection, column mapping, duplicate detection, and full JSON backup/restore.
- **PWA Ready**: Add to Home Screen on Android Chrome to run as a native-like standalone app with custom icons and theme colors.

---

## Setup Guide

### 1. Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a free account.
2. Click **New Project**, name it (e.g., `duitku`), choose a region close to you (e.g., `Singapore / ap-southeast-1`), set a strong database password, and click **Create new project**.

### 2. Execute Database Schema (`schema.sql`)
1. In the Supabase dashboard sidebar, navigate to **SQL Editor**.
2. Click **New query**, then copy the entire content of `schema.sql`.
3. Paste into the editor and click **Run** (or press Ctrl+Enter).
4. Verify you receive `Success. No rows returned`. This creates the tables (`categories`, `transactions`, `budgets`), timestamp triggers, indexes, Row Level Security (RLS) policies, and enables the Realtime publication.

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
