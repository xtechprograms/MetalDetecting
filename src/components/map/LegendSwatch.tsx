"use client";

import { findPinSvg, type MapLegendKey } from "./legendConfig";

export function LegendSwatch({ type }: { type: MapLegendKey }) {
  switch (type) {
    case "find":
      return (
        <span
          className="inline-flex shrink-0"
          dangerouslySetInnerHTML={{ __html: findPinSvg(18, 24) }}
        />
      );
    case "history":
      return (
        <span
          className="inline-block w-4 h-4 rounded-full shrink-0"
          style={{
            background: "#d4a017",
            border: "2px solid #fef3c7",
            boxShadow: "0 1px 4px rgba(212,160,23,0.45)",
          }}
        />
      );
    case "selected":
      return (
        <span
          className="inline-block w-4 h-4 rounded-full shrink-0"
          style={{
            background: "#22c55e",
            border: "2px solid #fff",
            boxShadow: "0 0 8px rgba(34,197,94,0.5)",
          }}
        />
      );
    case "radius":
      return (
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full shrink-0 border-2 border-dashed border-gold-500/70 bg-gold-500/10" />
      );
    default:
      return null;
  }
}
