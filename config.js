// Fill these in to switch on accounts, cloud sync and the reviewer panel.
// Both values are in Supabase → Project Settings → API. The anon key is safe to publish;
// access is protected by the row-level security rules in supabase/schema.sql.
// Leave them empty and the app runs in guest mode (progress saved on the device only).
window.LUGHA_CONFIG = {
  supabaseUrl: "",
  supabaseAnonKey: ""
};
