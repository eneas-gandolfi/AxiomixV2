/**
 * Arquivo: src/app/api/webhooks/evolution/group/route.ts
 * Propósito: Webhook da Evolution API para receber mensagens de grupos WhatsApp.
 * Autor: AXIOMIX
 * Data: 2026-03-21
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { processGroupAgentResponse } from "@/services/group-agent/responder";
import {
  resolveEvolutionCredentials,
  fetchEvolutionGroups,
  resolvePreferredEvolutionInstance,
  downloadEvolutionMedia,
} from "@/services/integrations/evolution";
import { decodeIntegrationConfig } from "@/lib/integrations/service";
import {
  resolveMediaType,
  isPdfDocument,
  processMediaMessage,
} from "@/services/group-agent/media-processor";
import { applyIpRateLimit } from "@/lib/auth/rate-limit";

export const dynamic = "force-dynamic";

const LOG_PREFIX = "[webhook/group]";

const webhookPayloadSchema = z.object({
  event: z.string(),
  instance: z.string().optional(),
  data: z.object({
    key: z.object({
      remoteJid: z.string(),
      fromMe: z.boolean().optional(),
      id: z.string(),
      participant: z.string().optional(),
    }),
    pushName: z.string().optional(),
    message: z
      .object({
        conversation: z.string().optional(),
        extendedTextMessage: z
          .object({
            text: z.string().optional(),
          })
          .optional(),
        imageMessage: z
          .object({
            caption: z.string().optional(),
            mimetype: z.string().optional(),
            url: z.string().optional(),
          })
          .optional(),
        audioMessage: z
          .object({
            mimetype: z.string().optional(),
            ptt: z.boolean().optional(),
            url: z.string().optional(),
          })
          .optional(),
        documentMessage: z
          .object({
            caption: z.string().optional(),
            mimetype: z.string().optional(),
            fileName: z.string().optional(),
            url: z.string().optional(),
          })
          .optional(),
        documentWithCaptionMessage: z
          .object({
            message: z
              .object({
                documentMessage: z
                  .object({
                    caption: z.string().optional(),
                    mimetype: z.string().optional(),
                    fileName: z.string().optional(),
                    url: z.string().optional(),
                  })
                  .optional(),
              })
              .optional(),
          })
          .optional(),
        stickerMessage: z.object({}).optional(),
      })
      .optional(),
    messageType: z.string().optional(),
    messageTimestamp: z.union([z.number(), z.string()]).optional(),
  }),
});

type ParsedMessage = z.infer<typeof webhookPayloadSchema>["data"]["message"];

function extractTextContent(message: ParsedMessage): string | null {
  if (!message) return null;
  return (
    message.conversation ??
    message.extendedTextMessage?.text ??
    message.imageMessage?.caption ??
    message.documentMessage?.caption ??
    message.documentWithCaptionMessage?.message?.documentMessage?.caption ??
    null
  );
}

function isMediaMessage(message: ParsedMessage): boolean {
  if (!message) return false;
  return !!(
    message.imageMessage ||
    message.audioMessage ||
    message.documentMessage ||
    message.documentWithCaptionMessage?.message?.documentMessage ||
    message.stickerMessage
  );
}

function extractMediaMimetype(message: ParsedMessage): string | null {
  if (!message) return null;
  return (
    message.imageMessage?.mimetype ??
    message.audioMessage?.mimetype ??
    message.documentMessage?.mimetype ??
    message.documentWithCaptionMessage?.message?.documentMessage?.mimetype ??
    null
  );
}

function isGroupJid(jid: string): boolean {
  return jid.endsWith("@g.us");
}

function detectTrigger(content: string, triggerKeywords: string[]): boolean {
  const normalized = content.toLowerCase().trim();
  return triggerKeywords.some((keyword) => {
    const k = keyword.toLowerCase().trim();
    return (
      normalized.startsWith(k) ||
      normalized.includes(` ${k}`) ||
      normalized.includes(`\n${k}`)
    );
  });
}

function resolveTimestamp(raw: number | string | undefined): string {
  if (!raw) return new Date().toISOString();
  const ts = typeof raw === "string" ? Number(raw) : raw;
  if (ts > 1e12) return new Date(ts).toISOString();
  return new Date(ts * 1000).toISOString();
}

/**
 * Normaliza o payload da Evolution API v2 para o formato esperado.
 * - Se `data` for array, usa `data[0]`
 * - Se `instance` for objeto com `instanceName`, extrai como string
 */
