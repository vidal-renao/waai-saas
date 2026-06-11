import { createClient } from "@/lib/supabase/server";
import { simulateWhatsappMessageUseCase } from "@/server/use-cases/simulate-whatsapp-message";
import { simulateMessageSchema } from "@/lib/validators/whatsapp";

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

  const parsed = simulateMessageSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const result = await simulateWhatsappMessageUseCase(supabase, user.id, parsed.data);

  if ("code" in result) {
    const statusMap: Record<string, number> = {
      FORBIDDEN: 403,
      NOT_FOUND: 404,
    };
    return Response.json(result, { status: statusMap[result.code] ?? 400 });
  }

  return Response.json(result);
}
