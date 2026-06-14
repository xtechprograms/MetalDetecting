import { NextRequest, NextResponse } from "next/server";
import { fetchAreaHistory, geocodeQuery } from "@/lib/research";

export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");
  const query = request.nextUrl.searchParams.get("q");

  if (query && !lat && !lng) {
    try {
      const location = await geocodeQuery(query);
      if (!location) {
        return NextResponse.json({ error: "Location not found" }, { status: 404 });
      }
      const history = await fetchAreaHistory(location.lat, location.lng);
      return NextResponse.json(history);
    } catch {
      return NextResponse.json({ error: "Failed to fetch area history" }, { status: 500 });
    }
  }

  if (!lat || !lng) {
    return NextResponse.json(
      { error: "lat and lng are required" },
      { status: 400 }
    );
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  if (isNaN(latitude) || isNaN(longitude)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  try {
    const history = await fetchAreaHistory(latitude, longitude);
    return NextResponse.json(history);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch area history" },
      { status: 500 }
    );
  }
}
