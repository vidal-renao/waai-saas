import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Requires INTERNAL_API_SECRET header — not publicly accessible
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret");
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ status: "down", error: "unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createClient();
    // Lightweight query to verify DB connectivity
    const { error } = await supabase
      .from("waai_plans")
      .select("id")
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      return NextResponse.json({
        status: "down",
        checks: { db: "down" },
        error: "database query failed",
        timestamp: new Date().toISOString(),
      }, { status: 503 });
    }

    return NextResponse.json({
      status: "ok",
      checks: { db: "ok" },
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({
      status: "down",
      checks: { db: "down" },
      error: "database connection failed",
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}
