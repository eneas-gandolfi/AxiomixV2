"use client";

import type { ComponentProps } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type SendReportButtonProps = {
  disabled?: boolean;
  disabledReason?: string;
  className?: string;
  variant?: NonNullable<ComponentProps<typeof Button>["variant"]>;
  iconPosition?: "left" | "right";
};

type ApiPayload = {
  error?: string;
};

export function SendReportButton({
  disabled = false,
  disabledReason,
  className,
  variant = "default",
  iconPosition = "left",
}: SendReportButtonProps) {
  const router = useRouter();
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (disabled) {
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch("/api/jobs/enqueue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "weekly_report",
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as ApiPayload;

      if (!response.ok) {
        toast({
          title: "Erro ao enviar relatório",
          description:
            payload.error ?? "Verifique a integração com a Evolution API.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Relatório em processamento",
        description: "Você receberá no WhatsApp em alguns minutos.",
        variant: "success",
      });
      router.refresh();
    } catch {
      toast({
        title: "Erro ao enviar relatório",
        description: "Verifique a integração com a Evolution API.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Button
      type="button"
      onClick={handleSend}
      disabled={disabled || isSending}
      title={disabledReason}
      variant={variant}
      className={cn(
        "h-10 rounded-md px-4 text-sm font-medium focus-visible:ring-primary",
        disabled || isSending ? "cursor-not-allowed opacity-50" : "",
        className
      )}
      aria-label="Enviar relatório agora"
    >
      {iconPosition === "left" ? (
        <Send className="h-4 w-4" aria-label="Enviar relatório" />
      ) : null}
      {isSending ? "Enviando..." : "Enviar relatório agora"}
      {iconPosition === "right" ? (
        <ArrowRight className="h-4 w-4" aria-label="Abrir envio de relatório" />
      ) : null}
    </Button>
  );
}
