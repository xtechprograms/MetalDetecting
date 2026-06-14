import type { GeocodedLocation, NearbyHistorySite } from "@/types/database";
import { haversineKm } from "@/lib/geo";

const NOMINATIM_HEADERS = {
  "User-Agent": "TreasureAtlas/1.0 (metal detecting platform)",
};

const WIKI_MAX_RADIUS_M = 10000;

type NominatimResult = {
  lat: string;
  lon: string;
  display_name?: string;
  address?: {
    country?: string;
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
  };
  name?: string;
  type?: string;
  class?: string;
};

function placeLabel(result: NominatimResult): string {
  if (result.display_name) {
    return result.display_name.split(",").slice(0, 3).join(", ");
  }
  return result.name || "Unknown location";
}

export async function geocodeZipCode(
  zip: string,
  countryCode = "US"
): Promise<GeocodedLocation | null> {
  const cleaned = zip.trim();
  if (!cleaned) return null;

  const attempts = [
    `https://nominatim.openstreetmap.org/search?format=json&postalcode=${encodeURIComponent(cleaned)}&countrycodes=${encodeURIComponent(countryCode.toLowerCase())}&limit=1&addressdetails=1`,
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(`${cleaned}, ${countryCode}`)}&limit=1&addressdetails=1`,
  ];

  for (const url of attempts) {
    try {
      const res = await fetch(url, {
        headers: NOMINATIM_HEADERS,
        next: { revalidate: 86400 },
      });
      const data = (await res.json()) as NominatimResult[];
      if (data.length === 0) continue;

      const result = data[0];
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        placeName: placeLabel(result),
        country: result.address?.country || countryCode,
        postalCode: result.address?.postcode || cleaned,
      };
    } catch {
      // try next strategy
    }
  }

  return null;
}

export async function geocodeQuery(query: string): Promise<GeocodedLocation | null> {
  const cleaned = query.trim();
  if (!cleaned) return null;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleaned)}&limit=1&addressdetails=1`;
    const res = await fetch(url, {
      headers: NOMINATIM_HEADERS,
      next: { revalidate: 86400 },
    });
    const data = (await res.json()) as NominatimResult[];
    if (data.length === 0) return null;

    const result = data[0];
    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      placeName: placeLabel(result),
      country: result.address?.country || "",
      postalCode: result.address?.postcode,
    };
  } catch {
    return null;
  }
}

