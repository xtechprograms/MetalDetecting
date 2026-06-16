"use client";

import { LegendSwatch } from "./LegendSwatch";
import { MAP_LEGEND_LABELS, type MapLegendKey } from "./legendConfig";

type MapLegendProps = {
  items: MapLegendKey[];
};

export function MapLegend({ items }: MapLegendProps) {
  if (items.length === 0) return null;

  return (
    <div className="mt-3 px-1">
      <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-2">Map legend</p>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {items.map((key) => (
          <div key={key} className="inline-flex items-center gap-2 text-xs text-slate-400">
            <LegendSwatch type={key} />
            <span>{MAP_LEGEND_LABELS[key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
