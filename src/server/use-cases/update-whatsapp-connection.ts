import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiWhatsappConnection, WaaiWorkspaceRole } from "@/types/database";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { WhatsappConnectionService } from "@/server/services/whatsapp-connection-service";
import type { ConnectionError } from "@/server/services/whatsapp-connection-service";
import type { UpdateConnectionInput } from "@/server/repositories/whatsapp-connection-repository";

type Client = SupabaseClient<Database>;

export async function updateWhatsappConnectionUseCase(
  db: Client,
  userId: string,
  connectionId: string,
  input: UpdateConnectionInput
): Promise<WaaiWhatsappConnection | ConnectionError> {
  const membersRepo = new WorkspaceMembersRepository(db);
  const workspaceId = await membersRepo.getUserWorkspaceId(userId);
  if (!workspaceId) {
    return { error: "Workspace no encontrado.", code: "FORBIDDEN" };
  }

  const membership = await membersRepo.findMembership(workspaceId, userId);
  if (!membership) {
    return { error: "No eres miembro de este workspace.", code: "FORBIDDEN" };
  }

  const svc = new WhatsappConnectionService(db);
  return svc.updateConnection(connectionId, userId, membership.role as WaaiWorkspaceRole, input);
}
