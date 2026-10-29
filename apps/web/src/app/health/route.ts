import { NextResponse } from "next/server";

/**
 * Liveness endpoint. Confirms Route Handlers work in this app; later it can
 * also report dependency health. This is transport plumbing, not a domain API.
 */
export function GET() {
  return NextResponse.json({
    app: "web",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
