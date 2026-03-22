/**
 * Arquivo: src/lib/auth/constants.ts
 * Propósito: Constantes centralizadas para controle de sessão (idle timeout + lembrar-me).
 * Autor: AXIOMIX
 * Data: 2026-03-22
 */

/** Nome do cookie que indica "lembrar-me" */
export const REMEMBER_ME_COOKIE = "axiomix-remember";

/** Max-age do cookie persistente (30 dias em segundos) */
export const REMEMBER_ME_MAX_AGE = 30 * 24 * 60 * 60;

/** Tempo total de inatividade antes do logout automático (30 min) */
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

/** Tempo de inatividade para exibir o modal de aviso (28 min) */
export const IDLE_WARNING_MS = 28 * 60 * 1000;

/** Duração do countdown no modal de aviso (2 min em segundos) */
export const IDLE_COUNTDOWN_SECONDS = 120;

/** Eventos do DOM que indicam atividade do usuário */
export const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "click",
] as const;
