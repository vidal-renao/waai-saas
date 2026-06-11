export type BillingProvider = "stripe" | "manual" | "system";

export type BillingEventType =
  | "plan_upgraded"
  | "plan_downgraded"
  | "trial_started"
  | "trial_ended"
  | "limit_exceeded"
  | "payment_received"
  | "payment_failed"
  | "subscription_canceled"
  | "subscription_renewed";

export type BillingEventStatus = "received" | "processed" | "failed" | "ignored";

export interface BillingLimitExceededError {
  resource: string;
  limit: number;
  current: number;
  workspaceId: string;
}

export interface UsageSnapshot {
  workspaceId: string;
  periodMonth: string;
  messagesSent: number;
  messagesLimit: number;
  documentsUploaded: number;
  documentsLimit: number;
  agentsCreated: number;
  agentsLimit: number;
  whatsappConnections: number;
  whatsappConnectionsLimit: number;
  membersCount: number;
  planId: string;
  planName: string;
  subscriptionStatus: string;
}

export interface PeriodUsage {
  messages_sent: number;
  documents_uploaded: number;
  agents_created: number;
}
