import { Injectable } from "@nestjs/common";
import type { AiCapability, AiPlatformStatus, AiToolDefinition } from "./ai.types";

const INITIAL_CAPABILITIES: AiCapability[] = [
  "assistant",
  "receptionist",
  "operations",
  "sports_intelligence",
];

@Injectable()
export class AiService {
  getStatus(): AiPlatformStatus {
    return {
      enabled: process.env.KHLIM_AI_ENABLED === "true",
      capabilities: INITIAL_CAPABILITIES,
      writeActionsEnabled: process.env.KHLIM_AI_WRITE_ACTIONS_ENABLED === "true",
    };
  }

  assertToolAllowed(tool: AiToolDefinition): void {
    const status = this.getStatus();

    if (!status.enabled) {
      throw new Error("KHLIM AI capabilities are disabled");
    }

    if ((tool.risk === "mutate" || tool.risk === "restricted") && !status.writeActionsEnabled) {
      throw new Error(`AI tool ${tool.name} requires write actions to be explicitly enabled`);
    }

    if (tool.risk === "restricted") {
      throw new Error(`AI tool ${tool.name} is restricted and cannot execute autonomously`);
    }
  }
}
