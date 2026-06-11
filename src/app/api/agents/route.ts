import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAgentUseCase } from "@/server/use-cases/create-agent";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = await createAgentUseCase(supabase, user.id, body);

  if (result.error) {
    const status =
      result.code === "FORBIDDEN" ? 403 : result.code === "PLAN_LIMIT" ? 402 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ agent: result.agent }, { status: 201 });
}
