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
    county?: string;
    region?: string;
  };
  name?: string;
  type?: string;
  class?: string;
};

type ReverseGeocodeContext = {
  placeName: string;
  city: string;
  town: string;
  village: string;
  county: string;
  state: string;
  country: string;
};

const US_STATE_ABBR: Record<string, string> = {
  alabama: "al",
  alaska: "ak",
  arizona: "az",
  arkansas: "ar",
  california: "ca",
  colorado: "co",
  connecticut: "ct",
  delaware: "de",
  florida: "fl",
  georgia: "ga",
  hawaii: "hi",
  idaho: "id",
  illinois: "il",
  indiana: "in",
  iowa: "ia",
  kansas: "ks",
  kentucky: "ky",
  louisiana: "la",
  maine: "me",
  maryland: "md",
  massachusetts: "ma",
  michigan: "mi",
  minnesota: "mn",
  mississippi: "ms",
  missouri: "mo",
  montana: "mt",
  nebraska: "ne",
  nevada: "nv",
  "new hampshire": "nh",
  "new jersey": "nj",
  "new mexico": "nm",
  "new york": "ny",
  "north carolina": "nc",
  "north dakota": "nd",
  ohio: "oh",
  oklahoma: "ok",
  oregon: "or",
  pennsylvania: "pa",
  "rhode island": "ri",
  "south carolina": "sc",
  "south dakota": "sd",
  tennessee: "tn",
  texas: "tx",
  utah: "ut",
  vermont: "vt",
  virginia: "va",
  washington: "wa",
  "west virginia": "wv",
  wisconsin: "wi",
  wyoming: "wy",
  "district of columbia": "dc",
};

function normalizeRegion(value: string): string {
  return value.trim().toLowerCase().replace(/\./g, "");
}

function regionToken(value: string): string {
  const normalized = normalizeRegion(value);
  return US_STATE_ABBR[normalized] || normalized;
}

function regionsMatch(expected: string, actual: string): boolean {
  if (!expected || !actual) return true;
  const expectedToken = regionToken(expected);
  const actualToken = regionToken(actual);
  return expectedToken === actualToken;
}

function formatLocalPlaceName(
  locality: string | undefined,
  state: string | undefined,
  country: string | undefined,
  fallback: string
): string {
  if (locality && state) return `${locality}, ${state}`;
  if (locality && country) return `${locality}, ${country}`;
  return fallback;
}

function nominatimMatchesRegion(
  item: NominatimResult,
  context: ReverseGeocodeContext
): boolean {
  const itemState = item.address?.state || item.address?.region || "";
  const itemCountry = item.address?.country || "";

  if (context.state && itemState && !regionsMatch(context.state, itemState)) {
    return false;
  }

  if (context.country && itemCountry && normalizeRegion(context.country) !== normalizeRegion(itemCountry)) {
    return false;
  }

  return true;
}

function wikiTitleMatchesRegion(title: string, context: ReverseGeocodeContext): boolean {
  if (!context.state) return true;

  const titleLower = title.toLowerCase();
  for (const [stateName, abbr] of Object.entries(US_STATE_ABBR)) {
    const mentionsState =
      titleLower.includes(stateName) ||
      titleLower.includes(`, ${abbr}`) ||
      titleLower.endsWith(` ${abbr}`);

    if (!mentionsState) continue;
    if (!regionsMatch(context.state, stateName) && !regionsMatch(context.state, abbr)) {
      return false;
    }
  }

  return true;
}

function mergeSearchContext(
  reverseContext: ReverseGeocodeContext,
  hint?: Partial<ReverseGeocodeContext>
): ReverseGeocodeContext {
  if (!hint) return reverseContext;

  const city = hint.city || reverseContext.city;
  const town = hint.town || reverseContext.town;
  const village = hint.village || reverseContext.village;
  const state = hint.state || reverseContext.state;
  const country = hint.country || reverseContext.country;
  const locality = city || town || village;

  return {
    ...reverseContext,
    city,
    town,
    village,
    county: hint.county || reverseContext.county,
    state,
    country,
    placeName:
      hint.placeName ||
      formatLocalPlaceName(locality, state, country, reverseContext.placeName),
  };
}

