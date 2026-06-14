import { createClient } from "@/lib/supabase/server";
import { DetectingMap } from "@/components/map/DetectingMap";
import { Map, Globe } from "lucide-react";

export const metadata = {
  title: "World Map",
};

export default async function MapPage() {
  const supabase = await createClient();

  const { data: finds } = await supabase
    .from("finds")
    .select("*, profiles(username, display_name, avatar_url)")
    .eq("show_on_map", true)
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .order("found_date", { ascending: false })
    .limit(500);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="section-heading mb-2 flex items-center gap-3">
            <Globe className="w-8 h-8 text-gold-500" />
            Global Finds Map
          </h1>
          <p className="text-slate-400">
            Explore discoveries shared by detectorists worldwide. Click markers for details.
          </p>
        </div>
        <div className="glass-card px-4 py-2 text-sm">
          <span className="text-gold-400 font-semibold">{finds?.length || 0}</span>
          <span className="text-slate-400"> public finds mapped</span>
        </div>
      </div>

      <DetectingMap finds={finds || []} height="600px" zoom={2} />

      {(!finds || finds.length === 0) && (
        <div className="glass-card p-8 mt-6 text-center">
          <Map className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">
            No public finds on the map yet. Be the first to share a discovery!
          </p>
        </div>
      )}
    </div>
  );
}
