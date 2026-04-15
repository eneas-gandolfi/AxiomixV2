/**
 * Arquivo: src/services/group-agent/sender.ts
 * Propósito: Enviar respostas do agente IA ao grupo WhatsApp via Evolution API.
 * Autor: AXIOMIX
 * Data: 2026-03-21
 */

import "server-only";

import {
  resolveEvolutionCredentials,
  sendEvolutionTextMessage,
} from "@/services/integrations/evolution";

const MAX_WHATSAPP_LENGTH = 4000;

/**
 * Verifica se um corte na posição `index` (exclusivo) deixaria
 * um par de formatação WhatsApp aberto (`*negrito*` ou `_itálico_`).
 * Retorna true se o corte está dentro de formatação ainda não fechada.
 */
export function isInsideFormatting(text: string, index: number): boolean {
  let insideBold = false;
  let insideItalic = false;
  let prev = "";

  for (let i = 0; i < index; i++) {
    const ch = text[i];
    // Considerar apenas caracteres não precedidos por \ (escape)
    const isEscaped = prev === "\\";
    if (!isEscaped) {
      if (ch === "*") insideBold = !insideBold;
      else if (ch === "_") insideItalic = !insideItalic;
    }
    prev = ch;
  }

  return insideBold || insideItalic;
}

/**
 * Acha a posição segura para cortar o texto perto de `target`
 * sem quebrar formatação. Recua até achar um ponto seguro.
 */
function findSafeSplit(text: string, target: number): number {
  if (target >= text.length) return text.length;
  if (!isInsideFormatting(text, target)) return target;

  // Recua até achar ponto seguro
  for (let i = target - 1; i > target * 0.5; i--) {
    if (!isInsideFormatting(text, i)) return i;
  }

  // Se não achou, corta exatamente no target (último recurso)
  return target;
}

export function splitResponse(text: string): string[] {
  if (text.length <= MAX_WHATSAPP_LENGTH) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > MAX_WHATSAPP_LENGTH) {
    // Tentar cortar em \n (preferido)
    let splitIndex = remaining.lastIndexOf("\n", MAX_WHATSAPP_LENGTH);
    if (splitIndex < MAX_WHATSAPP_LENGTH * 0.5) {
      splitIndex = remaining.lastIndexOf(". ", MAX_WHATSAPP_LENGTH);
      if (splitIndex > 0) splitIndex += 1; // incluir o ponto no chunk anterior
    }
    if (splitIndex < MAX_WHATSAPP_LENGTH * 0.3) {
      splitIndex = MAX_WHATSAPP_LENGTH;
    }

    // Garantir que o corte não quebra formatação
    splitIndex = findSafeSplit(remaining, splitIndex);

    chunks.push(remaining.slice(0, splitIndex).trim());
    remaining = remaining.slice(splitIndex).trim();
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }

  return chunks;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendPresenceComposing(
  credentials: { baseUrl: string; apiKey: string },
  instanceName: string,
  groupJid: string
): Promise<void> {
  try {
    const url = `${credentials.baseUrl}/chat/updatePresence/${encodeURIComponent(instanceName)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        apikey: credentials.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        number: groupJid,
        presence: "composing",
      }),
    });

    if (!response.ok) {
      console.warn("[group-agent/sender] Falha ao enviar presence composing:", response.status);
    }
  } catch (err) {
    console.warn("[group-agent/sender] Erro ao enviar presence (best-effort):", err instanceof Error ? err.message : err);
  }
}

export async function sendGroupAgentResponse(input: {
  instanceName: string;
  groupJid: string;
  responseText: string;
}): Promise<{ success: boolean; evolutionStatus: string }> {
  const credentials = resolveEvolutionCredentials();
  const chunks = splitResponse(input.responseText);

  let lastStatus = "sent";

  for (let i = 0; i < chunks.length; i++) {
    // Enviar "digitando..." antes de cada chunk
    await sendPresenceComposing(credentials, input.instanceName, input.groupJid);
    await delay(1500);

    try {
      await sendEvolutionTextMessage({
        credentials,
        instanceName: input.instanceName,
        number: input.groupJid,
        text: chunks[i],
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Erro desconhecido";
      console.error(`[group-agent/sender] Falha ao enviar chunk ${i + 1}/${chunks.length}:`, detail);
      lastStatus = "failed";
      return { success: false, evolutionStatus: `failed: ${detail.slice(0, 100)}` };
    }

    if (i < chunks.length - 1) {
      await delay(1000);
    }
  }

  return { success: true, evolutionStatus: lastStatus };
}
