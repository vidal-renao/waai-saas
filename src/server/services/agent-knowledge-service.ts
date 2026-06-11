import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiAgentKnowledgeSource } from "@/types/database";
import { AgentKnowledgeSourceRepository } from "@/server/repositories/agent-knowledge-source-repository";
import { KnowledgeDocumentRepository } from "@/server/repositories/knowledge-document-repository";
import { AgentRepository } from "@/server/repositories/agent-repository";
import { KnowledgeEventRepository } from "@/server/repositories/knowledge-event-repository";

type Client = SupabaseClient<Database>;

export type LinkError = { error: string; code: "NOT_FOUND" | "NOT_READY" | "FORBIDDEN" };

export class AgentKnowledgeService {
  private readonly sourceRepo: AgentKnowledgeSourceRepository;
  private readonly docRepo: KnowledgeDocumentRepository;
  private readonly agentRepo: AgentRepository;
  private readonly eventRepo: KnowledgeEventRepository;

  constructor(private readonly db: Client) {
    this.sourceRepo = new AgentKnowledgeSourceRepository(db);
    this.docRepo = new KnowledgeDocumentRepository(db);
    this.agentRepo = new AgentRepository(db);
    this.eventRepo = new KnowledgeEventRepository(db);
  }

  async listSources(agentId: string): Promise<WaaiAgentKnowledgeSource[]> {
    return this.sourceRepo.findAll(agentId);
  }

  async linkDocument(input: {
    workspaceId: string;
    agentId: string;
    documentId: string;
    userId: string;
  }): Promise<WaaiAgentKnowledgeSource | LinkError> {
    // Verify agent belongs to workspace
    const agent = await this.agentRepo.findById(input.agentId);
    if (!agent || agent.workspace_id !== input.workspaceId) {
      return { error: "Agente no encontrado.", code: "NOT_FOUND" };
    }

    // Verify document belongs to workspace and is ready
    const doc = await this.docRepo.findById(input.documentId);
    if (!doc || doc.workspace_id !== input.workspaceId) {
      return { error: "Documento no encontrado.", code: "NOT_FOUND" };
    }
    if (doc.status !== "ready") {
      return {
        error: "El documento debe estar procesado (status: ready) antes de vincularlo.",
        code: "NOT_READY",
      };
    }

    const source = await this.sourceRepo.link({
      workspaceId: input.workspaceId,
      agentId: input.agentId,
      documentId: input.documentId,
      createdBy: input.userId,
    });

    await this.eventRepo.log({
      workspaceId: input.workspaceId,
      documentId: input.documentId,
      agentId: input.agentId,
      actorUserId: input.userId,
      eventType: "document_linked_to_agent",
    });

    return source;
  }

  async unlinkDocument(input: {
    workspaceId: string;
    agentId: string;
    documentId: string;
    userId: string;
  }): Promise<void | LinkError> {
    const agent = await this.agentRepo.findById(input.agentId);
    if (!agent || agent.workspace_id !== input.workspaceId) {
      return { error: "Agente no encontrado.", code: "NOT_FOUND" };
    }

    await this.sourceRepo.unlink(input.agentId, input.documentId);

    await this.eventRepo.log({
      workspaceId: input.workspaceId,
      documentId: input.documentId,
      agentId: input.agentId,
      actorUserId: input.userId,
      eventType: "document_unlinked_from_agent",
    });
  }
}
