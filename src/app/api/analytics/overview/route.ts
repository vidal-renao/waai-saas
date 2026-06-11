import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyticsQuerySchema } from "@/lib/validators/analytics";
import { getWorkspaceAnalyticsUseCase } from "@/server/use-cases/get-workspace-analytics";
import { getOperationalAlertsUseCase } from "@/server/use-cases/get-operational-alerts";
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

  const [overview, alerts] = await Promise.all([
    getWorkspaceAnalyticsUseCase(supabase, user.id, {
      preset: preset as DatePreset,
      customFrom: from,
      customTo: to,
    }),
    getOperationalAlertsUseCase(supabase, user.id),
  ]);

  if (!overview) {
    return NextResponse.json({ error: "No workspace or unauthorized" }, { status: 403 });
  }

  return NextResponse.json({ ...overview, alerts: alerts ?? [] });
}
