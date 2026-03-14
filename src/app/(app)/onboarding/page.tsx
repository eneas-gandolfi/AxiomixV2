/**
 * Arquivo: src/app/(app)/onboarding/page.tsx
 * Propósito: Coletar dados iniciais da empresa no primeiro acesso.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/forms/onboarding-form";
import { getUserCompanyId } from "@/lib/auth/get-user-company-id";

export default async function OnboardingPage() {
  const companyId = await getUserCompanyId();

  if (companyId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <OnboardingForm />
    </div>
  );
}
