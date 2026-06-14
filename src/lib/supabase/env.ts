export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
      key &&
      url.startsWith("https://") &&
      url.includes(".supabase.co") &&
      !url.includes("your-project")
  );
}

export function getSupabaseEnv(): { url: string; key: string } | null {
  if (!isSupabaseConfigured()) return null;
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  };
}
