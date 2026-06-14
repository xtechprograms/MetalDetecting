import type { AreaHistory } from "@/types/database";

export async function fetchAreaHistory(
  lat: number,
  lng: number
): Promise<AreaHistory> {
  const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`;

  let placeName = "Unknown Location";
  let country = "";
  let region = "";
  let county = "";
  let city = "";

  try {
    const geoRes = await fetch(nominatimUrl, {
      headers: { "User-Agent": "TreasureAtlas/1.0 (metal detecting platform)" },
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
      const page = pages ? Object.values(pages)[0] as { extract?: string } : null;
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