function normalizeEvolutionPayload(raw: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...raw };

  // Evolution API v2 pode enviar `data` como array
  if (Array.isArray(normalized.data)) {
    console.log(LOG_PREFIX, "data is array, using data[0]");
    normalized.data = normalized.data[0] ?? {};
  }

  // Evolution API v2 pode enviar `instance` como objeto { instanceName: "..." }
  if (
    normalized.instance &&
    typeof normalized.instance === "object" &&
    !Array.isArray(normalized.instance) &&
    "instanceName" in (normalized.instance as Record<string, unknown>)
  ) {
    const instanceObj = normalized.instance as Record<string, unknown>;
    console.log(LOG_PREFIX, "instance is object, extracting instanceName:", instanceObj.instanceName);
    normalized.instance = instanceObj.instanceName as string;
  }

  return normalized;
}

/**
 * Tenta buscar o nome real do grupo via Evolution API.
 * Retorna null se falhar (best-effort).
 */
async function fetchGroupNameFromApi(
  groupJid: string,
  companyId: string,
  supabase: ReturnType<typeof createSupabaseAdminClient>
): Promise<string | null> {
  try {
    const { data: integration } = await supabase
      .from("integrations")
      .select("config")
      .eq("company_id", companyId)
      .eq("type", "evolution_api")
      .eq("is_active", true)
      .maybeSingle();

    if (!integration?.config) return null;

    const decoded = decodeIntegrationConfig("evolution_api", integration.config);
    const credentials = resolveEvolutionCredentials({
      baseUrl: decoded.baseUrl,
      apiKey: decoded.apiKey,
    });

    const instanceName =
      resolvePreferredEvolutionInstance(decoded.vendors) ??
      process.env.EVOLUTION_INSTANCE_NAME?.trim() ??
      "axiomix-default";

    const groups = await fetchEvolutionGroups({ credentials, instanceName });
    const match = groups.find((g) => g.id === groupJid);

    if (match) {
      console.log(LOG_PREFIX, "Nome real do grupo obtido via API:", match.subject);
      return match.subject;
    }
  } catch (err) {
    console.warn(LOG_PREFIX, "Falha ao buscar nome do grupo via API (best-effort):", err instanceof Error ? err.message : err);
  }
  return null;
}

/**
 * Status map da Evolution API.
 * 1=PENDING, 2=SENT (server ACK), 3=DELIVERED (device), 4=READ (blue ticks)
 */
const EVOLUTION_STATUS_MAP: Record<number, string> = {
  2: "sent_to_provider",
  3: "delivered",
  4: "read",
};

/**
 * Trata evento messages.update — atualiza delivery_status em campaign_recipients.
 */
async function handleMessageStatusUpdate(
  rawData: unknown,
  supabase: ReturnType<typeof createSupabaseAdminClient>
): Promise<NextResponse> {
  const items = Array.isArray(rawData) ? rawData : [rawData];
  let updated = 0;

  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;

    const key = rec.key as Record<string, unknown> | undefined;
    const statusNum = typeof rec.status === "number" ? rec.status : null;

    if (!key || !statusNum) continue;

    const messageId = typeof key.id === "string" ? key.id : null;
    if (!messageId) continue;

    const deliveryStatus = EVOLUTION_STATUS_MAP[statusNum];
    if (!deliveryStatus) continue;

    const { error, count } = await supabase
      .from("campaign_recipients")
      .update({
        delivery_status: deliveryStatus,
        delivery_updated_at: new Date().toISOString(),
      })
      .eq("provider_message_id", messageId);

    if (!error && count && count > 0) {
      updated++;
    }
  }

  if (updated > 0) {
    console.log(LOG_PREFIX, `Delivery status atualizado para ${updated} recipient(s)`);
  }

  return NextResponse.json({ ok: true, delivery_updated: updated });
}

/**
 * Trata evento groups.upsert — atualiza o nome do grupo no banco.
 */
