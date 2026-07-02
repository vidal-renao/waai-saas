import { NextResponse } from "next/server";
import { APP_VERSION } from "@/lib/app-version";

// Public health check — no auth required, no secrets exposed
export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
    environment: process.env.NODE_ENV ?? "development",
  });
}
