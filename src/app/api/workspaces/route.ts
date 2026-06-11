import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createWorkspaceUseCase } from "@/server/use-cases/create-workspace";
import { createWorkspaceSchema } from "@/lib/validators/workspace";

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

  const parsed = createWorkspaceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 }
    );
  }

  const result = await createWorkspaceUseCase(supabase, user.id, parsed.data);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ workspace: result.workspace }, { status: 201 });
}
