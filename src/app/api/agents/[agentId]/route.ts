import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAgentBuilderDataUseCase } from "@/server/use-cases/get-agent-builder-data";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { AgentRepository } from "@/server/repositories/agent-repository";
import { AgentPermissionService } from "@/server/services/agent-permission-service";
import { updateAgentSchema } from "@/lib/validators/agent";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { agentId } = await params;
  const data = await getAgentBuilderDataUseCase(supabase, user.id, agentId);

  if (!data) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { agentId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateAgentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 }
    );
  }

  const membersRepo = new WorkspaceMembersRepository(supabase);
  const workspaceId = await membersRepo.getUserWorkspaceId(user.id);
  if (!workspaceId) {
    return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }

  const membership = await membersRepo.findMembership(workspaceId, user.id);
  if (!membership) {
    return NextResponse.json({ error: "Not a workspace member" }, { status: 403 });
  }

  const permService = new AgentPermissionService();
  if (!permService.canPerformAction(membership.role, "edit")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const agentRepo = new AgentRepository(supabase);
  const agent = await agentRepo.findById(agentId);
  if (!agent || agent.workspace_id !== workspaceId) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const updated = await agentRepo.update(agentId, {
    name: parsed.data.name,
    description: parsed.data.description,
    status: parsed.data.status,
    primaryLanguage: parsed.data.primary_language,
  });

  return NextResponse.json({ agent: updated });
}
