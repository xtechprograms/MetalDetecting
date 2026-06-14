import Link from "next/link";
import {
  Scale,
  Shield,
  MapPinned,
  Shovel,
  FileText,
  Waves,
  Sun,
} from "lucide-react";

const toolkitItems = [
  {
    icon: Scale,
    title: "Know the Law",
    description:
      "Research local regulations before every hunt. Some finds must be reported; protected sites are off limits.",
    href: "/research",
  },
  {
    icon: MapPinned,
    title: "Get Permission",
    description:
      "Always obtain written landowner permission. Document who granted access and when.",
    href: "/research",
  },
  {
    icon: FileText,
    title: "Log Everything",
    description:
      "Record GPS, depth, signal ID, soil type, and weather. Your future self will thank you.",
    href: "/finds/new",
  },
  {
    icon: Shovel,
    title: "Dig Responsibly",
    description:
      "Use proper plugs, fill holes completely, and leave sites cleaner than you found them.",
  },
  {
    icon: Waves,
    title: "Beach Timing",
    description:
      "Hunt beaches after storms and at low tide when sand has shifted and targets are closer to the surface.",
    href: "/research",
  },
  {
    icon: Sun,
    title: "Season & Weather",
    description:
      "Frozen ground and crop harvest windows open new permissions. Plan hunts around field schedules.",
    href: "/research",
  },
  {
    icon: Shield,
    title: "Privacy First",
    description:
      "Use the map privacy toggle for honey holes. Share finds without exposing your best spots.",
    href: "/finds/new",
  },
];

export function DetectoristToolkit() {
  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="section-heading mb-4">Detectorist Toolkit</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Pro tips and essentials every serious hunter keeps in mind — built
            right into your workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {toolkitItems.map(({ icon: Icon, title, description, href }) => {
            const content = (
              <div className="glass-card p-6 h-full hover:border-gold-500/30 transition-all group">
                <Icon className="w-6 h-6 text-gold-400 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-display font-semibold text-slate-100 mb-2">
                  {title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {description}
                </p>
              </div>
            );

            return href ? (
              <Link key={title} href={href} className="block">
                {content}
              </Link>
            ) : (
              <div key={title}>{content}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
