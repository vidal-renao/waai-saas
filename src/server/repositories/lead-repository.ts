import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  WaaiLead,
  WaaiLeadStatus,
  WaaiLeadPriority,
  WaaiLeadSourceChannel,
} from "@/types/database";

type LeadUpdateRow = Database["public"]["Tables"]["waai_leads"]["Update"];
type Client = SupabaseClient<Database>;

export interface CreateLeadInput {
  workspaceId: string;
  agentId?: string | null;
  conversationId?: string | null;
  sourceChannel?: WaaiLeadSourceChannel;
  status?: WaaiLeadStatus;
  priority?: WaaiLeadPriority;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  companyName?: string | null;
  requestedService?: string | null;
  location?: string | null;
  desiredDate?: string | null;
  budget?: string | null;
  urgency?: string | null;
  summary?: string | null;
  extractedData?: Record<string, unknown>;
  confidenceScore?: number | null;
  assignedTo?: string | null;
  createdBy?: string | null;
}

export interface UpdateLeadInput {
  status?: WaaiLeadStatus;
  priority?: WaaiLeadPriority;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  companyName?: string | null;
  requestedService?: string | null;
  location?: string | null;
  desiredDate?: string | null;
  budget?: string | null;
  urgency?: string | null;
  summary?: string | null;
  extractedData?: Record<string, unknown>;
  confidenceScore?: number | null;
  assignedTo?: string | null;
}

export interface FindLeadsOptions {
  status?: WaaiLeadStatus;
  assignedTo?: string;
  limit?: number;
  offset?: number;
}

export class LeadRepository {
  constructor(private readonly db: Client) {}

  async findById(id: string, workspaceId: string): Promise<WaaiLead | null> {
    const { data, error } = await this.db
      .from("waai_leads")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .single();
    if (error) return null;
    return data;
  }

  async findByWorkspace(
    workspaceId: string,
    opts: FindLeadsOptions = {}
  ): Promise<WaaiLead[]> {
    let query = this.db
      .from("waai_leads")
      .select("*")
      .eq("workspace_id", workspaceId)
      .neq("status", "archived");

    if (opts.status) query = query.eq("status", opts.status);
    if (opts.assignedTo) query = query.eq("assigned_to", opts.assignedTo);

    query = query
      .order("created_at", { ascending: false })
      .limit(opts.limit ?? 50);

    if (opts.offset) query = query.range(opts.offset, opts.offset + (opts.limit ?? 50) - 1);

    const { data, error } = await query;
    if (error) throw new Error(`LeadRepository.findByWorkspace: ${error.message}`);
    return data ?? [];
  }

  async findByConversation(conversationId: string): Promise<WaaiLead | null> {
    const { data, error } = await this.db
      .from("waai_leads")
      .select("*")
      .eq("conversation_id", conversationId)
      .neq("status", "archived")
      .limit(1)
      .single();
    if (error) return null;
    return data;
  }

  async create(input: CreateLeadInput): Promise<WaaiLead> {
    const { data, error } = await this.db
      .from("waai_leads")
      .insert({
        workspace_id: input.workspaceId,
        agent_id: input.agentId ?? null,
        conversation_id: input.conversationId ?? null,
        source_channel: input.sourceChannel ?? "whatsapp",
        status: input.status ?? "new",
        priority: input.priority ?? "medium",
        customer_name: input.customerName ?? null,
        customer_phone: input.customerPhone ?? null,
        customer_email: input.customerEmail ?? null,
        company_name: input.companyName ?? null,
        requested_service: input.requestedService ?? null,
        location: input.location ?? null,
        desired_date: input.desiredDate ?? null,
        budget: input.budget ?? null,
        urgency: input.urgency ?? null,
        summary: input.summary ?? null,
        extracted_data: input.extractedData ?? {},
        confidence_score: input.confidenceScore ?? null,
        assigned_to: input.assignedTo ?? null,
        created_by: input.createdBy ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(`LeadRepository.create: ${error.message}`);
    return data;
  }

  async update(id: string, workspaceId: string, input: UpdateLeadInput): Promise<WaaiLead> {
    const patch: LeadUpdateRow = { updated_at: new Date().toISOString() };
    if (input.status !== undefined) patch.status = input.status;
    if (input.priority !== undefined) patch.priority = input.priority;
    if (input.customerName !== undefined) patch.customer_name = input.customerName;
    if (input.customerPhone !== undefined) patch.customer_phone = input.customerPhone;
    if (input.customerEmail !== undefined) patch.customer_email = input.customerEmail;
    if (input.companyName !== undefined) patch.company_name = input.companyName;
    if (input.requestedService !== undefined) patch.requested_service = input.requestedService;
    if (input.location !== undefined) patch.location = input.location;
    if (input.desiredDate !== undefined) patch.desired_date = input.desiredDate;
    if (input.budget !== undefined) patch.budget = input.budget;
    if (input.urgency !== undefined) patch.urgency = input.urgency;
    if (input.summary !== undefined) patch.summary = input.summary;
    if (input.extractedData !== undefined) patch.extracted_data = input.extractedData;
    if (input.confidenceScore !== undefined) patch.confidence_score = input.confidenceScore;
    if (input.assignedTo !== undefined) patch.assigned_to = input.assignedTo;

    const { data, error } = await this.db
      .from("waai_leads")
      .update(patch)
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .select()
      .single();
    if (error) throw new Error(`LeadRepository.update: ${error.message}`);
    return data;
  }

  async countByWorkspace(workspaceId: string): Promise<number> {
    const { count, error } = await this.db
      .from("waai_leads")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .neq("status", "archived");
    if (error) return 0;
    return count ?? 0;
  }
}
