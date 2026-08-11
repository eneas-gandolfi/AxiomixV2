/**
 * Arquivo: src/instrumentation.ts
 * Proposito: Next.js Instrumentation — executado uma vez no startup do servidor.
 * Mantem o processo web leve. Crons rodam via endpoints dedicados ou worker
 * separado, sem puxar jobs pesados para o bundle das paginas.
 * Autor: AXIOMIX
 * Data: 2026-04-07
 */

type InstrumentationEnv = Record<string, string | undefined>;

export function shouldStartCronSchedulerInWebProcess(env: InstrumentationEnv): boolean {
  void env;
  return false;
}

export async function register() {
  shouldStartCronSchedulerInWebProcess(process.env);
}
