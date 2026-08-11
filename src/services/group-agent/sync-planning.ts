import type { EvolutionVendor } from "@/lib/integrations/types";
import { resolvePreferredEvolutionInstance } from "@/services/integrations/evolution";

type ResolveGroupSyncInstanceInput = {
  hasStoredIntegration: boolean;
  fallbackInstanceName: string;
  vendors?: EvolutionVendor[];
};

type GroupSyncInstanceResult =
  | { ok: true; instanceName: string }
  | {
      ok: false;
      status: 409;
      code: "WHATSAPP_NOT_CONNECTED";
      error: string;
    };

export function resolveGroupSyncInstance(input: ResolveGroupSyncInstanceInput): GroupSyncInstanceResult {
  const preferredInstance = resolvePreferredEvolutionInstance(input.vendors);
  const hasConnectedVendor = input.vendors?.some((vendor) => vendor.status === "connected") ?? false;

  if (input.hasStoredIntegration && !hasConnectedVendor) {
    return {
      ok: false,
      status: 409,
      code: "WHATSAPP_NOT_CONNECTED",
      error: "Conecte o WhatsApp pela Evolution API antes de sincronizar grupos.",
    };
  }

  return {
    ok: true,
    instanceName: preferredInstance ?? input.fallbackInstanceName,
  };
}
