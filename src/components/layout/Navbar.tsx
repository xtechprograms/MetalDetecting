import Link from "next/link";
import { Compass, Map, Search, Users, MessagesSquare, Rss } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { NavbarClient } from "./NavbarClient";

const navLinks = [
  { href: "/feed", label: "Feed", icon: Rss },
  { href: "/forum", label: "Forum", icon: MessagesSquare },
  { href: "/map", label: "World Map", icon: Map },
  { href: "/research", label: "Research", icon: Search },
  { href: "/community", label: "Community", icon: Users },
];

export async function Navbar() {
  let user = null;
  let profile = null;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      user = authUser;

      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("username, display_name, avatar_url, role")
          .eq("id", user.id)
          .maybeSingle();
        profile = data;
      }
    } catch {
      // Render public nav if Supabase is unavailable
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl relative">
      {!isSupabaseConfigured() && (
        <div className="bg-amber-900/40 border-b border-amber-700/40 text-amber-200 text-xs text-center py-2 px-4">
          Database not connected — add Supabase env vars in Netlify and redeploy.
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 min-w-0">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group min-w-0">
            <div className="relative shrink-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-gold-500 to-bronze-500 flex items-center justify-center shadow-lg shadow-gold-500/20 group-hover:shadow-gold-500/40 transition-shadow">
                <Compass className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950" />
              </div>
            </div>
            <div className="min-w-0">
              <span className="font-display text-base sm:text-xl font-bold gold-gradient-text truncate block">
                Treasure Atlas
              </span>
              <span className="hidden md:block text-[10px] uppercase tracking-[0.2em] text-slate-500">
                Global Detecting Platform
              </span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 min-w-0 shrink">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="btn-ghost text-xs xl:text-sm px-2 xl:px-4 whitespace-nowrap shrink-0"
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            ))}
          </nav>

          <NavbarClient user={user} profile={profile} />
        </div>
      </div>
    </header>
  );
}
