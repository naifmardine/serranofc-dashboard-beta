import { NextResponse } from "next/server";
import { buildGeoMapData } from "@/lib/dashboard/loaders/geoMap";

export async function GET() {
  const data = await buildGeoMapData();
  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    data,
  });
}
