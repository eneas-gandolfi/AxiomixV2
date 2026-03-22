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

function splitResponse(text: string): string[] {
  if (text.length <= MAX_WHATSAPP_LENGTH) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > MAX_WHATSAPP_LENGTH) {
    let splitIndex = remaining.lastIndexOf("\n", MAX_WHATSAPP_LENGTH);
    if (splitIndex < MAX_WHATSAPP_LENGTH * 0.5) {
      splitIndex = remaining.lastIndexOf(". ", MAX_WHATSAPP_LENGTH);
    }
    if (splitIndex < MAX_WHATSAPP_LENGTH * 0.3) {
      splitIndex = MAX_WHATSAPP_LENGTH;
    }

    chunks.push(remaining.slice(0, splitIndex + 1).trim());
    remaining = remaining.slice(splitIndex + 1).trim();
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
