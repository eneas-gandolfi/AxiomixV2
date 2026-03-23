/**
 * Arquivo: src/types/modules/group-agent.types.ts
 * Propósito: Tipos TypeScript para o módulo de Agente IA de grupo WhatsApp.
 * Autor: AXIOMIX
 * Data: 2026-03-21
 */

import type { Database } from "@/database/types/database.types";

export type GroupAgentConfigRow = Database["public"]["Tables"]["group_agent_configs"]["Row"];
export type GroupAgentConfigInsert = Database["public"]["Tables"]["group_agent_configs"]["Insert"];
export type GroupAgentConfigUpdate = Database["public"]["Tables"]["group_agent_configs"]["Update"];

export type GroupMessageRow = Database["public"]["Tables"]["group_messages"]["Row"];
export type GroupMessageInsert = Database["public"]["Tables"]["group_messages"]["Insert"];

export type GroupAgentResponseRow = Database["public"]["Tables"]["group_agent_responses"]["Row"];
export type GroupAgentResponseInsert = Database["public"]["Tables"]["group_agent_responses"]["Insert"];

export type AgentTone = "profissional" | "casual" | "tecnico";

export type GroupAgentIntent =
  | "summary"
  | "sales_data"
  | "rag_query"
  | "report"
  | "suggestion"
  | "general";

export type GroupAgentResponseType =
  | "reply"
  | "summary"
  | "rag_query"
  | "sales_data"
  | "report"
  | "error";

export type GroupAgentContext = {
  recentMessages: Array<{
    senderName: string;
    content: string;
    sentAt: string;
  }>;
  knowledgeBaseContext: string;
  salesDataContext: string;
  previousResponses: Array<{
    responseText: string;
    responseType: string;
    createdAt: string;
  }>;
};

export type GroupAgentMediaType = "pdf" | "audio" | "image";

export type GroupAgentMediaContent = {
  type: GroupAgentMediaType;
  extractedText: string;
  base64?: string;
  mimetype?: string;
};

export type GroupAgentResponseResult = {
  success: boolean;
  responseText: string;
  responseType: GroupAgentResponseType;
  ragSourcesUsed: number;
  modelUsed: string;
  processingTimeMs: number;
  evolutionStatus: string;
};
