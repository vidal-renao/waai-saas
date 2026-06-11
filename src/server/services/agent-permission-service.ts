import type { WaaiWorkspaceRole } from "@/types/database";

export type AgentAction =
  | "read"
  | "create"
  | "edit"
  | "activate"
  | "pause"
  | "archive"
  | "generate_prompt";

export class AgentPermissionService {
  canPerformAction(role: WaaiWorkspaceRole, action: AgentAction): boolean {
    switch (action) {
      case "read":
        return true;
      case "create":
      case "edit":
      case "activate":
      case "pause":
      case "generate_prompt":
        return ["owner", "admin", "agent_manager"].includes(role);
      case "archive":
        return ["owner", "admin"].includes(role);
      default:
        return false;
    }
  }
}
