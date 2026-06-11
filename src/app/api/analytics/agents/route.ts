import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyticsQuerySchema } from "@/lib/validators/analytics";
import { getAgentPerformanceAnalyticsUseCase } from "@/server/use-cases/get-agent-performance-analytics";
import type { DatePreset } from "@/server/services/analytics-service";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = analyticsQuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { preset, from, to } = parsed.data;
  const result = await getAgentPerformanceAnalyticsUseCase(
    supabase,
    user.id,
    preset as DatePreset,
    from,
    to
  );

  if (result === null) {
    return NextResponse.json({ error: "Unauthorized or no workspace" }, { status: 403 });
  }

  return NextResponse.json({ agents: result });
}