function placeLabel(result: NominatimResult): string {
  const locality =
    result.address?.city || result.address?.town || result.address?.village;
  const state = result.address?.state || result.address?.region;
  if (locality && state) return `${locality}, ${state}`;
  if (result.display_name) {
    return result.display_name.split(",").slice(0, 3).join(", ");
  }
  return result.name || "Unknown location";
}

async function geocodeUsZip(zip: string): Promise<GeocodedLocation | null> {
  const digits = zip.replace(/\D/g, "").slice(0, 5);
  if (digits.length !== 5) return null;

  try {
    const res = await fetch(`https://api.zippopotam.us/us/${digits}`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      country?: string;
      "post code"?: string;
      places?: Array<{
        "place name"?: string;
        state?: string;
        latitude?: string;
        longitude?: string;
      }>;
    };

    const place = data.places?.[0];
    if (!place?.latitude || !place.longitude) return null;

    const city = place["place name"] || "Unknown";
    const state = place.state || "";

    return {
      lat: parseFloat(place.latitude),
      lng: parseFloat(place.longitude),
      placeName: state ? `${city}, ${state}` : city,
      country: data.country || "United States",
      postalCode: data["post code"] || digits,
      region: state,
    };
  } catch {
    return null;
  }
}

async function searchWikipediaTitle(query: string): Promise<string | null> {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=1`;
    const searchRes = await fetch(searchUrl, { next: { revalidate: 86400 } });
    const searchData = await searchRes.json();
    return searchData.query?.search?.[0]?.title || null;
  } catch {
    return null;
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeContext> {
  const fallback: ReverseGeocodeContext = {
    placeName: "Unknown Location",
    city: "",
    town: "",
    village: "",
    county: "",
    state: "",
    country: "",
  };

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=12&addressdetails=1`;
    const res = await fetch(url, {
      headers: NOMINATIM_HEADERS,
      next: { revalidate: 86400 },
    });
    const geoData = await res.json();
    const address = geoData.address || {};
    const city = address.city || "";
    const town = address.town || "";
    const village = address.village || "";
    const state = address.state || address.region || "";
    const country = address.country || "";
    const locality = city || town || village;

    return {
      placeName: formatLocalPlaceName(
        locality,
        state,
        country,
        geoData.display_name
          ? geoData.display_name.split(",").slice(0, 3).join(", ")
          : fallback.placeName
      ),
      city,
      town,
      village,
      county: address.county || "",
      state,
      country,
    };
  } catch {
    return fallback;
  }
}

function parseNominatimResults(data: unknown): NominatimResult[] {
  return Array.isArray(data) ? data : [];
}

