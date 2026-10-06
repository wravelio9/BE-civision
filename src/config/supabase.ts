// Helper client Supabase Storage (service role) untuk upload media.
// Dipakai karena backend jalan di serverless (Vercel) yang filesystem-nya read-only.
// Env (.env lokal DAN Environment Variables di Vercel):
//   SUPABASE_URL              = https://<project-ref>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY = service_role key (JANGAN diekspos ke frontend)
//   SUPABASE_BUCKET           = nama bucket (default "media")
//
// Client dibuat LAZY (saat pertama dipakai), bukan saat modul di-load. Kalau env
// kosong, hanya upload yang gagal dengan pesan jelas; endpoint lain tetap hidup.
import "dotenv/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "media";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum di-set di environment.");
  }
  client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export default getSupabase;