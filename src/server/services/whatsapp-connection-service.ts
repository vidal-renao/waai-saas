import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiWhatsappConnection, WaaiWorkspaceRole } from "@/types/database";
import { WhatsappConnectionRepository } from "@/server/repositories/whatsapp-connection-repository";
import { WhatsappConnectionEventRepository } from "@/server/repositories/whatsapp-connection-event-repository";
import type { CreateConnectionInput, UpdateConnectionInput } from "@/server/repositories/whatsapp-connection-repository";

type Client = SupabaseClient<Database>;

const MANAGE_ROLES: WaaiWorkspaceRole[] = ["owner", "admin"];

export type ConnectionErrorCode =
  | "FORBIDDEN"
  | "LIMIT_REACHED"
  | "NOT_FOUND"
  | "ALREADY_ARCHIVED";

export interface ConnectionError {
  error: string;
  code: ConnectionErrorCode;
}

export class WhatsappConnectionService {
  private readonly connRepo: WhatsappConnectionRepository;
  private readonly eventRepo: WhatsappConnectionEventRepository;

  constructor(private readonly db: Client) {
    this.connRepo = new WhatsappConnectionRepository(db);
    this.eventRepo = new WhatsappConnectionEventRepository(db);
  }

  async listConnections(workspaceId: string): Promise<WaaiWhatsappConnection[]> {
    return this.connRepo.findByWorkspace(workspaceId);
  }

  async getConnection(
    connectionId: string
  ): Promise<WaaiWhatsappConnection | null> {
    return this.connRepo.findById(connectionId);
  }

  async createConnection(
    workspaceId: string,
    userId: string,
    userRole: WaaiWorkspaceRole,
    input: Omit<CreateConnectionInput, "workspaceId" | "createdBy">
  ): Promise<WaaiWhatsappConnection | ConnectionError> {
    if (!MANAGE_ROLES.includes(userRole)) {
      return { error: "No tienes permisos para crear conexiones WhatsApp.", code: "FORBIDDEN" };
    }

    const { data: canCreate } = await this.db.rpc(
      "waai_can_create_whatsapp_connection",
      { p_workspace_id: workspaceId }
    );
    if (!canCreate) {
      return {
        error: "Has alcanzado el límite de conexiones WhatsApp de tu plan. Actualiza para continuar.",
        code: "LIMIT_REACHED",
      };
    }

    const connection = await this.connRepo.create({
      ...input,
      workspaceId,
      createdBy: userId,
    });

    await this.eventRepo.log(workspaceId, connection.id, userId, "connection_created", {
      provider: connection.provider,
      display_name: connection.display_name,
    });

    return connection;
  }

  async updateConnection(
    connectionId: string,
    userId: string,
    userRole: WaaiWorkspaceRole,
    input: UpdateConnectionInput
  ): Promise<WaaiWhatsappConnection | ConnectionError> {
    if (!MANAGE_ROLES.includes(userRole)) {
      return { error: "No tienes permisos para editar conexiones WhatsApp.", code: "FORBIDDEN" };
    }

    const existing = await this.connRepo.findById(connectionId);
    if (!existing) {
      return { error: "Conexión no encontrada.", code: "NOT_FOUND" };
    }
    if (existing.status === "archived") {
      return { error: "No se puede editar una conexión archivada.", code: "ALREADY_ARCHIVED" };
    }

    const updated = await this.connRepo.update(connectionId, input);

    await this.eventRepo.log(existing.workspace_id, connectionId, userId, "connection_updated", {
      changes: Object.keys(input),
    });

    return updated;
  }

  async archiveConnection(
    connectionId: string,
    userId: string,
    userRole: WaaiWorkspaceRole
  ): Promise<void | ConnectionError> {
    if (!MANAGE_ROLES.includes(userRole)) {
      return { error: "No tienes permisos para archivar conexiones.", code: "FORBIDDEN" };
    }

    const existing = await this.connRepo.findById(connectionId);
    if (!existing) return { error: "Conexión no encontrada.", code: "NOT_FOUND" };
    if (existing.status === "archived") return;

    await this.connRepo.updateStatus(connectionId, "archived");
    await this.eventRepo.log(
      existing.workspace_id,
      connectionId,
      userId,
      "connection_disconnected",
      { reason: "archived_by_user" }
    );
  }
}
