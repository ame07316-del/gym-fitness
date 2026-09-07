import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client. Never import this module from a client
 * component: SUPABASE_SERVICE_ROLE_KEY bypasses RLS and must stay private.
 */
const url = process.env.SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

export const isSupabaseConfigured = Boolean(url && serviceRoleKey);

export const supabaseAdmin = isSupabaseConfigured
  ? createClient(url as string, serviceRoleKey as string, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;
