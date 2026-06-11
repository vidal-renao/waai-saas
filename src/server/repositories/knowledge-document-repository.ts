import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  WaaiKnowledgeDocument,
  WaaiKnowledgeDocumentStatus,
  WaaiKnowledgeSourceType,
} from "@/types/database";

type Client = SupabaseClient<Database>;

export interface CreateKnowledgeDocumentInput {
  workspaceId: string;
  uploadedBy: string;
  title: string;
  description?: string | null;
  sourceType: WaaiKnowledgeSourceType;
  textContent: string;
}

export class KnowledgeDocumentRepository {
  constructor(private readonly db: Client) {}

  async findById(id: string): Promise<WaaiKnowledgeDocument | null> {
    const { data, error } = await this.db
      .from("waai_knowledge_documents")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return null;
    return data;
  }

  async findByWorkspace(
    workspaceId: string,
    limit = 50
  ): Promise<WaaiKnowledgeDocument[]> {
    const { data, error } = await this.db
      .from("waai_knowledge_documents")
      .select("*")
      .eq("workspace_id", workspaceId)
      .neq("status", "archived")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error)
      throw new Error(`KnowledgeDocumentRepository.findByWorkspace: ${error.message}`);
    return data ?? [];
  }

  async create(input: CreateKnowledgeDocumentInput): Promise<WaaiKnowledgeDocument> {
    const { data, error } = await this.db
      .from("waai_knowledge_documents")
      .insert({
        workspace_id: input.workspaceId,
        uploaded_by: input.uploadedBy,
        title: input.title,
        description: input.description ?? null,
        source_type: input.sourceType,
        text_content: input.textContent,
        status: "draft",
      })
      .select()
      .single();
    if (error)
      throw new Error(`KnowledgeDocumentRepository.create: ${error.message}`);
    return data;
  }

  async updateStatus(
    id: string,
    status: WaaiKnowledgeDocumentStatus,
    errorMessage?: string | null
  ): Promise<void> {
    const { error } = await this.db
      .from("waai_knowledge_documents")
      .update({
        status,
        error_message: errorMessage ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error)
      throw new Error(`KnowledgeDocumentRepository.updateStatus: ${error.message}`);
  }

  async archive(id: string): Promise<void> {
    return this.updateStatus(id, "archived");
  }
}
