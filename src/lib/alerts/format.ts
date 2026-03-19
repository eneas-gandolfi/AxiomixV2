const PLACEHOLDER_PHONE_VALUES = new Set(["unknown", "undefined", "null", "n/a", "na"]);

function normalizeWhitespace(value: string) {
  return value.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
}

export function formatAlertRecipientPhone(phone: string | null | undefined) {
  const raw = phone?.trim() ?? "";
  if (!raw) {
    return "Não configurado";
  }

  if (PLACEHOLDER_PHONE_VALUES.has(raw.toLowerCase())) {
    return "Não configurado";
  }

  const digits = raw.replace(/\D/g, "");
  if (digits.length < 4) {
    return raw;
  }

  return `***-${digits.slice(-4)}`;
}

export function formatAlertMessagePreview(messagePreview: string | null | undefined) {
  if (!messagePreview) {
    return null;
  }

  const summaryMatch = messagePreview.match(/Resumo:\s*([\s\S]+)/i);
  const extracted = summaryMatch?.[1] ?? messagePreview;

  const normalized = normalizeWhitespace(
    extracted
      .replace(/[*_`]/g, "")
      .replace(/^[^\p{L}\p{N}]+/u, "")
  );

  return normalized || null;
}

export function formatAlertErrorDetail(errorDetail: string | null | undefined) {
  if (!errorDetail) {
    return null;
  }

  const normalized = normalizeWhitespace(errorDetail);

  if (/unsupported state|unable to authenticate data/i.test(normalized)) {
    return "Falha na decriptação das credenciais. Reconfigure a integração Evolution API em Configurações.";
  }

  if (/Evolution API n[aã]o configurada/i.test(normalized)) {
    return "A Evolution API não está configurada para esta empresa.";
  }

  if (/Inst[aâ]ncia .* n[aã]o encontrada na Evolution API/i.test(normalized)) {
    return "A instância conectada na Evolution API não foi encontrada. Refaça a conexão do WhatsApp do gestor.";
  }

  if (/N[uú]mero de destino inv[aá]lido para envio WhatsApp/i.test(normalized)) {
    return "O telefone configurado para o envio é inválido. Revise o número do gestor ou o destino do alerta.";
  }

  if (
    /Cannot POST\s+\/message\/sendText/i.test(normalized) ||
    (/404/.test(normalized) && /Not Found/i.test(normalized))
  ) {
    return "A Evolution API respondeu 404 para o envio. Verifique a URL base ou o endpoint configurado.";
  }

  if (
    (/\b401\b/.test(normalized) || /\b403\b/.test(normalized)) &&
    /(apikey|unauthorized|forbidden)/i.test(normalized)
  ) {
    return "A Evolution API recusou a autenticação. Verifique a API key configurada.";
  }

  if (/\b5\d{2}\b/.test(normalized)) {
    return "A Evolution API falhou ao processar o envio. Tente novamente em instantes.";
  }

  return normalized.replace(/^Falha no envio WhatsApp:\s*/i, "");
}
