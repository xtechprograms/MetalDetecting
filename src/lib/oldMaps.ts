import type { GeocodedLocation, OldMapRecord, OldMapsResult } from "@/types/database";

const USGS_IDENTIFY_URL =
  "https://ngmdb.usgs.gov/arcgis/rest/services/topoview/ustOverlay/MapServer/identify";

type UsgsIdentifyResult = {
  attributes: {
    map_name: string;
    imprint_year: string;
    map_scale: string;
    series: string;
    map_state: string;
    drg_name: string;
    date_on_map: string;
    scan_id: string;
  };
};

function formatScaleLabel(scale: number): string {
  if (!scale || scale <= 0) return "Unknown scale";
  return `1:${scale.toLocaleString()}`;
}

function buildUsgsDownloadUrl(state: string, scale: string, drgName: string): string {
  const encoded = drgName.split("/").map(encodeURIComponent).join("/");
  return `https://prd-tnm.s3.amazonaws.com/StagedProducts/Maps/HistoricalTopo/PDF/${state}/${scale}/${encoded}`;
}

function buildUsgsThumbnailUrl(state: string, scale: string, drgName: string): string {
  const thumbName = drgName.replace("_geo.pdf", "_tn.jpg");
  const encoded = thumbName.split("/").map(encodeURIComponent).join("/");
  return `https://prd-tnm.s3.amazonaws.com/StagedProducts/Maps/HistoricalTopo/PDF/${state}/${scale}/${encoded}`;
}

function mapDescription(name: string, year: number, scaleLabel: string, series: string): string {
  const era =
    year < 1900
      ? "This late 19th-century sheet may show homesteads, wagon roads, and structures long gone — prime leads for permission-based detecting."
      : year < 1950
        ? "Mid-century topo detail can reveal old fairgrounds, schools, rail spurs, and homesteads erased by modern development."
        : "Later topos still help compare past land use against today's terrain before you hunt.";

  return `${name} (${year}, ${scaleLabel}, ${series}) covers your search area. ${era}`;
}

async function fetchUsgsHistoricalMaps(lat: number, lng: number, limit = 24): Promise<OldMapRecord[]> {
  const pad = 0.12;
  const mapExtent = `${lng - pad},${lat - pad},${lng + pad},${lat + pad}`;

  const params = new URLSearchParams({
    sr: "4326",
    layers: "all",
    tolerance: "12",
    returnGeometry: "false",
    imageDisplay: "800,600,96",
    mapExtent,
    geometry: `${lng},${lat}`,
    geometryType: "esriGeometryPoint",
    f: "json",
  });

  try {
    const res = await fetch(`${USGS_IDENTIFY_URL}?${params}`, {
      next: { revalidate: 86400 },
    });
    const data = await res.json();
    const results = (data.results || []) as UsgsIdentifyResult[];

    const seen = new Set<string>();
    const maps: OldMapRecord[] = [];

    for (const item of results) {
      const attrs = item.attributes;
      if (!attrs?.drg_name || seen.has(attrs.drg_name)) continue;
      seen.add(attrs.drg_name);

      const scale = parseInt(attrs.map_scale, 10) || 0;
      const year = parseInt(attrs.imprint_year, 10) || parseInt(attrs.date_on_map, 10) || 0;
      const state = attrs.map_state || "US";
      const scaleKey = String(scale || "unknown");

      maps.push({
        id: attrs.drg_name,
        title: attrs.map_name || "Historical Topo Map",
        year,
        scale,
        scaleLabel: formatScaleLabel(scale),
        series: attrs.series || "HTMC",
        state,
        thumbnailUrl: buildUsgsThumbnailUrl(state, scaleKey, attrs.drg_name),
        previewUrl: buildUsgsThumbnailUrl(state, scaleKey, attrs.drg_name),
        downloadUrl: buildUsgsDownloadUrl(state, scaleKey, attrs.drg_name),
        viewUrl: "https://ngmdb.usgs.gov/maps/topoview/",
        description: mapDescription(attrs.map_name, year, formatScaleLabel(scale), attrs.series),
        source: "usgs",
      });
    }

    return maps
      .sort((a, b) => {
        const detailA = a.scale > 0 ? a.scale : Number.MAX_SAFE_INTEGER;
        const detailB = b.scale > 0 ? b.scale : Number.MAX_SAFE_INTEGER;
        if (detailA !== detailB) return detailA - detailB;
        return a.year - b.year;
      })
      .slice(0, limit);
  } catch {
    return [];
  }
}

function isUnitedStates(country: string): boolean {
  const normalized = country.toLowerCase();
  return (
    normalized === "us" ||
    normalized === "usa" ||
    normalized === "united states" ||
    normalized.includes("united states")
  );
}

export async function fetchOldMapsForLocation(
  lat: number,
  lng: number,
  location: GeocodedLocation
): Promise<OldMapsResult> {
  if (isUnitedStates(location.country)) {
    const maps = await fetchUsgsHistoricalMaps(lat, lng);
    return { location, maps };
  }

  return { location, maps: [] };
}
