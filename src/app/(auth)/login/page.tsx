/**
 * Arquivo: src/app/(auth)/login/page.tsx
 * Propósito: Realizar login com e-mail/senha ou magic link sem criação automática de usuário.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { type ChangeEvent, type FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const passwordLoginSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
  password: z.string().min(8, "A senha precisa ter ao menos 8 caracteres."),
});

const magicLinkSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
});

type LoginFields = {
  email: string;
  password: string;
};

type LoginErrors = {
  email?: string;
  password?: string;
  form?: string;
};

function getSafeNextPath() {
  if (typeof window === "undefined") {
    return "/dashboard";
  }

  const nextValue = new URLSearchParams(window.location.search).get("next");
  if (nextValue && nextValue.startsWith("/")) {
    return nextValue;
  }

  return "/dashboard";
}

function getAuthBaseUrl() {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  }

  return process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [fields, setFields] = useState<LoginFields>({ email: "", password: "" });
  const [errors, setErrors] = useState<LoginErrors>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [isMagicLinkLoading, setIsMagicLinkLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const idleReason = searchParams.get("reason") === "idle";

  const handleFieldChange =
    (field: keyof LoginFields) => (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      setFields((previous) => ({ ...previous, [field]: value }));
      setErrors((previous) => ({ ...previous, [field]: undefined, form: undefined }));
      setFeedback(null);
    };

  const handlePasswordLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    const parsed = passwordLoginSchema.safeParse(fields);
    if (!parsed.success) {
      const nextErrors: LoginErrors = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === "email") {
          nextErrors.email = issue.message;
        }
        if (issue.path[0] === "password") {
          nextErrors.password = issue.message;
        }
      }
      setErrors(nextErrors);
      return;
    }

    setIsPasswordLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...parsed.data, rememberMe }),
      });
      const data = await res.json();

      if (data.error) {
        setErrors({ form: data.error });
        setIsPasswordLoading(false);
        return;
      }
    } catch {
      setErrors({ form: "Erro de conexão. Tente novamente." });
      setIsPasswordLoading(false);
      return;
    }
    setIsPasswordLoading(false);

    router.push(getSafeNextPath());
    router.refresh();
  };

  const handleMagicLink = async () => {
    setFeedback(null);
    setErrors((previous) => ({ ...previous, email: undefined, form: undefined }));

    const parsed = magicLinkSchema.safeParse({ email: fields.email });
    if (!parsed.success) {
      setErrors({ email: parsed.error.issues[0]?.message });
      return;
    }

    const nextPath = getSafeNextPath();
    const baseUrl = getAuthBaseUrl().replace(/\/$/, "");
    const redirectTo = `${baseUrl}/auth/callback?next=${encodeURIComponent(nextPath)}`;

    setIsMagicLinkLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: false,
      },
    });
    setIsMagicLinkLoading(false);

    if (error) {
      setErrors({ form: error.message });
      return;
    }

    setFeedback("Enviamos um link mágico para seu e-mail. Abra a caixa de entrada para concluir o login.");
  };

  return (
    <div>
      <Card className="w-full border-[#1E2530]/60 bg-[#0D1117] shadow-none hover:border-[#1E2530]/60 hover:shadow-none">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-[#F0F4FA]">Entrar</CardTitle>
          <CardDescription className="text-[#8892A4]">
            Use suas credenciais para acessar o painel.
          </CardDescription>
        </CardHeader>
        {idleReason ? (
          <div className="mx-6 -mt-2 mb-2 rounded-md border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5 px-3 py-2 text-sm text-[var(--color-warning)]">
            Sua sessão foi encerrada por inatividade.
          </div>
        ) : null}
        <CardContent>
          <form className="space-y-4" onSubmit={handlePasswordLogin}>
            <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-medium text-[#C8D0DC]">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={fields.email}
                onChange={handleFieldChange("email")}
                required
                className="h-10 w-full rounded-lg border border-[#1E2530] bg-[#161B22] px-3 text-sm text-[#F0F4FA] placeholder:text-[#5A6472] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 focus:border-[var(--color-primary)]/50 transition-all"
                placeholder="gestor@empresa.com"
              />
              {errors.email ? <p className="text-xs text-danger">{errors.email}</p> : null}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-[#C8D0DC]">
                  Senha
                </label>
                <a
                  href="/forgot-password"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Esqueci minha senha
                </a>
              </div>
              <input
                id="password"
                type="password"
                value={fields.password}
                onChange={handleFieldChange("password")}
                required
                className="h-10 w-full rounded-lg border border-[#1E2530] bg-[#161B22] px-3 text-sm text-[#F0F4FA] placeholder:text-[#5A6472] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 focus:border-[var(--color-primary)]/50 transition-all"
                placeholder="********"
              />
              {errors.password ? <p className="text-xs text-danger">{errors.password}</p> : null}
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-[#1E2530] bg-[#161B22] accent-[var(--color-primary)]"
              />
              <span className="text-sm text-[#8892A4]">Lembrar-me</span>
            </label>

            {errors.form ? <p className="text-sm text-danger">{errors.form}</p> : null}
            {feedback ? <p className="text-sm text-success">{feedback}</p> : null}

            <Button
              type="submit"
              className="w-full"
              disabled={isPasswordLoading || isMagicLinkLoading}
            >
              {isPasswordLoading ? "Entrando..." : "Entrar com senha"}
            </Button>
          </form>

          <Button
            type="button"
            variant="secondary"
            className="mt-3 w-full border-[#1E2530] bg-[#161B22] text-[#C8D0DC] hover:bg-[#1C2230] hover:text-[#F0F4FA]"
            disabled={isPasswordLoading || isMagicLinkLoading}
            onClick={handleMagicLink}
          >
            {isMagicLinkLoading ? "Enviando..." : "Entrar com link mágico"}
          </Button>

          <p className="mt-4 text-center text-sm text-[#5A6472]">
            Solicite ao administrador o cadastro do seu usuário.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
