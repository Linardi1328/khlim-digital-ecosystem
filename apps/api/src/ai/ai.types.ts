export type AiCapability = "assistant" | "receptionist" | "operations" | "sports_intelligence";

export type AiToolRisk = "read" | "propose" | "mutate" | "restricted";

export interface AiToolDefinition {
  name: string;
  description: string;
  risk: AiToolRisk;
  requiresApproval: boolean;
}

export interface AiPlatformStatus {
  enabled: boolean;
  capabilities: AiCapability[];
  writeActionsEnabled: boolean;
}
