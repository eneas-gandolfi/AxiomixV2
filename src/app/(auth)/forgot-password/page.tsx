/**
 * Arquivo: src/app/(auth)/forgot-password/page.tsx
 * Propósito: Página para solicitar recuperação de senha por e-mail.
 * Autor: AXIOMIX
 * Data: 2026-04-06
 */

"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
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

const emailSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
});

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const parsed = emailSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "E-mail inválido.");
      return;
    }

    setIsLoading(true);

    const baseUrl = (
      process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
    ).replace(/\/$/, "");
    const redirectTo = `${baseUrl}/auth/callback?next=${encodeURIComponent("/reset-password")}`;

    const supabase = createSupabaseBrowserClient();
    const { error: supaError } = await supabase.auth.resetPasswordForEmail(
      parsed.data.email,
      { redirectTo },
    );

    setIsLoading(false);

    if (supaError) {
      setError(supaError.message);
      return;
    }

    setSent(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Recuperar senha</CardTitle>
          <CardDescription>
            Informe seu e-mail para receber um link de redefinição de senha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4">
              <p className="text-sm text-success">
                Se o e-mail estiver cadastrado, você receberá um link para
                redefinir sua senha. Verifique sua caixa de entrada.
              </p>
              <Link
                href="/login"
                className="block text-center text-sm font-medium text-primary hover:underline"
              >
                Voltar ao login
              </Link>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-text"
                >
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  required
                  className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-text placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="gestor@empresa.com"
                />
                {error ? <p className="text-xs text-danger">{error}</p> : null}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Enviando..." : "Enviar link de recuperação"}
              </Button>

              <Link
                href="/login"
                className="block text-center text-sm font-medium text-primary hover:underline"
              >
                Voltar ao login
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
