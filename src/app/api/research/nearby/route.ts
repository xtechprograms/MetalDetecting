import { NextRequest, NextResponse } from "next/server";
import {
  geocodeZipCode,
  geocodeQuery,
  fetchNearbyHistorySites,
  reverseGeocode,
} from "@/lib/research";
import { parseRadiusToKm, MAX_RADIUS_KM, type UnitSystem } from "@/lib/geo";
import type { GeocodedLocation, NearbyHistoryResult } from "@/types/database";

export async function GET(request: NextRequest) {
  const zip = request.nextUrl.searchParams.get("zip");
  const query = request.nextUrl.searchParams.get("q");
  const latParam = request.nextUrl.searchParams.get("lat");
  const lngParam = request.nextUrl.searchParams.get("lng");
  const placeNameHint = request.nextUrl.searchParams.get("placeName");
  const regionHint = request.nextUrl.searchParams.get("region");
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

  try {
    let center: GeocodedLocation | null = null;

    if (latParam && lngParam) {
      const lat = parseFloat(latParam);
      const lng = parseFloat(lngParam);

      if (isNaN(lat) || isNaN(lng)) {
        return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
      }

      const reverseContext = await reverseGeocode(lat, lng);
      center = {
        lat,
        lng,
        placeName: placeNameHint || reverseContext.placeName,
        country: reverseContext.country || country,
        postalCode: undefined,
        region: regionHint || reverseContext.state || undefined,
      };
    } else {
      const locationQuery = zip?.trim() || query?.trim();
      if (!locationQuery) {
        return NextResponse.json({ error: "zip, q, or lat/lng is required" }, { status: 400 });
      }

      center = zip
        ? await geocodeZipCode(locationQuery, country)
        : await geocodeQuery(locationQuery);
    }

    if (!center) {
      return NextResponse.json(
        { error: "Could not find that location. Check your search and country." },
        { status: 404 }
      );
    }

    const sites = await fetchNearbyHistorySites(center.lat, center.lng, radiusKm, 20, {
      placeName: center.placeName,
      region: center.region,
      country: center.country,
    });

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
