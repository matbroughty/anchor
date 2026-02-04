import { isHandleAvailable, validateHandle } from "@/lib/handle";
import { NextResponse } from "next/server";

/**
 * GET /api/profile/handle/check?handle=value
 * Check if a handle is available (does not require authentication)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const handle = searchParams.get("handle");

  if (!handle) {
    return NextResponse.json(
      { error: "Handle parameter is required" },
      { status: 400 }
    );
  }

  // Validate format first
  const normalized = handle.toLowerCase();
  const validation = validateHandle(normalized);

  if (!validation.valid) {
    return NextResponse.json({
      available: false,
      error: validation.error,
    });
  }

  try {
    // Check availability in database
    const available = await isHandleAvailable(normalized);
    return NextResponse.json({ available });
  } catch (error) {
    console.error("Error checking handle availability:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
