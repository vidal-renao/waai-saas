import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiKnowledgeDocument } from "@/types/database";
import { KnowledgeDocumentRepository } from "@/server/repositories/knowledge-document-repository";
import { KnowledgeEventRepository } from "@/server/repositories/knowledge-event-repository";
import type { WaaiKnowledgeSourceType } from "@/types/database";

type Client = SupabaseClient<Database>;

export type DocumentLimitError = { error: string; code: "DOCUMENT_LIMIT" };
export type DocumentNotFoundError = { error: string; code: "NOT_FOUND" };

export class KnowledgeDocumentService {
  private readonly docRepo: KnowledgeDocumentRepository;
  private readonly eventRepo: KnowledgeEventRepository;

  constructor(private readonly db: Client) {
    this.docRepo = new KnowledgeDocumentRepository(db);
    this.eventRepo = new KnowledgeEventRepository(db);
  }

  async canUpload(workspaceId: string): Promise<boolean> {
    const { data } = await this.db.rpc("waai_can_upload_document", {
      p_workspace_id: workspaceId,
    });
    return data === true;
  }

  async getDocumentCount(workspaceId: string): Promise<number> {
    const { data } = await this.db.rpc("waai_get_document_count", {
      p_workspace_id: workspaceId,
    });
    return (data as number) ?? 0;
  }

  async createDocument(input: {
    workspaceId: string;
    userId: string;
    title: string;
    description?: string | null;
    sourceType: WaaiKnowledgeSourceType;
    textContent: string;
  }): Promise<WaaiKnowledgeDocument | DocumentLimitError> {
    const canUpload = await this.canUpload(input.workspaceId);
    if (!canUpload) {
      return {
        error: "Has alcanzado el límite de documentos de tu plan. Actualiza para añadir más.",
        code: "DOCUMENT_LIMIT",
      };
    }

    const doc = await this.docRepo.create({
      workspaceId: input.workspaceId,
      uploadedBy: input.userId,
      title: input.title,
      description: input.description,
      sourceType: input.sourceType,
      textContent: input.textContent,
    });

    await this.eventRepo.log({
      workspaceId: input.workspaceId,
      documentId: doc.id,
      actorUserId: input.userId,
      eventType: "document_created",
      metadata: { source_type: input.sourceType, title: input.title },
    });

    return doc;
  }

  async listDocuments(workspaceId: string): Promise<WaaiKnowledgeDocument[]> {
    return this.docRepo.findByWorkspace(workspaceId);
  }

  async getDocument(
    id: string,
    workspaceId: string
  ): Promise<WaaiKnowledgeDocument | null> {
    const doc = await this.docRepo.findById(id);
    if (!doc || doc.workspace_id !== workspaceId) return null;
    return doc;
  }

  async archiveDocument(
    id: string,
    workspaceId: string,
    userId: string
  ): Promise<void | DocumentNotFoundError> {
    const doc = await this.docRepo.findById(id);
    if (!doc || doc.workspace_id !== workspaceId) {
      return { error: "Documento no encontrado.", code: "NOT_FOUND" };
    }
    await this.docRepo.archive(id);
    await this.eventRepo.log({
      workspaceId,
      documentId: id,
      actorUserId: userId,
      eventType: "document_archived",
    });
  }
}