async function fetchWikiExtracts(titles: string[]): Promise<Map<string, string>> {
  const extracts = new Map<string, string>();
  if (titles.length === 0) return extracts;

  const batchUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${titles.map(encodeURIComponent).join("|")}&prop=extracts&exintro=true&explaintext=true&format=json&origin=*`;
  try {
    const res = await fetch(batchUrl, { next: { revalidate: 86400 } });
    const data = await res.json();
    const pages = data.query?.pages || {};
    for (const page of Object.values(pages) as { title?: string; extract?: string }[]) {
      if (page.title && page.extract) {
        const text = page.extract.slice(0, 400);
        extracts.set(page.title, text.length < page.extract.length ? `${text}...` : text);
      }
    }
  } catch {
    // return partial map
  }
  return extracts;
}

async function fetchWikipediaNearby(
  lat: number,
  lng: number,
  radiusKm: number,
  centerLat: number,
  centerLng: number,
  seen: Set<string>,
  limit: number
): Promise<NearbyHistorySite[]> {
  const radiusM = Math.min(Math.round(radiusKm * 1000), WIKI_MAX_RADIUS_M);
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lng}&gsradius=${radiusM}&gslimit=${limit}&format=json&origin=*`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    const data = await res.json();
    const results = data.query?.geosearch || [];

    const titles = results.map((r: { title: string }) => r.title) as string[];
    const extracts = await fetchWikiExtracts(titles);

    return results
      .map((item: { pageid: number; title: string; lat: number; lon: number; dist: number }) => {
        const key = `wiki-${item.pageid}`;
        if (seen.has(key)) return null;
        seen.add(key);

        const distanceKm = haversineKm(centerLat, centerLng, item.lat, item.lon);
        return {
          id: key,
          title: item.title,
          placeName: item.title,
          summary:
            extracts.get(item.title) ||
            `Historical article about ${item.title} near your search area.`,
          distanceKm,
          coordinates: { lat: item.lat, lng: item.lon },
          source: "wikipedia" as const,
          wikipediaUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, "_"))}`,
        };
      })
      .filter(Boolean) as NearbyHistorySite[];
  } catch {
    return [];
  }
}

async function fetchNominatimNearby(
  lat: number,
  lng: number,
  radiusKm: number,
  centerLat: number,
  centerLng: number,
  seen: Set<string>,
  limit: number
): Promise<NearbyHistorySite[]> {
  const radiusM = Math.round(radiusKm * 1000);
  const queries = ["historic", "memorial", "castle", "museum", "archaeological"];

  const sites: NearbyHistorySite[] = [];

  for (const term of queries) {
    if (sites.length >= limit) break;

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(term)}&lat=${lat}&lon=${lng}&radius=${radiusM}&limit=5&addressdetails=1`;
      const res = await fetch(url, {
        headers: NOMINATIM_HEADERS,
        next: { revalidate: 86400 },
      });
      const data = (await res.json()) as NominatimResult[];

      for (const item of data) {
        const itemLat = parseFloat(item.lat);
        const itemLng = parseFloat(item.lon);
        const distanceKm = haversineKm(centerLat, centerLng, itemLat, itemLng);
        if (distanceKm > radiusKm) continue;

        const key = `nom-${itemLat.toFixed(4)}-${itemLng.toFixed(4)}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const name = item.name || placeLabel(item);
        sites.push({
          id: key,
          title: name,
          placeName: placeLabel(item),
          summary: `${name} is a ${item.type || "historic site"} in this area — worth researching before detecting nearby.`,
          distanceKm,
          coordinates: { lat: itemLat, lng: itemLng },
          source: "nominatim",
        });

        if (sites.length >= limit) break;
      }
    } catch {
      // continue with next query term
    }
  }

  return sites;
}

async function fetchSettlementHistory(
  lat: number,
  lng: number,
  radiusKm: number,
  centerLat: number,
  centerLng: number,
  seen: Set<string>,
  limit: number
): Promise<NearbyHistorySite[]> {
  if (radiusKm <= 10) return [];

  try {
    const radiusM = Math.round(radiusKm * 1000);
    const url = `https://nominatim.openstreetmap.org/search?format=json&featuretype=city,town,village&lat=${lat}&lon=${lng}&radius=${radiusM}&limit=8&addressdetails=1`;
    const res = await fetch(url, {
      headers: NOMINATIM_HEADERS,
      next: { revalidate: 86400 },
    });
    const data = (await res.json()) as NominatimResult[];

    const sites: NearbyHistorySite[] = [];
    const wikiTitles: string[] = [];

    for (const item of data) {
      const itemLat = parseFloat(item.lat);
      const itemLng = parseFloat(item.lon);
      const distanceKm = haversineKm(centerLat, centerLng, itemLat, itemLng);
      if (distanceKm > radiusKm) continue;

      const name =
        item.address?.city ||
        item.address?.town ||
        item.address?.village ||
        item.name ||
        placeLabel(item);
      const key = `settle-${name.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);

      wikiTitles.push(name);
      sites.push({
        id: key,
        title: name,
        placeName: placeLabel(item),
        summary: "",
        distanceKm,
        coordinates: { lat: itemLat, lng: itemLng },
        source: "nominatim",
      });
    }

    const extracts = await fetchWikiExtracts(wikiTitles);
    for (const site of sites) {
      site.summary =
        extracts.get(site.title) ||
        `${site.title} is a nearby settlement with local history worth exploring for detecting research.`;
      if (extracts.has(site.title)) {
        site.wikipediaUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(site.title.replace(/ /g, "_"))}`;
        site.source = "wikipedia";
      }
    }

    return sites.slice(0, limit);
  } catch {
    return [];
  }
}

