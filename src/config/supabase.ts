// Helper client Supabase Storage (service role) untuk upload media.
// Dipakai saat backend jalan di serverless (Vercel) yang filesystem-nya read-only.
// Env yang dibutuhkan (.env):
//   SUPABASE_URL              = https://<project-ref>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY = service_role key (JANGAN diekspos ke frontend)
//   SUPABASE_BUCKET           = nama bucket (default "media")
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  // Peringatan jelas saat boot bila env belum diisi (mis. di Vercel).
  console.warn(
    "[supabase] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum di-set. Upload media akan gagal."
  );
}

export const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "media";

// Client service-role: bypass RLS, hanya dipakai di server.
export const supabase = createClient(url || "", serviceKey || "", {
  auth: { persistSession: false, autoRefreshToken: false },
});

export default supabase;