"use client";

import L from "leaflet";

export type MapLegendKey = "find" | "history" | "selected" | "radius";

export const MAP_LEGEND_LABELS: Record<MapLegendKey, string> = {
  find: "Logged find",
  history: "Historic site",
  selected: "Selected location",
  radius: "Search radius",
};

const findPinSvg = (size: number, height: number) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" width="${size}" height="${height}" aria-hidden="true" style="display:block">
  <ellipse cx="16" cy="39" rx="5" ry="2" fill="rgba(0,0,0,0.14)"/>
  <path d="M16 1C9.37 1 4 6.37 4 13c0 10.5 12 27 12 27s12-16.5 12-27C28 6.37 22.63 1 16 1z" fill="#ef4444" stroke="#dc2626" stroke-width="0.6"/>
  <circle cx="16" cy="13" r="5.5" fill="#7f1d1d"/>
  <circle cx="16" cy="13" r="2.8" fill="#450a0a"/>
</svg>`;

export const findPinIcon = new L.DivIcon({
  className: "find-pin-marker",
  html: findPinSvg(32, 42),
  iconSize: [32, 42],
  iconAnchor: [16, 39],
  popupAnchor: [0, -39],
});

export const selectedIcon = new L.DivIcon({
  className: "custom-marker-selected",
  html: `<div style="
    width: 24px; height: 24px;
    background: #22c55e;
    border: 3px solid #fff;
    border-radius: 50%;
    box-shadow: 0 0 20px rgba(34,197,94,0.6);
  "></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export const historyIcon = new L.DivIcon({
  className: "custom-marker-history",
  html: `<div style="
    width: 20px; height: 20px;
    background: #d4a017;
    border: 2px solid #fef3c7;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(212,160,23,0.5);
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10],
});

export function resolveLegendKeys(options: {
  legend?: MapLegendKey[] | "auto";
  hasFinds: boolean;
  hasHistory: boolean;
  hasRadius: boolean;
  selectable: boolean;
}): MapLegendKey[] {
  if (options.legend && options.legend !== "auto") {
    return options.legend;
  }

  const keys: MapLegendKey[] = [];
  if (options.hasFinds) keys.push("find");
  if (options.hasHistory) keys.push("history");
  if (options.hasRadius) keys.push("radius");
  if (options.selectable) keys.push("selected");
  return keys;
}

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
        <span
          className="inline-flex items-center justify-center w-5 h-5 rounded-full shrink-0 border-2 border-dashed border-gold-500/70 bg-gold-500/10"
        />
      );
    default:
      return null;
  }
}
