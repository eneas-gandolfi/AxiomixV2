/**
 * Arquivo: src/lib/pdf/extract-text.ts
 * Propósito: Extrai texto de PDF usando pdfjs-dist com polyfill de DOMMatrix.
 * Autor: AXIOMIX
 * Data: 2026-03-24
 */

import "./polyfill";

export async function extractTextFromPdf(buffer: Buffer, maxLength?: number): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // No Node.js, pdfjs-dist desabilita web workers automaticamente e usa "fake worker",
  // mas precisa do workerSrc apontando para o arquivo real. Usar require.resolve
  // para obter o caminho absoluto correto no runtime da Vercel.
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve(
      "pdfjs-dist/legacy/build/pdf.worker.mjs"
    );
  } catch {
    // Se não encontrar, manter o valor default — pdfjs usará fake worker
  }
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer), useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
  }

  const text = pages.join("\n").trim();
  if (!text) throw new Error("PDF não contém texto extraível.");

  if (maxLength && text.length > maxLength) {
    return text.slice(0, maxLength) + "\n\n[... texto truncado]";
  }

  return text;
}