async function handleGroupsUpsert(
  rawData: unknown,
  supabase: ReturnType<typeof createSupabaseAdminClient>
): Promise<NextResponse> {
  const items = Array.isArray(rawData) ? rawData : [rawData];

  let updated = 0;
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const id = typeof rec.id === "string" ? rec.id : null;
    const subject = typeof rec.subject === "string" ? rec.subject : null;

    if (!id || !subject || !id.endsWith("@g.us")) continue;

    const { error } = await supabase
      .from("group_agent_configs")
      .update({ group_name: subject })
      .eq("group_jid", id);

    if (!error) {
      updated++;
      console.log(LOG_PREFIX, "group_name atualizado via GROUPS_UPSERT", { jid: id, subject });
    }
  }

  return NextResponse.json({ ok: true, groups_updated: updated });
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const rateLimited = applyIpRateLimit(request, "webhook:group", 120, 60);
    if (rateLimited) return rateLimited;

    const url = request.nextUrl.toString();
    const token = request.nextUrl.searchParams.get("token");
    const cidParam = request.nextUrl.searchParams.get("cid");

    console.log(LOG_PREFIX, "POST recebido", {
      url: url.replace(/token=[^&]+/, "token=***"),
      cid: cidParam ?? "(none)",
      timestamp: new Date().toISOString(),
    });

    // --- Token validation ---
    const expectedToken = process.env.EVOLUTION_WEBHOOK_API_KEY?.trim();

    if (!expectedToken) {
      console.warn(LOG_PREFIX, "EVOLUTION_WEBHOOK_API_KEY não definido no servidor!");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (token !== expectedToken) {
      console.warn(LOG_PREFIX, "Token mismatch", {
        received: token ? `${token.slice(0, 6)}...` : "(empty)",
        expected: `${expectedToken.slice(0, 6)}...`,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // --- Parse body ---
    const rawBody: unknown = await request.json().catch((err) => {
      console.error(LOG_PREFIX, "Falha ao parsear JSON body:", err);
      return null;
    });

    if (!rawBody) {
      console.warn(LOG_PREFIX, "Body vazio ou JSON inválido");
      return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
    }

    // Log top-level keys and event
    const topKeys = typeof rawBody === "object" && rawBody !== null ? Object.keys(rawBody) : [];
    const rawEvent = typeof rawBody === "object" && rawBody !== null ? (rawBody as Record<string, unknown>).event : undefined;
    console.log(LOG_PREFIX, "Raw payload recebido", {
      topKeys,
      event: rawEvent,
      dataIsArray: Array.isArray((rawBody as Record<string, unknown>).data),
      instanceType: typeof (rawBody as Record<string, unknown>).instance,
    });

    // --- Handle groups.upsert event (update group names) ---
    if (rawEvent === "groups.upsert") {
      console.log(LOG_PREFIX, "Evento GROUPS_UPSERT recebido");
      const supabase = createSupabaseAdminClient();
      return handleGroupsUpsert((rawBody as Record<string, unknown>).data, supabase);
    }

    // --- Handle messages.update event (delivery status tracking) ---
    if (rawEvent === "messages.update") {
      const supabase = createSupabaseAdminClient();
      return handleMessageStatusUpdate((rawBody as Record<string, unknown>).data, supabase);
    }

    // --- Ignore connection.update events (no message payload) ---
    if (rawEvent === "connection.update") {
      return NextResponse.json({ ok: true, skipped: "connection_update" });
    }

    // --- Normalize payload ---
    const normalizedBody = typeof rawBody === "object" && rawBody !== null
      ? normalizeEvolutionPayload(rawBody as Record<string, unknown>)
      : rawBody;

    const parsed = webhookPayloadSchema.safeParse(normalizedBody);

    if (!parsed.success) {
      console.warn(LOG_PREFIX, "Zod parse falhou", {
        errors: parsed.error.issues.map((e) => ({ path: e.path.join("."), message: e.message })),
        bodyPreview: JSON.stringify(normalizedBody).slice(0, 500),
      });
      return NextResponse.json({ ok: true, skipped: "payload_invalid" });
    }

    const { data } = parsed.data;
    let remoteJid = data.key.remoteJid;

    // Para mensagens fromMe em grupo, a Evolution API pode enviar o JID individual
    // em remoteJid e o JID do grupo em "destination" (top-level)
    const rawDestination =
      typeof rawBody === "object" && rawBody !== null
        ? (rawBody as Record<string, unknown>).destination
        : undefined;
    const destination = typeof rawDestination === "string" ? rawDestination : null;

    if (data.key.fromMe && !isGroupJid(remoteJid) && destination && isGroupJid(destination)) {
      console.log(LOG_PREFIX, "fromMe com remoteJid individual, usando destination como grupo", {
        originalRemoteJid: remoteJid,
        destination,
      });
      remoteJid = destination;
    }

    console.log(LOG_PREFIX, "Parse OK", {
      event: parsed.data.event,
      instance: parsed.data.instance,
      remoteJid,
      fromMe: data.key.fromMe,
      hasContent: !!(data.message?.conversation || data.message?.extendedTextMessage?.text),
      hasMedia: isMediaMessage(data.message),
      messageType: data.messageType,
      participant: data.key.participant,
      pushName: data.pushName,
      destination,
    });

    // --- Group check ---
    if (!isGroupJid(remoteJid)) {
      console.log(LOG_PREFIX, "Ignorando: não é grupo", { remoteJid, destination });
      return NextResponse.json({ ok: true, skipped: "not_group" });
    }

    if (data.key.fromMe) {
      // Verificar se é eco de resposta do bot (anti-loop) ou mensagem manual do dono
      const msgContent = extractTextContent(data.message);
      const supabaseCheck = createSupabaseAdminClient();
      const thirtySecondsAgo = new Date(Date.now() - 30_000).toISOString();

      const { data: recentBotResponse } = await supabaseCheck
        .from("group_agent_responses")
        .select("response_text")
        .eq("group_jid", remoteJid)
        .gte("created_at", thirtySecondsAgo)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentBotResponse && msgContent) {
        const normalizedMsg = msgContent.trim().toLowerCase();
        const normalizedBot = recentBotResponse.response_text.trim().toLowerCase();

        if (normalizedBot.includes(normalizedMsg) || normalizedMsg.includes(normalizedBot)) {
          console.log(LOG_PREFIX, "Ignorando: eco de resposta do bot (fromMe + match)", { remoteJid });
          return NextResponse.json({ ok: true, skipped: "bot_echo" });
        }
      }

      // Sem conteúdo de texto (sticker, etc) e fromMe → ignorar
      if (!msgContent) {
        console.log(LOG_PREFIX, "Ignorando: fromMe sem conteúdo de texto", { remoteJid });
        return NextResponse.json({ ok: true, skipped: "from_me_no_content" });
      }

      console.log(LOG_PREFIX, "fromMe=true mas não é eco do bot, processando como mensagem do dono", { remoteJid });
    }

    const senderJid = data.key.participant ?? data.key.remoteJid;
    const content = extractTextContent(data.message);
    const messageId = data.key.id;
    const senderName = data.pushName ?? null;
    const messageType = data.messageType ?? "text";
    const sentAt = resolveTimestamp(data.messageTimestamp);

    const supabase = createSupabaseAdminClient();

    // --- Resolve company_id ---
    let resolvedCompanyId: string | null = null;

    if (cidParam) {
      const { data: cidIntegration } = await supabase
        .from("integrations")
        .select("company_id")
        .eq("company_id", cidParam)
        .eq("type", "evolution_api")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (!cidIntegration) {
        console.warn(LOG_PREFIX, "cid inválido: nenhuma integração evolution_api ativa para company_id", { cid: cidParam });
        return NextResponse.json({ ok: true, skipped: "invalid_cid" });
      }
      resolvedCompanyId = cidIntegration.company_id;
      console.log(LOG_PREFIX, "company_id via cid param:", resolvedCompanyId);
    }

    // --- Config lookup ---
    const configQuery = supabase
      .from("group_agent_configs")
      .select("id, company_id, trigger_keywords, is_active, group_name")
      .eq("group_jid", remoteJid)
      .limit(1);

    if (resolvedCompanyId) {
      configQuery.eq("company_id", resolvedCompanyId);
    }

    let { data: config } = await configQuery.maybeSingle();

    // --- Auto-register group ---
    if (!config) {
      console.log(LOG_PREFIX, "Grupo não encontrado, tentando auto-registrar", { remoteJid });

      let companyId: string;

      if (resolvedCompanyId) {
        companyId = resolvedCompanyId;
      } else {
        const { data: integration } = await supabase
          .from("integrations")
          .select("company_id")
          .eq("type", "evolution_api")
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();

        if (!integration?.company_id) {
          console.warn(LOG_PREFIX, "Nenhuma integração evolution_api ativa encontrada! Grupo não pode ser registrado.", {
            remoteJid,
          });
          return NextResponse.json({ ok: true, skipped: "no_company" });
        }
        companyId = integration.company_id;
        console.log(LOG_PREFIX, "company_id via fallback (primeira integração ativa):", companyId);
      }

      // Tentar buscar o nome real do grupo via Evolution API
      const realGroupName = await fetchGroupNameFromApi(remoteJid, companyId, supabase);
      const groupName = realGroupName ?? `Grupo ${remoteJid.split("@")[0].slice(-6)}`;

      const { data: newConfig, error: upsertError } = await supabase
        .from("group_agent_configs")
        .upsert(
          {
            company_id: companyId,
            group_jid: remoteJid,
            group_name: groupName,
            is_active: false,
          },
          { onConflict: "company_id,group_jid" }
        )
        .select("id, company_id, trigger_keywords, is_active, group_name")
        .maybeSingle();

      if (!newConfig) {
        console.error(LOG_PREFIX, "Auto-register falhou!", {
          remoteJid,
          companyId,
          error: upsertError?.message ?? "sem resposta do upsert",
        });
        return NextResponse.json({ ok: true, skipped: "auto_register_failed" });
      }

      console.log(LOG_PREFIX, "Grupo auto-registrado com sucesso", {
        configId: newConfig.id,
        companyId: newConfig.company_id,
        groupJid: remoteJid,
        groupName: newConfig.group_name,
      });

      config = newConfig;
    }

    // --- Group inactive: save message only ---
    if (!config.is_active) {
      console.log(LOG_PREFIX, "Grupo inativo, salvando mensagem sem processar trigger", {
        configId: config.id,
        remoteJid,
      });

      await supabase.from("group_messages").upsert(
        {
          company_id: config.company_id,
          config_id: config.id,
          group_jid: remoteJid,
          sender_jid: senderJid,
          sender_name: senderName,
          message_id: messageId,
          content,
          message_type: messageType,
          is_trigger: false,
          sent_at: sentAt,
        },
        { onConflict: "company_id,message_id", ignoreDuplicates: true }
      );
      return NextResponse.json({ ok: true, registered: true, active: false });
    }

    // --- Media processing ---
    const hasMedia = isMediaMessage(data.message);
    const mediaMimetype = extractMediaMimetype(data.message);
    let processedContent = content;
    let finalMessageType = messageType;

    // Para áudios, trigger é detectado após transcrição
    // Para imagens/docs, trigger pode estar na caption
    const isTrigger = processedContent ? detectTrigger(processedContent, config.trigger_keywords) : false;
    // Áudios com trigger ou mídia com trigger na caption: precisa processar
    const isMediaTrigger = hasMedia && (isTrigger || messageType.toLowerCase().includes("audio") || messageType.toLowerCase().includes("ptt"));

    if (hasMedia && config.is_active && isMediaTrigger) {
      const mediaType = resolveMediaType(messageType);

      if (mediaType) {
        // Para documentos, só processar se for PDF
        const shouldProcess = mediaType !== "pdf" || (mediaMimetype && isPdfDocument(mediaMimetype));

        if (shouldProcess) {
          console.log(LOG_PREFIX, "Processando mídia", { mediaType, mimetype: mediaMimetype, messageType });

          try {
            // Resolver credenciais da Evolution API
            const { data: integration } = await supabase
              .from("integrations")
              .select("config")
              .eq("company_id", config.company_id)
              .eq("type", "evolution_api")
              .eq("is_active", true)
              .maybeSingle();

            let credentials;
            if (integration?.config) {
              const decoded = decodeIntegrationConfig("evolution_api", integration.config);
              credentials = resolveEvolutionCredentials({
                baseUrl: decoded.baseUrl,
                apiKey: decoded.apiKey,
              });
            } else {
              credentials = resolveEvolutionCredentials();
            }

            const instanceName =
              parsed.data.instance ??
              process.env.EVOLUTION_INSTANCE_NAME?.trim() ??
              "axiomix-default";

            // Baixar mídia via Evolution API
            const mediaDownload = await downloadEvolutionMedia({
              credentials,
              instanceName,
              messageKey: {
                remoteJid: data.key.remoteJid,
                id: data.key.id,
                fromMe: data.key.fromMe,
                participant: data.key.participant,
              },
            });

            // Processar mídia
            const mediaResult = await processMediaMessage(
              config.company_id,
              mediaType,
              mediaDownload.base64,
              mediaDownload.mimetype
            );

            // Montar conteúdo processado
            const prefix =
              mediaType === "pdf" ? "[PDF]" :
              mediaType === "audio" ? "[ÁUDIO]" :
              "[IMAGEM]";

            processedContent = `${prefix} ${mediaResult.extractedText}`;
            finalMessageType = `${messageType}_processed`;

            console.log(LOG_PREFIX, "Mídia processada com sucesso", {
              mediaType,
              extractedLength: mediaResult.extractedText.length,
            });

            // Para áudios, re-verificar trigger na transcrição
            if (mediaType === "audio" && !isTrigger) {
              const audioHasTrigger = detectTrigger(mediaResult.extractedText, config.trigger_keywords);
              if (!audioHasTrigger) {
                console.log(LOG_PREFIX, "Áudio transcrito mas sem trigger, salvando sem responder");
              }
            }
          } catch (err) {
            console.error(LOG_PREFIX, "Falha ao processar mídia:", err instanceof Error ? err.message : err);
            // Salvar mensagem original sem conteúdo processado
          }
        }
      }
    }

    // Re-verificar trigger com conteúdo processado (importante para áudios transcritos)
    const finalIsTrigger = processedContent ? detectTrigger(processedContent, config.trigger_keywords) : false;

    console.log(LOG_PREFIX, "Processando mensagem", {
      configId: config.id,
      isActive: config.is_active,
      isTrigger: finalIsTrigger,
      hasMedia,
      contentPreview: processedContent?.slice(0, 80) ?? "(sem conteúdo)",
      triggerKeywords: config.trigger_keywords,
    });

    const { error: insertError } = await supabase.from("group_messages").upsert(
      {
        company_id: config.company_id,
        config_id: config.id,
        group_jid: remoteJid,
        sender_jid: senderJid,
        sender_name: senderName,
        message_id: messageId,
        content: processedContent,
        message_type: finalMessageType,
        is_trigger: finalIsTrigger,
        sent_at: sentAt,
      },
      { onConflict: "company_id,message_id", ignoreDuplicates: true }
    );

    if (insertError) {
      console.error(LOG_PREFIX, "Falha ao inserir mensagem:", insertError.message);
      return NextResponse.json({ ok: true, skipped: "insert_error" });
    }

    if (finalIsTrigger && processedContent) {
      const { data: insertedMsg } = await supabase
        .from("group_messages")
        .select("id")
        .eq("company_id", config.company_id)
        .eq("message_id", messageId)
        .maybeSingle();

      if (insertedMsg) {
        console.log(LOG_PREFIX, "Processando trigger inline (resposta imediata)", {
          msgDbId: insertedMsg.id,
          configId: config.id,
          hasMedia,
        });

        try {
          const result = await processGroupAgentResponse(config.company_id, {
            messageId: insertedMsg.id,
            configId: config.id,
          });
          console.log(LOG_PREFIX, "Resposta do agente gerada", {
            success: result.success,
            responseType: result.responseType,
            elapsed: `${result.processingTimeMs}ms`,
          });
        } catch (err) {
          console.error(LOG_PREFIX, "Falha ao processar resposta do agente:", err instanceof Error ? err.message : err);
        }
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(LOG_PREFIX, "Concluído", { elapsed: `${elapsed}ms`, trigger: isTrigger });

    return NextResponse.json({ ok: true, trigger: isTrigger });
  } catch (error) {
    console.error(LOG_PREFIX, "Erro inesperado:", error instanceof Error ? error.stack ?? error.message : error);
    return NextResponse.json({ ok: true, skipped: "error" });
  }
}