export async function geocodeZipCode(
  zip: string,
  countryCode = "US"
): Promise<GeocodedLocation | null> {
  const cleaned = zip.trim();
  if (!cleaned) return null;

  const upperCountry = countryCode.toUpperCase();

  if (upperCountry === "US") {
    const usResult = await geocodeUsZip(cleaned);
    if (usResult) return usResult;
  }

  const attempts = [
    `https://nominatim.openstreetmap.org/search?format=json&postalcode=${encodeURIComponent(cleaned)}&countrycodes=${encodeURIComponent(countryCode.toLowerCase())}&limit=5&addressdetails=1`,
  ];

  for (const url of attempts) {
    try {
      const res = await fetch(url, {
        headers: NOMINATIM_HEADERS,
        next: { revalidate: 86400 },
      });
      const data = parseNominatimResults(await res.json());
      if (data.length === 0) continue;

      const result =
        data.find((item) => item.address?.postcode?.startsWith(cleaned.replace(/\s/g, ""))) ||
        data[0];

      const state = result.address?.state || result.address?.region || "";

      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        placeName: placeLabel(result),
        country: result.address?.country || countryCode,
        postalCode: result.address?.postcode || cleaned,
        region: state || undefined,
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

  if (/^\d{5}(-\d{4})?$/.test(cleaned)) {
    const usZip = await geocodeUsZip(cleaned);
    if (usZip) return usZip;
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleaned)}&limit=1&addressdetails=1`;
    const res = await fetch(url, {
      headers: NOMINATIM_HEADERS,
      next: { revalidate: 86400 },
    });
    const data = parseNominatimResults(await res.json());
    if (data.length === 0) return null;

    const result = data[0];
    const state = result.address?.state || result.address?.region || "";

    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      placeName: placeLabel(result),
      country: result.address?.country || "",
      postalCode: result.address?.postcode,
      region: state || undefined,
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

async function fetchCenterAreaSite(
  lat: number,
  lng: number,
  seen: Set<string>,
  context: ReverseGeocodeContext
): Promise<NearbyHistorySite[]> {
  const key = `center-${lat.toFixed(4)}-${lng.toFixed(4)}`;
  if (seen.has(key)) return [];
  seen.add(key);

  const history = await fetchAreaHistory(lat, lng, context);
  const title = history.placeName.split(",")[0]?.trim() || history.placeName;

  return [
    {
      id: key,
      title: `Area overview: ${title}`,
      placeName: history.placeName,
      summary: history.summary,
      distanceKm: 0,
      coordinates: { lat, lng },
      source: "wikipedia",
    },
  ];
}

async function fetchWikipediaPlaceSites(
  lat: number,
  lng: number,
  context: ReverseGeocodeContext,
  seen: Set<string>,
  limit: number
): Promise<NearbyHistorySite[]> {
  const queries = [
    context.city,
    context.town,
    context.village,
    context.county,
    context.state,
  ].filter((name, index, arr) => name && arr.indexOf(name) === index);

  const sites: NearbyHistorySite[] = [];

  for (const query of queries) {
    if (sites.length >= limit) break;
    if (query === context.state) continue;

    const key = `wiki-place-${query.toLowerCase()}-${context.state.toLowerCase()}`;
    if (seen.has(key)) continue;

    try {
      const searchQuery = context.state
        ? `${query} ${context.state} history`
        : `${query} history`;
      const topResultTitle = await searchWikipediaTitle(searchQuery);
      if (!topResultTitle || !wikiTitleMatchesRegion(topResultTitle, context)) continue;

      const extracts = await fetchWikiExtracts([topResultTitle]);
      const summary =
        extracts.get(topResultTitle) ||
        `Historical background for ${query} and the surrounding area.`;

      seen.add(key);
      sites.push({
        id: key,
        title: topResultTitle,
        placeName: context.state ? `${query}, ${context.state}` : query,
        summary,
        distanceKm: 0,
        coordinates: { lat, lng },
        source: "wikipedia",
        wikipediaUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(topResultTitle.replace(/ /g, "_"))}`,
      });
    } catch {
      // try next place name
    }
  }

  return sites;
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
  limit: number,
  context: ReverseGeocodeContext
): Promise<NearbyHistorySite[]> {
  const queries = ["historic site", "memorial", "museum", "castle", "archaeological site"];
  const radiusM = Math.max(Math.round(radiusKm * 1000), 1000);
  const sites: NearbyHistorySite[] = [];

  for (const term of queries) {
    if (sites.length >= limit) break;

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(term)}&lat=${lat}&lon=${lng}&radius=${radiusM}&limit=8&addressdetails=1`;
      const res = await fetch(url, {
        headers: NOMINATIM_HEADERS,
        next: { revalidate: 86400 },
      });
      const data = parseNominatimResults(await res.json());

      for (const item of data) {
        const itemLat = parseFloat(item.lat);
        const itemLng = parseFloat(item.lon);
        if (Number.isNaN(itemLat) || Number.isNaN(itemLng)) continue;
        if (!nominatimMatchesRegion(item, context)) continue;

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
  limit: number,
  context: ReverseGeocodeContext
): Promise<NearbyHistorySite[]> {
  try {
    const radiusM = Math.max(Math.round(radiusKm * 1000), 5000);
    const url = `https://nominatim.openstreetmap.org/search?format=json&featuretype=city,town,village&lat=${lat}&lon=${lng}&radius=${radiusM}&limit=8&addressdetails=1`;
    const res = await fetch(url, {
      headers: NOMINATIM_HEADERS,
      next: { revalidate: 86400 },
    });
    const data = parseNominatimResults(await res.json());
    const sites: NearbyHistorySite[] = [];

    for (const item of data) {
      const itemLat = parseFloat(item.lat);
      const itemLng = parseFloat(item.lon);
      const distanceKm = haversineKm(centerLat, centerLng, itemLat, itemLng);
      if (distanceKm > radiusKm) continue;
      if (!nominatimMatchesRegion(item, context)) continue;

      const name =
        item.address?.city ||
        item.address?.town ||
        item.address?.village ||
        item.name ||
        placeLabel(item);
      const key = `settle-${name.toLowerCase()}-${context.state.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);

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

    for (const site of sites) {
      const wikiQuery = context.state ? `${site.title} ${context.state}` : site.title;
      const wikiTitle = await searchWikipediaTitle(wikiQuery);
      if (!wikiTitle || !wikiTitleMatchesRegion(wikiTitle, context)) {
        site.summary = `${site.title} is a nearby settlement with local history worth exploring for detecting research.`;
        continue;
      }

      const extracts = await fetchWikiExtracts([wikiTitle]);
      site.summary =
        extracts.get(wikiTitle) ||
        `${site.title} is a nearby settlement with local history worth exploring for detecting research.`;
      site.wikipediaUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiTitle.replace(/ /g, "_"))}`;
      site.source = "wikipedia";
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
  limit = 20,
  locationHint?: Pick<GeocodedLocation, "placeName" | "region" | "country">
): Promise<NearbyHistorySite[]> {
  const seen = new Set<string>();
  const reverseContext = await reverseGeocode(lat, lng);
  const context = mergeSearchContext(reverseContext, {
    placeName: locationHint?.placeName,
    state: locationHint?.region || "",
    country: locationHint?.country || "",
    city:
      locationHint?.placeName?.split(",")[0]?.trim() ||
      reverseContext.city ||
      reverseContext.town ||
      reverseContext.village,
  });

  const centerSite = await fetchCenterAreaSite(lat, lng, seen, context);

  const [wikiSites, nominatimSites, settlementSites, placeSites] = await Promise.all([
    fetchWikipediaNearby(lat, lng, radiusKm, lat, lng, seen, limit),
    fetchNominatimNearby(lat, lng, radiusKm, lat, lng, seen, limit, context),
    fetchSettlementHistory(lat, lng, radiusKm, lat, lng, seen, limit, context),
    fetchWikipediaPlaceSites(lat, lng, context, seen, 5),
  ]);

  return [...centerSite, ...placeSites, ...wikiSites, ...nominatimSites, ...settlementSites]
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

export async function fetchAreaHistory(
  lat: number,
  lng: number,
  contextOverride?: ReverseGeocodeContext
): Promise<import("@/types/database").AreaHistory> {
  const context = contextOverride || (await reverseGeocode(lat, lng));
  const placeName = context.placeName;
  const country = context.country;
  const region = context.state;
  const county = context.county;
  const city = context.city || context.town || context.village;

  const wikiQuery =
    [city, region].filter(Boolean).join(" ") ||
    [county, region].filter(Boolean).join(" ") ||
    placeName;

  let summary = "";
  const historicalEvents: string[] = [];

  try {
    const wikiSearchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(wikiQuery + " history")}&format=json&origin=*&srlimit=3`;
    const wikiSearchRes = await fetch(wikiSearchUrl, {
      next: { revalidate: 86400 },
    });
    const wikiSearchData = await wikiSearchRes.json();
    const topResult = wikiSearchData.query?.search?.[0];

    if (topResult && wikiTitleMatchesRegion(topResult.title, context)) {
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
