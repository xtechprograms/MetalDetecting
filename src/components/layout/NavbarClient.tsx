"use client";

import Link from "next/link";
import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  Menu,
  X,
  LogOut,
  User as UserIcon,
  PlusCircle,
  LayoutDashboard,
  LogIn,
  UserPlus,
  Map,
  Search,
  Users,
  MessagesSquare,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { useRouter } from "next/navigation";
import { getInitials } from "@/lib/utils";

const mobileNavLinks = [
  { href: "/forum", label: "Forum", icon: MessagesSquare },
  { href: "/map", label: "World Map", icon: Map },
  { href: "/research", label: "Research", icon: Search },
  { href: "/community", label: "Community", icon: Users },
];

type Profile = {
  username: string;
  display_name: string;
  avatar_url: string | null;
};

export function NavbarClient({
  user,
  profile,
}: {
  user: User | null;
  profile: Profile | null;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  async function handleSignOut() {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {user ? (
          <>
            <Link href="/finds/new" className="btn-primary text-sm py-2 px-4 hidden sm:inline-flex">
              <PlusCircle className="w-4 h-4" />
              Log Find
            </Link>
            <Link href="/dashboard" className="btn-ghost hidden sm:inline-flex">
              <LayoutDashboard className="w-4 h-4" />
            </Link>
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-800/50 transition-colors"
              >
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={profile.display_name}
                    className="w-9 h-9 rounded-xl object-cover border border-gold-500/30"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold-600 to-bronze-600 flex items-center justify-center text-sm font-bold text-slate-950">
                    {getInitials(profile?.display_name || "D")}
                  </div>
                )}
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-56 glass-card p-2 z-50 animate-fade-in">
                    <div className="px-3 py-2 border-b border-slate-700/50 mb-2">
                      <p className="font-semibold text-sm">{profile?.display_name}</p>
                      <p className="text-xs text-slate-500">@{profile?.username}</p>
                    </div>
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800/50 text-sm"
                      onClick={() => setMenuOpen(false)}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Link>
                    <Link
                      href={`/profile/${profile?.username}`}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800/50 text-sm"
                      onClick={() => setMenuOpen(false)}
                    >
                      <UserIcon className="w-4 h-4" />
                      My Profile
                    </Link>
                    <Link
                      href="/finds/new"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800/50 text-sm sm:hidden"
                      onClick={() => setMenuOpen(false)}
                    >
                      <PlusCircle className="w-4 h-4" />
                      Log Find
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-900/30 text-red-400 text-sm w-full"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <Link href="/login" className="btn-ghost text-sm hidden sm:inline-flex">
              <LogIn className="w-4 h-4" />
              Sign In
            </Link>
            <Link href="/signup" className="btn-primary text-sm py-2 px-4">
              <UserPlus className="w-4 h-4" />
              Join Free
            </Link>
          </>
        )}

        <button
          className="md:hidden btn-ghost p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800 p-4 space-y-1">
          {mobileNavLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800/50"
              onClick={() => setMobileOpen(false)}
            >
              <Icon className="w-5 h-5 text-gold-500" />
              {label}
            </Link>
          ))}
          {!user && (
            <Link
              href="/login"
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800/50"
              onClick={() => setMobileOpen(false)}
            >
              <LogIn className="w-5 h-5 text-gold-500" />
              Sign In
            </Link>
          )}
        </div>
      )}
    </>
  );
}
