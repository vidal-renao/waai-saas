import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  WaaiInternalNote,
  WaaiWorkspaceRole,
} from "@/types/database";
import { InternalNoteRepository } from "@/server/repositories/internal-note-repository";
import { ConversationRepository } from "@/server/repositories/conversation-repository";
import { LeadRepository } from "@/server/repositories/lead-repository";
import { ConversationAssignmentRepository } from "@/server/repositories/conversation-assignment-repository";

type Client = SupabaseClient<Database>;

const CAN_CREATE_ROLES: WaaiWorkspaceRole[] = [
  "owner",
  "admin",
  "agent_manager",
  "human_agent",
];

export class InternalNoteService {
  private readonly noteRepo: InternalNoteRepository;
  private readonly convRepo: ConversationRepository;
  private readonly leadRepo: LeadRepository;
  private readonly assignmentRepo: ConversationAssignmentRepository;

  constructor(private readonly db: Client) {
    this.noteRepo = new InternalNoteRepository(db);
    this.convRepo = new ConversationRepository(db);
    this.leadRepo = new LeadRepository(db);
    this.assignmentRepo = new ConversationAssignmentRepository(db);
  }

  async addNote(
    workspaceId: string,
    conversationId: string | null,
    leadId: string | null,
    note: string,
    authorUserId: string,
    userRole: WaaiWorkspaceRole
  ): Promise<WaaiInternalNote> {
    if (!CAN_CREATE_ROLES.includes(userRole)) {
      throw new Error("FORBIDDEN: Insufficient role to add internal note");
    }

    if (!note.trim()) throw new Error("BAD_REQUEST: Note cannot be empty");
    if (note.length > 2000) throw new Error("BAD_REQUEST: Note exceeds 2000 characters");
    if (!conversationId && !leadId) throw new Error("BAD_REQUEST: Note must reference a conversation or lead");

    // Explicit workspace verification (defense-in-depth beyond RLS)
    if (conversationId) {
      const conv = await this.convRepo.findById(conversationId);
      if (!conv || conv.workspace_id !== workspaceId) {
        throw new Error("NOT_FOUND: Conversation not found");
      }
      // human_agent: only on assigned conversations
      if (userRole === "human_agent") {
        const assignment = await this.assignmentRepo.findActiveByConversation(conversationId);
        if (!assignment || assignment.assigned_to !== authorUserId) {
          throw new Error("FORBIDDEN: human_agent can only add notes to their assigned conversations");
        }
      }
    }

    if (leadId) {
      const lead = await this.leadRepo.findById(leadId, workspaceId);
      if (!lead) throw new Error("NOT_FOUND: Lead not found");
    }

    return this.noteRepo.create({
      workspaceId,
      conversationId,
      leadId,
      authorUserId,
      note: note.trim(),
      visibility: "internal",
    });
  }

  async listConversationNotes(conversationId: string): Promise<WaaiInternalNote[]> {
    return this.noteRepo.findByConversation(conversationId);
  }

  async listLeadNotes(leadId: string): Promise<WaaiInternalNote[]> {
    return this.noteRepo.findByLead(leadId);
  }
}
