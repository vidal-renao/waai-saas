import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiWhatsappConnection, WaaiWorkspaceRole } from "@/types/database";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { WhatsappConnectionService } from "@/server/services/whatsapp-connection-service";
import type { ConnectionError } from "@/server/services/whatsapp-connection-service";

type Client = SupabaseClient<Database>;

export interface CreateConnectionData {
  provider?: "mock" | "whapi" | "meta";
  displayName: string;
  phoneNumber?: string;
  phoneNumberId?: string;
  wabaId?: string;
  accessToken?: string;
  externalInstanceId?: string;
  agentId?: string | null;
}

export async function createWhatsappConnectionUseCase(
  db: Client,
  userId: string,
  data: CreateConnectionData
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
  return svc.createConnection(workspaceId, userId, membership.role as WaaiWorkspaceRole, {
    provider: data.provider,
    displayName: data.displayName,
    phoneNumber: data.phoneNumber,
    phoneNumberId: data.phoneNumberId,
    wabaId: data.wabaId,
    accessToken: data.accessToken,
    externalInstanceId: data.externalInstanceId,
    agentId: data.agentId ?? null,
  });
}
