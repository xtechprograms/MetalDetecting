import Link from "next/link";
import { Compass, Map, Search, Users, MessagesSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { NavbarClient } from "./NavbarClient";

const navLinks = [
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
          .select("username, display_name, avatar_url")
          .eq("id", user.id)
          .maybeSingle();
        profile = data;
      }
    } catch {
      // Render public nav if Supabase is unavailable
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl">
      {!isSupabaseConfigured() && (
        <div className="bg-amber-900/40 border-b border-amber-700/40 text-amber-200 text-xs text-center py-2 px-4">
          Database not connected — add Supabase env vars in Netlify and redeploy.
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-500 to-bronze-500 flex items-center justify-center shadow-lg shadow-gold-500/20 group-hover:shadow-gold-500/40 transition-shadow">
                <Compass className="w-5 h-5 text-slate-950" />
              </div>
            </div>
            <div>
              <span className="font-display text-xl font-bold gold-gradient-text">
                Treasure Atlas
              </span>
              <span className="hidden sm:block text-[10px] uppercase tracking-[0.2em] text-slate-500">
                Global Detecting Platform
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className="btn-ghost text-sm">
                <Icon className="w-4 h-4" />
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
