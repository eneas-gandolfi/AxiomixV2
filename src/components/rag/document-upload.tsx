/**
 * Arquivo: src/components/rag/document-upload.tsx
 * Propósito: Componente de upload de PDFs para a base de conhecimento RAG.
 * Autor: AXIOMIX
 * Data: 2026-03-14
 */

"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, FileText } from "lucide-react";
import { Progress, App } from "antd";

type DocumentUploadProps = {
  companyId: string;
  onUploadComplete?: () => void;
};

export function DocumentUpload({ companyId, onUploadComplete }: DocumentUploadProps) {
  const { message } = App.useApp();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf") {
        message.error("Apenas arquivos PDF sao aceitos.");
        return;
      }

      if (file.size > 20 * 1024 * 1024) {
        message.error("Arquivo excede o limite de 20 MB.");
        return;
      }

      setIsUploading(true);
      setUploadProgress(10);

      try {
        const formData = new FormData();
        formData.append("companyId", companyId);
        formData.append("file", file);

        setUploadProgress(30);

        const response = await fetch("/api/rag/documents", {
          method: "POST",
          body: formData,
        });

        setUploadProgress(80);

        if (!response.ok) {
          const body = await response.json();
          throw new Error(body.error ?? "Falha no upload.");
        }

        setUploadProgress(100);
        message.success(`"${file.name}" enviado com sucesso! Processamento iniciado.`);
        onUploadComplete?.();
      } catch (error) {
        const detail = error instanceof Error ? error.message : "Erro inesperado.";
        message.error(detail);
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [companyId, onUploadComplete]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) uploadFile(file);
    },
    [uploadFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) uploadFile(file);
      if (inputRef.current) inputRef.current.value = "";
    },
    [uploadFile]
  );

  return (
    <div
      className={`
        border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
        ${isDragging ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5" : "border-border hover:border-[var(--color-primary)]/50"}
        ${isUploading ? "pointer-events-none opacity-60" : ""}
      `}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex flex-col items-center gap-3">
        {isUploading ? (
          <>
            <FileText className="w-10 h-10 text-[var(--color-primary)]" />
            <p className="text-sm text-muted">Enviando documento...</p>
            <div className="w-48">
              <Progress percent={uploadProgress} size="small" strokeColor="var(--color-primary)" />
            </div>
          </>
        ) : (
          <>
            <Upload className="w-10 h-10 text-muted" />
            <p className="text-sm font-medium text-foreground">
              Arraste um PDF aqui ou clique para selecionar
            </p>
            <p className="text-xs text-muted">
              A IA usara estes documentos nas analises de conversas do WhatsApp. Apenas PDF, ate
              20 MB.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
