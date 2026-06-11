import { createClient } from "@/lib/supabase/server";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { WhatsappConnectionRepository } from "@/server/repositories/whatsapp-connection-repository";
import { updateWhatsappConnectionUseCase } from "@/server/use-cases/update-whatsapp-connection";
import { updateConnectionSchema } from "@/lib/validators/whatsapp";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ connectionId: string }> }
) {
  const { connectionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const membersRepo = new WorkspaceMembersRepository(supabase);
  const workspaceId = await membersRepo.getUserWorkspaceId(user.id);
  if (!workspaceId) return Response.json({ error: "Workspace not found" }, { status: 404 });

  const connRepo = new WhatsappConnectionRepository(supabase);
  const connection = await connRepo.findById(connectionId);

  if (!connection || connection.workspace_id !== workspaceId) {
    return Response.json({ error: "Connection not found" }, { status: 404 });
  }

  return Response.json(connection);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ connectionId: string }> }
) {
  const { connectionId } = await params;
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

  const parsed = updateConnectionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const result = await updateWhatsappConnectionUseCase(
    supabase,
    user.id,
    connectionId,
    parsed.data
  );

  if ("code" in result) {
    const statusMap: Record<string, number> = {
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      ALREADY_ARCHIVED: 409,
    };
    return Response.json(result, { status: statusMap[result.code] ?? 400 });
  }

  return Response.json(result);
}
