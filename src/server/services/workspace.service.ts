import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WaaiWorkspace, WaaiWorkspaceRole } from "@/types/database";
import { WorkspacesRepository } from "@/server/repositories/workspaces.repository";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { SubscriptionsRepository } from "@/server/repositories/subscriptions.repository";
import { AuditLogsRepository } from "@/server/repositories/audit-logs.repository";

type Client = SupabaseClient<Database>;

export interface CreateWorkspaceDto {
  name: string;
  businessType?: string;
  country?: string;
}

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

export class WorkspaceService {
  private readonly workspacesRepo: WorkspacesRepository;
  private readonly membersRepo: WorkspaceMembersRepository;
  private readonly subscriptionsRepo: SubscriptionsRepository;
  private readonly auditRepo: AuditLogsRepository;

  constructor(db: Client) {
    this.workspacesRepo = new WorkspacesRepository(db);
    this.membersRepo = new WorkspaceMembersRepository(db);
    this.subscriptionsRepo = new SubscriptionsRepository(db);
    this.auditRepo = new AuditLogsRepository(db);
  }

  async createWorkspace(
    userId: string,
    dto: CreateWorkspaceDto
  ): Promise<WaaiWorkspace> {
    const slug = generateSlug(dto.name);

    // Create workspace
    const workspace = await this.workspacesRepo.create({
      name: dto.name,
      slug,
      businessType: dto.businessType,
      country: dto.country ?? "ES",
      createdBy: userId,
    });

    // Add creator as owner
    await this.membersRepo.addMember(workspace.id, userId, "owner");

    // Create free subscription
    await this.subscriptionsRepo.createFreeSubscription(workspace.id);

    // Audit log
    await this.auditRepo.log({
      workspaceId: workspace.id,
      actorUserId: userId,
      eventType: "workspace.created",
      entityType: "workspace",
      entityId: workspace.id,
      metadata: { name: workspace.name, slug: workspace.slug },
    });

    return workspace;
  }

  async getUserWorkspace(userId: string): Promise<WaaiWorkspace | null> {
    return this.workspacesRepo.findByUserId(userId);
  }

  async getUserRole(
    workspaceId: string,
    userId: string
  ): Promise<WaaiWorkspaceRole | null> {
    const member = await this.membersRepo.findMembership(workspaceId, userId);
    return member?.role ?? null;
  }

  async getWorkspaceWithSubscription(workspaceId: string) {
    const workspace = await this.workspacesRepo.findById(workspaceId);
    if (!workspace) return null;

    const subscription =
      await this.subscriptionsRepo.findByWorkspace(workspaceId);
    const usage =
      await this.subscriptionsRepo.getCurrentMonthUsage(workspaceId);

    return { workspace, subscription, usage };
  }
}
