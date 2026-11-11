// Supabase project settings
// Replace these two values with your own Supabase Project URL and anon/publishable key.
// NEVER put your Supabase service_role/secret key in frontend code.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://aueoloavoacnldysoxzh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_m4J7i6ioGFKguw433szVMg_gKl_KKNI';

export const isSupabaseConfigured =
  SUPABASE_URL.startsWith('https://') &&
  !SUPABASE_URL.includes('YOUR_SUPABASE') &&
  SUPABASE_ANON_KEY.length > 20 &&
  !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE');

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  : null;
