export type MapLegendKey = "find" | "history" | "selected" | "radius";

export const MAP_LEGEND_LABELS: Record<MapLegendKey, string> = {
  find: "Logged find",
  history: "Historic site",
  selected: "Selected location",
  radius: "Search radius",
};

export function findPinSvg(size: number, height: number): string {
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" width="${size}" height="${height}" aria-hidden="true" style="display:block">
  <ellipse cx="16" cy="39" rx="5" ry="2" fill="rgba(0,0,0,0.14)"/>
  <path d="M16 1C9.37 1 4 6.37 4 13c0 10.5 12 27 12 27s12-16.5 12-27C28 6.37 22.63 1 16 1z" fill="#ef4444" stroke="#dc2626" stroke-width="0.6"/>
  <circle cx="16" cy="13" r="5.5" fill="#7f1d1d"/>
  <circle cx="16" cy="13" r="2.8" fill="#450a0a"/>
</svg>`;
}

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
