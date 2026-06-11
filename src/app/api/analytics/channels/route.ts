import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyticsQuerySchema } from "@/lib/validators/analytics";
import { getWorkspaceAnalyticsUseCase } from "@/server/use-cases/get-workspace-analytics";
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
  const result = await getWorkspaceAnalyticsUseCase(supabase, user.id, {
    preset: preset as DatePreset,
    customFrom: from,
    customTo: to,
  });

  if (!result) return NextResponse.json({ error: "Unauthorized or no workspace" }, { status: 403 });

  return NextResponse.json({
    conversations_by_channel: result.data.conversations_by_channel,
    conversations_by_status: result.data.conversations_by_status,
    wa_inbound: result.data.wa_inbound,
    wa_outbound: result.data.wa_outbound,
    wa_failed: result.data.wa_failed,
    active_whatsapp_connections: result.data.active_whatsapp_connections,
  });
}
