/**
 * Arquivo: src/lib/auth/constants.ts
 * Propósito: Constantes centralizadas para controle de sessão (idle timeout + lembrar-me).
 * Autor: AXIOMIX
 * Data: 2026-03-22
 */

/** Nome do cookie que indica "lembrar-me" */
export const REMEMBER_ME_COOKIE = "axiomix-remember";

/** Login deve manter sessão por padrão para evitar quedas acidentais */
export const DEFAULT_REMEMBER_ME = true;

/** Max-age do cookie persistente (30 dias em segundos) */
export const REMEMBER_ME_MAX_AGE = 30 * 24 * 60 * 60;

/** Tempo total de inatividade antes do logout automático (4h) */
export const IDLE_TIMEOUT_MS = 4 * 60 * 60 * 1000;

/** Tempo de inatividade para exibir o modal de aviso (5 min antes do logout) */
export const IDLE_WARNING_MS = IDLE_TIMEOUT_MS - 5 * 60 * 1000;

/** Duração do countdown no modal de aviso (5 min em segundos) */
export const IDLE_COUNTDOWN_SECONDS = 5 * 60;

/** Eventos do DOM que indicam atividade do usuário */
export const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "click",
] as const;
