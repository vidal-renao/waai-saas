import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listLeadsUseCase } from "@/server/use-cases/list-leads";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const leads = await listLeadsUseCase(supabase, user.id);
  return NextResponse.json({ leads });
}
