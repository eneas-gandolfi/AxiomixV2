/**
 * Arquivo: src/app/(auth)/reset-password/page.tsx
 * Propósito: Página para redefinir a senha após clicar no link de recuperação.
 * Autor: AXIOMIX
 * Data: 2026-04-06
 */

"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

const resetSchema = z
  .object({
    password: z.string().min(8, "A senha precisa ter ao menos 8 caracteres."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

type ResetErrors = {
  password?: string;
  confirmPassword?: string;
  form?: string;
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<ResetErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});

    const parsed = resetSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      const nextErrors: ResetErrors = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === "password") {
          nextErrors.password = issue.message;
        }
        if (issue.path[0] === "confirmPassword") {
          nextErrors.confirmPassword = issue.message;
        }
      }
      setErrors(nextErrors);
      return;
    }

    setIsLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });
    setIsLoading(false);

    if (error) {
      setErrors({ form: error.message });
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 2000);
  };

  return (
    <div>
      <Card className="w-full border-[#1E2530]/60 bg-[#0D1117] shadow-none hover:border-[#1E2530]/60 hover:shadow-none">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-[#F0F4FA]">Redefinir senha</CardTitle>
          <CardDescription className="text-[#8892A4]">
            Escolha uma nova senha para sua conta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <p className="text-sm text-success">
              Senha redefinida com sucesso! Redirecionando...
            </p>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-[#C8D0DC]"
                >
                  Nova senha
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((prev) => ({
                      ...prev,
                      password: undefined,
                      form: undefined,
                    }));
                  }}
                  required
                  className="h-10 w-full rounded-lg border border-[#1E2530] bg-[#161B22] px-3 text-sm text-[#F0F4FA] placeholder:text-[#5A6472] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 focus:border-[var(--color-primary)]/50 transition-all"
                  placeholder="********"
                />
                {errors.password ? (
                  <p className="text-xs text-danger">{errors.password}</p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="confirmPassword"
                  className="text-sm font-medium text-[#C8D0DC]"
                >
                  Confirmar nova senha
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setErrors((prev) => ({
                      ...prev,
                      confirmPassword: undefined,
                      form: undefined,
                    }));
                  }}
                  required
                  className="h-10 w-full rounded-lg border border-[#1E2530] bg-[#161B22] px-3 text-sm text-[#F0F4FA] placeholder:text-[#5A6472] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 focus:border-[var(--color-primary)]/50 transition-all"
                  placeholder="********"
                />
                {errors.confirmPassword ? (
                  <p className="text-xs text-danger">
                    {errors.confirmPassword}
                  </p>
                ) : null}
              </div>

              {errors.form ? (
                <p className="text-sm text-danger">{errors.form}</p>
              ) : null}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Salvando..." : "Redefinir senha"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
