/**
 * Arquivo: src/lib/pdf/render-page.ts
 * Propósito: Renderiza a primeira página de um PDF como imagem PNG usando pdfjs-dist + @napi-rs/canvas.
 * Autor: AXIOMIX
 * Data: 2026-03-31
 */

import "./polyfill";

const RENDER_SCALE = 2; // 2x para boa legibilidade no Vision
const MAX_DIMENSION = 2048; // limite para não estourar memória

/**
 * Renderiza a primeira página de um PDF como PNG base64.
 * Retorna o base64 da imagem (sem prefixo data:).
 */
export async function renderFirstPageAsPng(buffer: Buffer): Promise<string> {
  const { createCanvas } = await import("@napi-rs/canvas");
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve(
      "pdfjs-dist/legacy/build/pdf.worker.mjs"
    );
  } catch {
    // fake worker fallback
  }

  const doc = await pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
    verbosity: 0,
  }).promise;

  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: RENDER_SCALE });

  // Limitar dimensões para não estourar memória
  let { width, height } = viewport;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
    width = Math.floor(width * ratio);
    height = Math.floor(height * ratio);
  }

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // pdfjs espera uma interface CanvasRenderingContext2D compatível
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (page.render as any)({
    canvasContext: ctx,
    viewport: page.getViewport({
      scale: (width / viewport.width) * RENDER_SCALE,
    }),
  }).promise;

  const pngBuffer = canvas.toBuffer("image/png");
  return Buffer.from(pngBuffer).toString("base64");
}
