"use client";

import { createContext, useContext, type ReactNode } from "react";

const CompanyIdContext = createContext<string | null>(null);

export function CompanyIdProvider({ companyId, children }: { companyId: string; children: ReactNode }) {
  return <CompanyIdContext.Provider value={companyId}>{children}</CompanyIdContext.Provider>;
}

export function useCompanyId(): string {
  const id = useContext(CompanyIdContext);
  if (!id) {
    throw new Error("useCompanyId precisa estar dentro de <CompanyIdProvider>.");
  }
  return id;
}
