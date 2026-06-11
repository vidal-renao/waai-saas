import { NextResponse } from "next/server";

// Public health check — no auth required, no secrets exposed
export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "0.8.0",
    environment: process.env.NODE_ENV ?? "development",
  });
}
