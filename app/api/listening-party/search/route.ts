import { NextRequest, NextResponse } from "next/server";
import { searchListeningParties } from "@/lib/listening-party-cache";

/**
 * GET /api/listening-party/search?term=...&limit=20
 * Search listening parties by artist or album
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const term = searchParams.get("term");
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    if (!term || term.trim().length < 2) {
      return NextResponse.json(
        { error: "Search term must be at least 2 characters" },
        { status: 400 }
      );
    }

    const results = await searchListeningParties(term, limit);

    return NextResponse.json(results);
  } catch (error) {
    console.error("Listening party search error:", error);
    return NextResponse.json(
      { error: "Failed to search listening parties" },
      { status: 500 }
    );
  }
}
