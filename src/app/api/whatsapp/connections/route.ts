import { createClient } from "@/lib/supabase/server";
import { listWhatsappConnectionsUseCase } from "@/server/use-cases/list-whatsapp-connections";
import { createWhatsappConnectionUseCase } from "@/server/use-cases/create-whatsapp-connection";
import { createConnectionSchema } from "@/lib/validators/whatsapp";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const result = await listWhatsappConnectionsUseCase(supabase, user.id);
  if (!result) return Response.json({ error: "Workspace not found" }, { status: 404 });

  return Response.json(result);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createConnectionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const result = await createWhatsappConnectionUseCase(supabase, user.id, parsed.data);

  if ("code" in result) {
    const statusMap: Record<string, number> = {
      FORBIDDEN: 403,
      LIMIT_REACHED: 402,
    };
    return Response.json(result, { status: statusMap[result.code] ?? 400 });
  }

  return Response.json(result, { status: 201 });
}
