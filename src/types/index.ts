export type WorkspaceStatus = "active" | "paused" | "trial" | "cancelled";

export type WorkspaceRole =
  | "platform_owner"
  | "platform_admin"
  | "agency_owner"
  | "workspace_owner"
  | "workspace_admin"
  | "operator"
  | "viewer";

export type AgentStatus = "draft" | "testing" | "active" | "paused";

export type ConversationStatus =
  | "bot_active"
  | "human_needed"
  | "human_active"
  | "closed"
  | "blocked";

export type MessageDirection = "inbound" | "outbound";

export type MessageSenderType = "customer" | "agent" | "human" | "system";

export type DocumentStatus = "uploaded" | "processing" | "ready" | "failed";

export type LeadStatus = "new" | "qualified" | "contacted" | "won" | "lost";

export type PlanName = "free" | "starter" | "pro" | "agency" | "enterprise";

export type WhatsappProviderName = "whapi" | "meta_cloud" | "twilio";

export type WhatsappConnectionStatus =
  | "sandbox"
  | "connected"
  | "disconnected"
  | "error";
