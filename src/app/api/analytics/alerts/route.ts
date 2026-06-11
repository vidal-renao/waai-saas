import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOperationalAlertsUseCase } from "@/server/use-cases/get-operational-alerts";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const alerts = await getOperationalAlertsUseCase(supabase, user.id);
  if (alerts === null) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  return NextResponse.json({ alerts });
}
