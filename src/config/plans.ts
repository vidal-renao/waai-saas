import type { PlanName } from "@/types";

export interface PlanConfig {
  name: PlanName;
  agentsLimit: number;
  messagesLimit: number;
  documentsLimit: number;
  whatsappNumbersLimit: number;
  humanHandoffEnabled: boolean;
}

export const PLAN_CONFIGS: Record<PlanName, PlanConfig> = {
  free: {
    name: "free",
    agentsLimit: 1,
    messagesLimit: 100,
    documentsLimit: 3,
    whatsappNumbersLimit: 0,
    humanHandoffEnabled: false,
  },
  starter: {
    name: "starter",
    agentsLimit: 1,
    messagesLimit: 1000,
    documentsLimit: 10,
    whatsappNumbersLimit: 1,
    humanHandoffEnabled: false,
  },
  pro: {
    name: "pro",
    agentsLimit: 3,
    messagesLimit: 10000,
    documentsLimit: 50,
    whatsappNumbersLimit: 3,
    humanHandoffEnabled: true,
  },
  agency: {
    name: "agency",
    agentsLimit: 20,
    messagesLimit: 100000,
    documentsLimit: 500,
    whatsappNumbersLimit: 20,
    humanHandoffEnabled: true,
  },
  enterprise: {
    name: "enterprise",
    agentsLimit: Infinity,
    messagesLimit: Infinity,
    documentsLimit: Infinity,
    whatsappNumbersLimit: Infinity,
    humanHandoffEnabled: true,
  },
};
