import { NextRequest, NextResponse } from "next/server";
import { geocodeZipCode, geocodeQuery, fetchNearbyHistorySites } from "@/lib/research";
import { parseRadiusToKm, MAX_RADIUS_KM, type UnitSystem } from "@/lib/geo";
import type { NearbyHistoryResult } from "@/types/database";

export async function GET(request: NextRequest) {
  const zip = request.nextUrl.searchParams.get("zip");
  const query = request.nextUrl.searchParams.get("q");
  const radiusParam = request.nextUrl.searchParams.get("radius");
  const unitParam = request.nextUrl.searchParams.get("unit");
  const country = request.nextUrl.searchParams.get("country") || "US";

  const unit: UnitSystem = unitParam === "metric" ? "metric" : "imperial";
  const radiusValue = parseFloat(radiusParam || "10");

  if (isNaN(radiusValue) || radiusValue <= 0) {
    return NextResponse.json({ error: "Invalid radius" }, { status: 400 });
  }

  const radiusKm = parseRadiusToKm(radiusValue, unit);

  if (radiusKm > MAX_RADIUS_KM) {
    return NextResponse.json({ error: "Maximum search radius is 100 miles / 100 km" }, { status: 400 });
  }

  const locationQuery = zip?.trim() || query?.trim();
  if (!locationQuery) {
    return NextResponse.json({ error: "zip or q parameter is required" }, { status: 400 });
  }

  try {
    const center = zip
      ? await geocodeZipCode(locationQuery, country)
      : await geocodeQuery(locationQuery);

    if (!center) {
      return NextResponse.json(
        { error: "Could not find that location. Check your zip/postal code and country." },
        { status: 404 }
      );
    }

    const sites = await fetchNearbyHistorySites(center.lat, center.lng, radiusKm);

    const result: NearbyHistoryResult = {
      center,
      radiusKm,
      unitSystem: unit,
      sites,
    };

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to fetch nearby history" }, { status: 500 });
  }
}
