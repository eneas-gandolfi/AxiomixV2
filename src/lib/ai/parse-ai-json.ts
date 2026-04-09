/**
 * Arquivo: src/lib/ai/parse-ai-json.ts
 * Propósito: Parse robusto de JSON retornado por modelos de IA.
 *            Lida com markdown, texto extra, vírgulas finais e truncamento.
 * Autor: AXIOMIX
 * Data: 2026-04-08
 */

/**
 * Extrai e faz parse de JSON retornado por modelos de IA.
 * Etapas:
 * 1. Remove wrappers markdown (```json ... ```)
 * 2. Extrai substring entre primeiro { e último } (ou [ e ])
 * 3. Remove trailing commas, comentários JS single-line
 * 4. Se falhar, tenta truncar no último } válido (output cortado pelo modelo)
 */
export function parseAiJson<T = unknown>(raw: string): T {
  const cleaned = stripMarkdownAndExtractJson(raw);

  // Tentativa 1: parse direto após limpeza
  const parsed = tryParse<T>(sanitizeJson(cleaned));
  if (parsed !== undefined) return unwrapArray(parsed) as T;

  // Tentativa 2: truncar no último } ou ] válido
  const truncated = truncateToLastClosingBrace(cleaned);
  if (truncated) {
    const parsedTruncated = tryParse<T>(sanitizeJson(truncated));
    if (parsedTruncated !== undefined) return unwrapArray(parsedTruncated) as T;
  }

  // Erro descritivo com trecho do conteúdo original
  const preview = raw.slice(0, 200).replace(/\n/g, "\\n");
  throw new SyntaxError(
    `Falha ao fazer parse do JSON da IA. Início da resposta: "${preview}..."`,
  );
}

/** Tenta parse sem lançar exceção. */
function tryParse<T>(text: string): T | undefined {
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
}

/** Se a IA retornar um array com um único objeto, extrair o primeiro elemento. */
function unwrapArray<T>(value: T): T {
  if (Array.isArray(value) && value.length === 1 && typeof value[0] === "object" && value[0] !== null) {
    return value[0] as T;
  }
  return value;
}

function stripMarkdownAndExtractJson(text: string): string {
  // Remove blocos markdown ```json ... ```
  const mdMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const stripped = mdMatch?.[1]?.trim() ?? text.trim();

  // Extrair do primeiro { ao último } (ou [ ao último ])
  const firstBrace = stripped.indexOf("{");
  const firstBracket = stripped.indexOf("[");

  let start: number;
  let end: number;

  if (firstBrace === -1 && firstBracket === -1) {
    return stripped;
  }

  if (firstBracket === -1 || (firstBrace !== -1 && firstBrace < firstBracket)) {
    start = firstBrace;
    end = stripped.lastIndexOf("}");
  } else {
    start = firstBracket;
    end = stripped.lastIndexOf("]");
  }

  if (end <= start) {
    return stripped;
  }

  return stripped.slice(start, end + 1);
}

function sanitizeJson(text: string): string {
  return (
    text
      // Remover comentários JS single-line (// ...)
      .replace(/\/\/[^\n]*/g, "")
      // Remover trailing commas antes de } ou ]
      .replace(/,\s*([}\]])/g, "$1")
  );
}

function truncateToLastClosingBrace(text: string): string | null {
  // Tentar encontrar o último } ou ] que fecha o JSON de forma válida
  for (let i = text.length - 1; i >= 0; i--) {
    if (text[i] === "}" || text[i] === "]") {
      const candidate = text.slice(0, i + 1);
      // Validação rápida: aberturas e fechamentos devem bater
      const opens = (candidate.match(/[{[]/g) ?? []).length;
      const closes = (candidate.match(/[}\]]/g) ?? []).length;
      if (opens === closes && opens > 0) {
        return candidate;
      }
    }
  }
  return null;
}
