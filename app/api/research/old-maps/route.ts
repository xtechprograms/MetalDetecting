import { NextRequest, NextResponse } from "next/server";
import { geocodeZipCode, geocodeQuery } from "@/lib/research";
import { fetchOldMapsForLocation } from "@/lib/oldMaps";

export async function GET(request: NextRequest) {
  const latParam = request.nextUrl.searchParams.get("lat");
  const lngParam = request.nextUrl.searchParams.get("lng");
  const zip = request.nextUrl.searchParams.get("zip");
  const query = request.nextUrl.searchParams.get("q");
  const country = request.nextUrl.searchParams.get("country") || "US";

  let lat = latParam ? parseFloat(latParam) : NaN;
  let lng = lngParam ? parseFloat(lngParam) : NaN;
  let location = null;

  if (isNaN(lat) || isNaN(lng)) {
    const locationQuery = zip?.trim() || query?.trim();
    if (!locationQuery) {
      return NextResponse.json({ error: "lat/lng or zip/q is required" }, { status: 400 });
    }

    location = zip
      ? await geocodeZipCode(locationQuery, country)
      : await geocodeQuery(locationQuery);

    if (!location) {
      return NextResponse.json({ error: "Could not find that location" }, { status: 404 });
    }

    lat = location.lat;
    lng = location.lng;
  } else {
    location = {
      lat,
      lng,
      placeName: query || zip || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      country,
      postalCode: zip || undefined,
    };
  }

  try {
    const result = await fetchOldMapsForLocation(lat, lng, location);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to fetch historical maps" }, { status: 500 });
  }
}
