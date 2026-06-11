import { createClient } from "@/lib/supabase/server";
import { testWhatsappConnectionUseCase } from "@/server/use-cases/test-whatsapp-connection";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ connectionId: string }> }
) {
  const { connectionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const result = await testWhatsappConnectionUseCase(supabase, user.id, connectionId);

  if ("code" in result) {
    const statusMap: Record<string, number> = {
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      NOT_CONFIGURED: 503,
    };
    return Response.json(result, { status: statusMap[result.code] ?? 400 });
  }

  return Response.json(result);
}
