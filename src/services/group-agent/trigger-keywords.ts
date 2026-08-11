/**
 * Arquivo: src/services/group-agent/trigger-keywords.ts
 * Propósito: Normalizar gatilhos do agente de grupo.
 */

function uniqueKeywords(keywords: string[]): string[] {
  return Array.from(new Set(keywords.map((keyword) => keyword.trim()).filter(Boolean)));
}

export function expandTriggerKeywords(triggerKeywords: string[]): string[] {
  const expanded = triggerKeywords.flatMap((keyword) => {
    const trimmed = keyword.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith("@") && trimmed.length > 1) {
      return [trimmed, `/${trimmed.slice(1)}`];
    }

    return [trimmed];
  });

  return uniqueKeywords(expanded);
}

export function stripTriggerKeyword(message: string, triggerKeywords: string[]): string {
  let cleaned = message.trim();

  for (const keyword of expandTriggerKeywords(triggerKeywords)) {
    const lower = cleaned.toLowerCase();
    const kwLower = keyword.toLowerCase().trim();

    if (lower.startsWith(kwLower)) {
      cleaned = cleaned.slice(kwLower.length).trim();
      if (cleaned.startsWith(",") || cleaned.startsWith(":")) {
        cleaned = cleaned.slice(1).trim();
      }
      break;
    }
  }

  return cleaned;
}
