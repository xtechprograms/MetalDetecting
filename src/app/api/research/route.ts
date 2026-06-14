import { NextRequest, NextResponse } from "next/server";
import { fetchAreaHistory } from "@/lib/research";

export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");

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
