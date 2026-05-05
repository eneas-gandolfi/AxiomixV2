/**
 * Arquivo: src/lib/dashboard/insights/defaultRegistry.ts
 * Propósito: Bootstrap do registry padrão do dashboard — inclui apenas as
 *            strategies que valem pro MVP (varejo + TFR breach). Adicionar
 *            uma nova strategy de produção é uma linha aqui.
 * Autor: AXIOMIX
 * Data: 2026-05-05
 */

import { createInsightRegistry } from "@/lib/dashboard/insights/registry";
import { tfrBreachStrategy } from "@/lib/dashboard/insights/strategies/tfrBreach";

/**
 * Cria um registry novo, populado com as strategies ativas no MVP.
 * Reusa-se entre requisições (stateless). Cada call retorna instância nova
 * pra que testes possam isolar.
 */
export function createDefaultInsightRegistry() {
  const registry = createInsightRegistry();
  registry.register(tfrBreachStrategy);
  return registry;
}
