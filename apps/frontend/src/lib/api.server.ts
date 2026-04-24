import { createClient as createServerSupabase } from "@/lib/supabase/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

export async function apiFetchServer(endpoint: string, options: RequestInit = {}) {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  if (options.body && typeof options.body === "string" && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
  }

  return fetch(`${API_BASE_URL}/api/v1${endpoint}`, {
    ...options,
    headers,
  });
}
