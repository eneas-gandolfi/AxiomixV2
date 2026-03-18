"use client";

import type { ComponentProps } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Send } from "lucide-react";
import { Tooltip } from "antd";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
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
          title: "Falha no envio",
          description:
            payload.error ?? "Erro ao processar o relatório.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Relatório enviado!",
        description: "O relatório foi enviado para o WhatsApp do gestor.",
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

  const isDisabled = disabled || isSending;

  const button = (
    <Button
      type="button"
      onClick={handleSend}
      disabled={isDisabled}
      variant={variant}
      className={cn(
        "h-10 rounded-md px-4 text-sm font-medium focus-visible:ring-primary",
        isDisabled ? "cursor-not-allowed opacity-50" : "",
        className
      )}
      aria-label="Enviar relatório agora"
    >
      {isSending ? (
        <LoadingSpinner size="sm" />
      ) : iconPosition === "left" ? (
        <Send className="h-4 w-4" aria-label="Enviar relatório" />
      ) : null}
      {isSending ? "Gerando e enviando..." : "Enviar relatório agora"}
      {!isSending && iconPosition === "right" ? (
        <ArrowRight className="h-4 w-4" aria-label="Abrir envio de relatório" />
      ) : null}
    </Button>
  );

  if (disabledReason && disabled) {
    return (
      <div className="antd-scope">
        <Tooltip title={disabledReason}>
          <span className="inline-block">{button}</span>
        </Tooltip>
      </div>
    );
  }

  return button;
}
