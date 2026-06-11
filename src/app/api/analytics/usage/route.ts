import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUsageLimitsAnalyticsUseCase } from "@/server/use-cases/get-usage-limits-analytics";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await getUsageLimitsAnalyticsUseCase(supabase, user.id);
  if (result === null) {
    return NextResponse.json({ error: "Unauthorized or no workspace" }, { status: 403 });
  }

  return NextResponse.json(result);
}
