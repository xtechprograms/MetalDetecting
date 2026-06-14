"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
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
import { useRouter, usePathname } from "next/navigation";
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
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setMenuOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (accountMenuRef.current && !accountMenuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  async function handleSignOut() {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {user ? (
          <>
            <Link href="/finds/new" className="btn-primary text-sm py-2 px-3 sm:px-4 hidden sm:inline-flex">
              <PlusCircle className="w-4 h-4" />
              <span className="hidden md:inline">Log Find</span>
            </Link>
            <Link href="/dashboard" className="btn-ghost hidden sm:inline-flex px-2 sm:px-4">
              <LayoutDashboard className="w-4 h-4" />
              <span className="sr-only">Dashboard</span>
            </Link>
            <div className="relative" ref={accountMenuRef}>
              <button
                type="button"
                aria-label="Account menu"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex items-center justify-center min-h-11 min-w-11 p-1 rounded-xl hover:bg-slate-800/50 transition-colors"
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
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-56 max-w-[calc(100vw-2rem)] glass-card p-2 z-[100] animate-fade-in shadow-xl"
                >
                    <div className="px-3 py-2 border-b border-slate-700/50 mb-2">
                      <p className="font-semibold text-sm truncate">{profile?.display_name}</p>
                      <p className="text-xs text-slate-500 truncate">@{profile?.username}</p>
                    </div>
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-slate-800/50 text-sm min-h-[44px]"
                      onClick={() => setMenuOpen(false)}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Link>
                    <Link
                      href="/profile/me"
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-slate-800/50 text-sm min-h-[44px]"
                      onClick={() => setMenuOpen(false)}
                    >
                      <UserIcon className="w-4 h-4" />
                      My Profile
                    </Link>
                    <Link
                      href="/finds/new"
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-slate-800/50 text-sm sm:hidden min-h-[44px]"
                      onClick={() => setMenuOpen(false)}
                    >
                      <PlusCircle className="w-4 h-4" />
                      Log Find
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        handleSignOut();
                      }}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-red-900/30 text-red-400 text-sm w-full min-h-[44px]"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link href="/login" className="btn-ghost text-sm hidden sm:inline-flex">
              <LogIn className="w-4 h-4" />
              Sign In
            </Link>
            <Link href="/signup" className="btn-primary text-xs sm:text-sm py-2 px-3 sm:px-4">
              <UserPlus className="w-4 h-4" />
              <span className="hidden min-[380px]:inline">Join Free</span>
              <span className="min-[380px]:hidden">Join</span>
            </Link>
          </>
        )}

        <button
          type="button"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          className="md:hidden btn-ghost min-h-11 min-w-11 p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-[60] bg-black/75 top-16"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="md:hidden fixed left-0 right-0 top-16 z-[70] max-h-[calc(100dvh-4rem)] overflow-y-auto bg-slate-950 border-b border-slate-700 p-4 space-y-1 shadow-2xl">
            {mobileNavLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-slate-100 hover:bg-slate-800 min-h-[48px]"
                onClick={() => setMobileOpen(false)}
              >
                <Icon className="w-5 h-5 text-gold-500 shrink-0" />
                {label}
              </Link>
            ))}
            {user && (
              <>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-slate-100 hover:bg-slate-800 min-h-[48px]"
                  onClick={() => setMobileOpen(false)}
                >
                  <LayoutDashboard className="w-5 h-5 text-gold-500 shrink-0" />
                  Dashboard
                </Link>
                <Link
                  href="/profile/me"
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-slate-100 hover:bg-slate-800 min-h-[48px]"
                  onClick={() => setMobileOpen(false)}
                >
                  <UserIcon className="w-5 h-5 text-gold-500 shrink-0" />
                  My Profile
                </Link>
                <Link
                  href="/finds/new"
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-slate-100 hover:bg-slate-800 min-h-[48px]"
                  onClick={() => setMobileOpen(false)}
                >
                  <PlusCircle className="w-5 h-5 text-gold-500 shrink-0" />
                  Log Find
                </Link>
              </>
            )}
            {!user && (
              <Link
                href="/login"
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-slate-100 hover:bg-slate-800 min-h-[48px]"
                onClick={() => setMobileOpen(false)}
              >
                <LogIn className="w-5 h-5 text-gold-500 shrink-0" />
                Sign In
              </Link>
            )}
          </div>
        </>
      )}
    </>
  );
}
