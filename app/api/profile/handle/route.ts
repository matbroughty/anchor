import { auth } from "@/auth";
import { claimHandle, validateHandle } from "@/lib/handle";
import { NextResponse } from "next/server";

/**
 * POST /api/profile/handle
 * Claim a unique handle for the authenticated user
 */
export async function POST(request: Request) {
  // Verify authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { handle } = body;

    if (!handle || typeof handle !== "string") {
      return NextResponse.json(
        { error: "Handle is required" },
        { status: 400 }
      );
    }

    // Normalize and validate handle format
    const normalized = handle.toLowerCase();
    const validation = validateHandle(normalized);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Attempt to claim the handle
    const result = await claimHandle(session.user.id, normalized);

    if (!result.success) {
      // Handle already taken
      return NextResponse.json(
        { error: result.error || "Handle already taken" },
        { status: 409 }
      );
    }

    // Success
    return NextResponse.json({ handle: normalized }, { status: 200 });
  } catch (error) {
    console.error("Error in handle claim:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
