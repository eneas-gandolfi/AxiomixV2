/**
 * Arquivo: src/app/(auth)/login/page.tsx
 * Propósito: Realizar login com e-mail/senha ou magic link sem criação automática de usuário.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

"use client";

import { useRouter } from "next/navigation";
import { z } from "zod";
import { type ChangeEvent, type FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
  const [fields, setFields] = useState<LoginFields>({ email: "", password: "" });
  const [errors, setErrors] = useState<LoginErrors>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [isMagicLinkLoading, setIsMagicLinkLoading] = useState(false);

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
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setIsPasswordLoading(false);

    if (error) {
      setErrors({ form: error.message });
      return;
    }

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
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Entrar no AXIOMIX</CardTitle>
          <CardDescription>
            Acesso restrito a usuários previamente cadastrados no Supabase.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handlePasswordLogin}>
            <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-medium text-text">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={fields.email}
                onChange={handleFieldChange("email")}
                required
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-text placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="gestor@empresa.com"
              />
              {errors.email ? <p className="text-xs text-danger">{errors.email}</p> : null}
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="text-sm font-medium text-text">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={fields.password}
                onChange={handleFieldChange("password")}
                required
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-text placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="********"
              />
              {errors.password ? <p className="text-xs text-danger">{errors.password}</p> : null}
            </div>

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
            className="mt-3 w-full"
            disabled={isPasswordLoading || isMagicLinkLoading}
            onClick={handleMagicLink}
          >
            {isMagicLinkLoading ? "Enviando..." : "Entrar com link mágico"}
          </Button>

          <p className="mt-4 text-center text-sm text-muted">
            Solicite ao administrador o cadastro do seu usuário.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
