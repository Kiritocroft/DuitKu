// Konfigurasi Supabase untuk Duitku
// Temukan nilai ini di Dashboard Supabase > Project Settings > API:
// - Project URL -> SUPABASE_URL
// - Project API keys -> 'anon' 'public' -> SUPABASE_ANON_KEY
//
// CATATAN KEAMANAN:
// Anon key aman ditaruh di sini karena dilindungi Row Level Security (RLS).
// JANGAN PERNAH memakai service_role key di frontend!
// Kosongkan string jika ingin menjalankan aplikasi dalam Mode Lokal (localStorage).

window.APP_CONFIG = {
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: ""
};