export async function fetchNearbyHistorySites(
  lat: number,
  lng: number,
  radiusKm: number,
  limit = 20
): Promise<NearbyHistorySite[]> {
  const seen = new Set<string>();

  const [wikiSites, nominatimSites, settlementSites] = await Promise.all([
    fetchWikipediaNearby(lat, lng, radiusKm, lat, lng, seen, limit),
    fetchNominatimNearby(lat, lng, radiusKm, lat, lng, seen, limit),
    fetchSettlementHistory(lat, lng, radiusKm, lat, lng, seen, limit),
  ]);

  return [...wikiSites, ...nominatimSites, ...settlementSites]
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

export async function fetchAreaHistory(
  lat: number,
  lng: number
): Promise<import("@/types/database").AreaHistory> {
  const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`;

  let placeName = "Unknown Location";
  let country = "";
  let region = "";
  let county = "";
  let city = "";

  try {
    const geoRes = await fetch(nominatimUrl, {
      headers: NOMINATIM_HEADERS,
      next: { revalidate: 86400 },
    });
    const geoData = await geoRes.json();

    if (geoData.display_name) {
      placeName = geoData.display_name.split(",").slice(0, 3).join(", ");
    }
    country = geoData.address?.country || "";
    region = geoData.address?.state || geoData.address?.region || "";
    county = geoData.address?.county || "";
    city =
      geoData.address?.city ||
      geoData.address?.town ||
      geoData.address?.village ||
      "";
  } catch {
    // Continue with defaults
  }

  const searchTerms = [city, county, region, country].filter(Boolean);
  const wikiQuery = searchTerms.slice(0, 2).join(" ") || placeName;

  let summary = "";
  const historicalEvents: string[] = [];

  try {
    const wikiSearchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(wikiQuery + " history")}&format=json&origin=*&srlimit=3`;
    const wikiSearchRes = await fetch(wikiSearchUrl, {
      next: { revalidate: 86400 },
    });
    const wikiSearchData = await wikiSearchRes.json();
    const topResult = wikiSearchData.query?.search?.[0];

    if (topResult) {
      const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(topResult.title)}&prop=extracts&exintro=true&explaintext=true&format=json&origin=*`;
      const extractRes = await fetch(extractUrl, { next: { revalidate: 86400 } });
      const extractData = await extractRes.json();
      const pages = extractData.query?.pages;
      const page = pages ? (Object.values(pages)[0] as { extract?: string }) : null;
      if (page?.extract) {
        summary = page.extract.slice(0, 800);
        if (page.extract.length > 800) summary += "...";
      }
    }
  } catch {
    summary = `This area in ${region || country || "the region"} has a rich history waiting to be explored. Research local archives, historical societies, and old maps for the best detecting opportunities near ${placeName}.`;
  }

  if (!summary) {
    summary = `${placeName} is located in ${[region, country].filter(Boolean).join(", ")}. This region may have historical significance from settlement periods, trade routes, military activity, or agricultural use — all prime indicators for metal detecting opportunities.`;
  }

  historicalEvents.push(
    `Settlement & Development: Research when ${city || region || "this area"} was first settled and how land use evolved over time.`,
    `Trade & Commerce: Old markets, fairgrounds, and trading posts often leave coins and artifacts behind.`,
    `Military History: Check for nearby battlefields, camps, or fortifications — high-value detecting zones.`,
    `Transportation Routes: Historic roads, railroads, and ferry crossings are proven find locations.`,
    `Social Gatherings: Parks, beaches, picnic areas, and festival grounds accumulate lost items over decades.`
  );

  const detectingTips = [
    "Start with old maps (Sanborn fire maps, USGS topos) to identify former structures no longer visible.",
    "Focus on permission-granted private land near historical sites rather than protected areas.",
    "Beach detecting: search after storms when sand shifts expose deeper targets.",
    "Research local detector clubs — they often share permission contacts and site knowledge.",
    "Document everything: GPS coordinates, depth, signal ID, and soil conditions improve future hunts.",
    "Check local laws: some countries require reporting finds of archaeological significance.",
  ];

  const landPermissions =
    country === "United States"
      ? "US: Always obtain written landowner permission on private property. National Parks prohibit detecting. State/local rules vary — check BLM, state forest, and county regulations."
      : country === "United Kingdom"
        ? "UK: Requires landowner permission. Report Treasure Act finds to the coroner. Scheduled Ancient Monuments are protected."
        : `Always research local laws for ${country || "your country"}. Obtain explicit landowner permission before detecting on private property.`;

  return {
    placeName,
    country,
    region,
    summary,
    historicalEvents,
    detectingTips,
    landPermissions,
    coordinates: { lat, lng },
  };
}
