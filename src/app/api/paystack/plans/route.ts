import { NextResponse } from "next/server";

// This API route is no longer used as pricing plans are now statically defined.
export async function GET() {
  return NextResponse.json({ error: "This endpoint is deprecated." }, { status: 410 });
}
