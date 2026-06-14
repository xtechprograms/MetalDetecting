import Link from "next/link";
import {
  Map,
  Search,
  Users,
  Camera,
  Globe,
  Shield,
  Compass,
  TrendingUp,
  MapPin,
  BookOpen,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { DetectoristToolkit } from "@/components/home/DetectoristToolkit";

const features = [
  {
    icon: MapPin,
    title: "GPS Find Logging",
    description:
      "Pin every discovery with precise latitude and longitude. Build a personal treasure map of your detecting career.",
  },
  {
    icon: BookOpen,
    title: "Area History Research",
    description:
      "Research any location worldwide. Get historical context, detecting tips, and land permission guidance before you hunt.",
  },
  {
    icon: Camera,
    title: "Photo Documentation",
    description:
      "Upload find photos and choose whether to share the exact GPS location on the global community map.",
  },
  {
    icon: Users,
    title: "Detectorist Community",
    description:
      "Connect with fellow hunters worldwide. Add friends, share adventures, and learn from experienced detectorists.",
  },
  {
    icon: Globe,
    title: "Global Coverage",
    description:
      "From Roman coins in England to gold nuggets in Australia — Treasure Atlas covers the entire world.",
  },
  {
    icon: Shield,
    title: "Privacy Controls",
    description:
      "You decide what goes public. Keep secret spots private or share your best finds with the community.",
  },
];

const stats = [
  { value: "195+", label: "Countries Covered" },
  { value: "GPS", label: "Precision Logging" },
  { value: "24/7", label: "Research Access" },
  { value: "Free", label: "To Join" },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,160,23,0.08),transparent_70%)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-20 sm:pb-32 relative">
          <div className="text-center max-w-4xl mx-auto animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-400 text-xs sm:text-sm mb-6 sm:mb-8">
              <Sparkles className="w-4 h-4" />
              The World&apos;s Premier Metal Detecting Platform
            </div>

            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-4 sm:mb-6">
              <span className="gold-gradient-text">Discover History</span>
              <br />
              <span className="text-slate-100">Beneath Your Feet</span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed">
              Log GPS finds, research historical sites worldwide, connect with
              detectorists, and document every treasure on your adventure — all
              in one professional platform.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup" className="btn-primary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 w-full sm:w-auto">
                Start Your Adventure
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/map" className="btn-secondary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 w-full sm:w-auto">
                <Map className="w-5 h-5" />
                Explore World Map
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-12 sm:mt-20 max-w-3xl mx-auto">
            {stats.map(({ value, label }) => (
              <div
                key={label}
                className="glass-card p-4 sm:p-6 text-center animate-slide-up"
              >
                <p className="font-display text-xl sm:text-2xl md:text-3xl font-bold gold-gradient-text">
                  {value}
                </p>
                <p className="text-sm text-slate-400 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="section-heading mb-4">
              Everything a Detectorist Needs
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Professional-grade tools designed by detectorists, for detectorists.
              From your first beep to your greatest find.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="glass-card p-6 sm:p-8 hover:border-gold-500/30 transition-all duration-300 group hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center mb-5 group-hover:bg-gold-500/20 transition-colors">
                  <Icon className="w-6 h-6 text-gold-400" />
                </div>
                <h3 className="font-display text-xl font-semibold text-slate-100 mb-3">
                  {title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 sm:py-24 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="section-heading mb-4">How It Works</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: "01",
                title: "Create Account",
                desc: "Sign up free with email. Set up your profile with bio and detector info.",
                icon: Compass,
              },
              {
                step: "02",
                title: "Research Areas",
                desc: "Drop a pin anywhere on Earth. Get historical context and detecting tips.",
                icon: Search,
              },
              {
                step: "03",
                title: "Log Your Finds",
                desc: "Upload photos, GPS coordinates, depth, and signal details for every discovery.",
                icon: TrendingUp,
              },
              {
                step: "04",
                title: "Share & Connect",
                desc: "Add friends, share on the global map, and grow your detecting network.",
                icon: Users,
              },
            ].map(({ step, title, desc, icon: Icon }) => (
              <div key={step} className="relative text-center">
                <div className="font-display text-5xl font-bold text-slate-800 mb-4">
                  {step}
                </div>
                <div className="w-14 h-14 mx-auto rounded-xl bg-gradient-to-br from-gold-600/20 to-bronze-600/20 border border-gold-500/20 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-gold-400" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-2">
                  {title}
                </h3>
                <p className="text-sm text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <DetectoristToolkit />

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass-card p-6 sm:p-10 lg:p-12 text-center relative overflow-hidden animate-pulse-gold">
            <div className="absolute inset-0 bg-gradient-to-r from-gold-500/5 via-transparent to-bronze-500/5" />
            <div className="relative">
              <Compass className="w-16 h-16 text-gold-500 mx-auto mb-6" />
              <h2 className="font-display text-3xl sm:text-4xl font-bold gold-gradient-text mb-4">
                Ready to Unearth History?
              </h2>
              <p className="text-slate-400 mb-8 max-w-lg mx-auto">
                Join detectorists worldwide documenting their adventures. Your
                next great find is waiting.
              </p>
              <Link href="/signup" className="btn-primary text-lg px-10 py-4">
                Join Treasure Atlas — Free
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
