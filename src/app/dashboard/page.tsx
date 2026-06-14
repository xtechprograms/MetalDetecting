import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  MapPin,
  PlusCircle,
  Search,
  Users,
  Compass,
  TrendingUp,
  Eye,
} from "lucide-react";
import { FIND_CATEGORIES, formatDate, formatCoordinates } from "@/lib/utils";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/dashboard");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: finds } = await supabase
    .from("finds")
    .select("*")
    .eq("user_id", user.id)
    .order("found_date", { ascending: false })
    .limit(10);

  const { count: totalFinds } = await supabase
    .from("finds")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { count: mapFinds } = await supabase
    .from("finds")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("show_on_map", true);

  const { count: friendsCount } = await supabase
    .from("friendships")
    .select("*", { count: "exact", head: true })
    .eq("status", "accepted")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  const { count: researchCount } = await supabase
    .from("research_bookmarks")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const stats = [
    { label: "Total Finds", value: totalFinds || 0, icon: Compass, color: "text-gold-400" },
    { label: "On Map", value: mapFinds || 0, icon: MapPin, color: "text-green-400" },
    { label: "Friends", value: friendsCount || 0, icon: Users, color: "text-blue-400" },
    { label: "Research Saved", value: researchCount || 0, icon: Search, color: "text-purple-400" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="section-heading mb-1">
            Welcome, {profile?.display_name || "Detectorist"}
          </h1>
          <p className="text-slate-400">Your detecting command center</p>
        </div>
        <Link href="/finds/new" className="btn-primary">
          <PlusCircle className="w-5 h-5" />
          Log New Find
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-card p-6">
            <div className="flex items-center justify-between mb-3">
              <Icon className={`w-5 h-5 ${color}`} />
              <TrendingUp className="w-4 h-4 text-slate-600" />
            </div>
            <p className="font-display text-3xl font-bold text-slate-100">{value}</p>
            <p className="text-sm text-slate-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <Link
          href="/research"
          className="glass-card p-6 hover:border-gold-500/30 transition-all group"
        >
          <Search className="w-6 h-6 text-gold-400 mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="font-semibold mb-1">Research an Area</h3>
          <p className="text-xs text-slate-500">Explore history before you hunt</p>
        </Link>
        <Link
          href="/map"
          className="glass-card p-6 hover:border-gold-500/30 transition-all group"
        >
          <MapPin className="w-6 h-6 text-gold-400 mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="font-semibold mb-1">View Global Map</h3>
          <p className="text-xs text-slate-500">See community discoveries</p>
        </Link>
        <Link
          href="/community"
          className="glass-card p-6 hover:border-gold-500/30 transition-all group"
        >
          <Users className="w-6 h-6 text-gold-400 mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="font-semibold mb-1">Find Friends</h3>
          <p className="text-xs text-slate-500">Connect with detectorists</p>
        </Link>
      </div>

      {/* Recent Finds */}
      <div className="glass-card p-6">
        <h2 className="font-display text-xl font-semibold mb-6">Recent Finds</h2>
        {finds && finds.length > 0 ? (
          <div className="space-y-4">
            {finds.map((find) => {
              const cat = FIND_CATEGORIES.find((c) => c.value === find.category);
              return (
                <div
                  key={find.id}
                  className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
                >
                  {find.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={find.photo_url}
                      alt={find.title}
                      className="w-16 h-16 rounded-xl object-cover border border-slate-700"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-800 flex items-center justify-center text-2xl">
                      {cat?.icon || "✨"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{find.title}</p>
                    <p className="text-sm text-slate-400">
                      {cat?.label} · {formatDate(find.found_date)}
                    </p>
                    {find.latitude != null && find.longitude != null && (
                      <p className="text-xs text-slate-500 mt-1">
                        {formatCoordinates(find.latitude, find.longitude)}
                      </p>
                    )}
                  </div>
                  {find.show_on_map && (
                    <span className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
                      <Eye className="w-3 h-3" />
                      Public
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Compass className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-4">No finds logged yet</p>
            <Link href="/finds/new" className="btn-primary">
              Log Your First Find
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
