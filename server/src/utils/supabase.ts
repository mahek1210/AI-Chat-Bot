import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables. Check SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY');
}

/**
 * Public anon client — used to verify user tokens
 * (calls supabase.auth.getUser which validates the JWT against Supabase)
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Service-role admin client — bypasses RLS for trusted backend operations.
 * NEVER expose this key to the frontend.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
