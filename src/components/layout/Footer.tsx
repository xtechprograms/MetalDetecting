import Link from "next/link";
import { Compass } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative border-t border-slate-800/60 bg-slate-950/60 backdrop-blur-xl mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-500 to-bronze-500 flex items-center justify-center">
                <Compass className="w-5 h-5 text-slate-950" />
              </div>
              <span className="font-display text-xl font-bold gold-gradient-text">
                Treasure Atlas
              </span>
            </div>
            <p className="text-slate-400 text-sm max-w-md leading-relaxed">
              The world&apos;s premier platform for metal detectorists. Log GPS finds,
              research historical sites, connect with fellow hunters, and document
              every discovery on your detecting journey.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-200 mb-4">Explore</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link href="/map" className="hover:text-gold-400 transition-colors">World Map</Link></li>
              <li><Link href="/research" className="hover:text-gold-400 transition-colors">Area Research</Link></li>
              <li><Link href="/community" className="hover:text-gold-400 transition-colors">Community</Link></li>
              <li><Link href="/finds/new" className="hover:text-gold-400 transition-colors">Log a Find</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-200 mb-4">Account</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link href="/signup" className="hover:text-gold-400 transition-colors">Create Account</Link></li>
              <li><Link href="/login" className="hover:text-gold-400 transition-colors">Sign In</Link></li>
              <li><Link href="/dashboard" className="hover:text-gold-400 transition-colors">Dashboard</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} Treasure Atlas. Hunt responsibly.</p>
          <p className="text-xs text-slate-600">
            Always obtain landowner permission. Follow local laws and reporting requirements.
          </p>
        </div>
      </div>
    </footer>
  );
}
