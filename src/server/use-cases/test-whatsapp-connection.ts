import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiWorkspaceRole } from "@/types/database";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { WhatsappConnectionRepository } from "@/server/repositories/whatsapp-connection-repository";
import { createWhatsAppProvider } from "@/lib/whatsapp/whatsapp-provider-factory";

type Client = SupabaseClient<Database>;

export interface TestConnectionResult {
  success: boolean;
  status: string;
  provider: string;
  errorMessage?: string;
}

const ALLOWED_ROLES: WaaiWorkspaceRole[] = ["owner", "admin", "agent_manager"];

export async function testWhatsappConnectionUseCase(
  db: Client,
  userId: string,
  connectionId: string
): Promise<TestConnectionResult | { error: string; code: string }> {
  const membersRepo = new WorkspaceMembersRepository(db);
  const workspaceId = await membersRepo.getUserWorkspaceId(userId);
  if (!workspaceId) return { error: "Workspace no encontrado.", code: "FORBIDDEN" };

  const membership = await membersRepo.findMembership(workspaceId, userId);
  if (!membership || !ALLOWED_ROLES.includes(membership.role as WaaiWorkspaceRole)) {
    return { error: "No tienes permisos para probar conexiones.", code: "FORBIDDEN" };
  }

  const connRepo = new WhatsappConnectionRepository(db);
  const connection = await connRepo.findById(connectionId);

  if (!connection || connection.workspace_id !== workspaceId) {
    return { error: "Conexión no encontrada.", code: "NOT_FOUND" };
  }

  let provider;
  try {
    // Use provider from env, but fall back to mock if WHATSAPP_PROVIDER differs
    provider = createWhatsAppProvider();
  } catch {
    return { error: "Provider no configurado.", code: "NOT_CONFIGURED" };
  }

  const status = await provider.getConnectionStatus(connection);
  return {
    success: status === "active",
    status,
    provider: provider.getProviderName(),
    errorMessage: status !== "active" ? `Connection status: ${status}` : undefined,
  };
}
