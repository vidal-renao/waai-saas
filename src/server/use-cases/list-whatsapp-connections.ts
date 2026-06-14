import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiWhatsappConnection } from "@/types/database";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { WhatsappConnectionService } from "@/server/services/whatsapp-connection-service";

type Client = SupabaseClient<Database>;

export interface ListConnectionsResult {
  connections: WaaiWhatsappConnection[];
  canCreate: boolean;
  connectionCount: number;
}

export async function listWhatsappConnectionsUseCase(
  db: Client,
  userId: string
): Promise<ListConnectionsResult | null> {
  const membersRepo = new WorkspaceMembersRepository(db);
  const workspaceId = await membersRepo.getUserWorkspaceId(userId);
  if (!workspaceId) return null;

  const svc = new WhatsappConnectionService(db);
  const connections = await svc.listConnections(workspaceId);

  const { data: canCreate } = await db.rpc("waai_can_create_whatsapp_connection", {
    p_workspace_id: workspaceId,
  });

  const { data: connectionCount } = await db.rpc("waai_get_whatsapp_connection_count", {
    p_workspace_id: workspaceId,
  });

  const isDev = process.env.NODE_ENV === "development";
  const forceBypass = process.env.NEXT_PUBLIC_BYPASS_WHATSAPP_LIMIT === "true";

  return {
    connections,
    canCreate: (isDev || forceBypass) ? true : (canCreate ?? false),
    connectionCount: connectionCount ?? connections.length,
  };
}
