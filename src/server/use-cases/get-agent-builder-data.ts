import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  WaaiAgent,
  WaaiAgentConfig,
  WaaiAgentPromptVersion,
  WaaiAgentQuestion,
  WaaiWorkspaceRole,
} from "@/types/database";
import { WorkspaceMembersRepository } from "@/server/repositories/workspace-members.repository";
import { AgentRepository } from "@/server/repositories/agent-repository";
import { AgentConfigRepository } from "@/server/repositories/agent-config-repository";
import { AgentPromptVersionRepository } from "@/server/repositories/agent-prompt-version-repository";
import { AgentQuestionRepository } from "@/server/repositories/agent-question-repository";

type Client = SupabaseClient<Database>;

export interface AgentBuilderData {
  agent: WaaiAgent;
  config: WaaiAgentConfig | null;
  promptVersions: WaaiAgentPromptVersion[];
  activePrompt: WaaiAgentPromptVersion | null;
  questions: WaaiAgentQuestion[];
  userRole: WaaiWorkspaceRole;
}

export async function getAgentBuilderDataUseCase(
  db: Client,
  userId: string,
  agentId: string
): Promise<AgentBuilderData | null> {
  const membersRepo = new WorkspaceMembersRepository(db);
  const workspaceId = await membersRepo.getUserWorkspaceId(userId);
  if (!workspaceId) return null;

  const membership = await membersRepo.findMembership(workspaceId, userId);
  if (!membership) return null;

  const agentRepo = new AgentRepository(db);
  const agent = await agentRepo.findById(agentId);
  if (!agent || agent.workspace_id !== workspaceId) return null;

  const agentConfigRepo = new AgentConfigRepository(db);
  const promptVersionRepo = new AgentPromptVersionRepository(db);
  const questionRepo = new AgentQuestionRepository(db);

  const [config, promptVersions, activePrompt, questions] = await Promise.all([
    agentConfigRepo.findByAgent(agentId),
    promptVersionRepo.findByAgent(agentId),
    promptVersionRepo.findActiveByAgent(agentId),
    questionRepo.findAll(),
  ]);

  return {
    agent,
    config,
    promptVersions,
    activePrompt,
    questions,
    userRole: membership.role,
  };
}
