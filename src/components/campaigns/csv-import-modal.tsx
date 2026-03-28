/**
 * Arquivo: src/components/campaigns/csv-import-modal.tsx
 * Propósito: Modal de import de contatos via CSV para campanhas.
 * Autor: AXIOMIX
 * Data: 2026-03-28
 */

"use client";

import { useState, useCallback } from "react";
import { Modal, Upload, Table, Input, Progress } from "antd";
import { Upload as UploadIcon, FileText, CheckCircle, AlertCircle } from "lucide-react";
import type { UploadFile } from "antd/es/upload";

type ParsedContact = {
  name: string;
  phone: string;
  email?: string;
};

type ImportResult = {
  created: number;
  skipped: number;
  failed: number;
  errors: string[];
};

type CsvImportModalProps = {
  open: boolean;
  onClose: () => void;
  onImportComplete?: (phones: string[]) => void;
};

type Step = "upload" | "preview" | "importing" | "done";

export function CsvImportModal({ open, onClose, onImportComplete }: CsvImportModalProps) {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedContact[]>([]);
  const [totalContacts, setTotalContacts] = useState(0);
  const [labelName, setLabelName] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const reset = useCallback(() => {
    setStep("upload");
    setFile(null);
    setPreview([]);
    setTotalContacts(0);
    setLabelName("");
    setResult(null);
    setError(null);
    setImporting(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("action", "preview");

    try {
      const res = await fetch("/api/contacts/import", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao processar CSV");
        return;
      }

      setPreview(data.preview);
      setTotalContacts(data.totalContacts);
      setStep("preview");
    } catch {
      setError("Erro ao enviar arquivo");
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!file) return;

    setImporting(true);
    setStep("importing");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("action", "import");
    if (labelName.trim()) {
      formData.append("labelName", labelName.trim());
    }

    try {
      const res = await fetch("/api/contacts/import", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao importar");
        setStep("preview");
        setImporting(false);
        return;
      }

      setResult(data);
      setStep("done");

      // Notificar o wizard com os phones importados
      if (onImportComplete) {
        const phones = preview.map((c) => c.phone);
        // Se temos mais que o preview, precisamos usar todos
        if (totalContacts > preview.length) {
          // O result nao retorna phones, mas o wizard vai usar os filtros
          onImportComplete(phones);
        } else {
          onImportComplete(phones);
        }
      }
    } catch {
      setError("Erro ao importar contatos");
      setStep("preview");
    } finally {
      setImporting(false);
    }
  }, [file, labelName, onImportComplete, preview, totalContacts]);

  const previewColumns = [
    { title: "Nome", dataIndex: "name", key: "name", ellipsis: true },
    { title: "Telefone", dataIndex: "phone", key: "phone" },
    { title: "Email", dataIndex: "email", key: "email", ellipsis: true },
  ];

  return (
    <Modal
      title="Importar Contatos via CSV"
      open={open}
      onCancel={handleClose}
      footer={null}
      width={640}
      destroyOnClose
    >
      <div className="space-y-4 py-2">
        {/* Step: Upload */}
        {step === "upload" && (
          <>
            <Upload.Dragger
              accept=".csv"
              maxCount={1}
              showUploadList={false}
              beforeUpload={(f) => {
                handleFileSelect(f as unknown as File);
                return false;
              }}
            >
              <div className="flex flex-col items-center gap-2 py-6">
                <UploadIcon className="h-10 w-10 text-[var(--color-text-tertiary)]" />
                <p className="text-sm text-[var(--color-text)]">
                  Arraste um arquivo CSV ou clique para selecionar
                </p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Colunas esperadas: nome, telefone, email (opcional)
                </p>
              </div>
            </Upload.Dragger>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}
          </>
        )}

        {/* Step: Preview */}
        {step === "preview" && (
          <>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[var(--color-primary)]" />
              <span className="text-sm font-medium text-[var(--color-text)]">
                {totalContacts} contato(s) encontrado(s)
              </span>
              {file && (
                <span className="text-xs text-[var(--color-text-secondary)]">
                  ({file.name})
                </span>
              )}
            </div>

            <div className="antd-scope">
              <Table
                columns={previewColumns}
                dataSource={preview.map((c, i) => ({ ...c, key: i }))}
                size="small"
                pagination={false}
                scroll={{ y: 200 }}
              />
            </div>

            {totalContacts > 10 && (
              <p className="text-xs text-[var(--color-text-secondary)]">
                Mostrando 10 de {totalContacts} contatos
              </p>
            )}

            <div>
              <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">
                Etiqueta para contatos importados (opcional)
              </label>
              <Input
                placeholder="Ex: Importação 28/03"
                value={labelName}
                onChange={(e) => setLabelName(e.target.value)}
                size="small"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={reset}
                className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-sidebar)]"
              >
                Voltar
              </button>
              <button
                onClick={handleImport}
                className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Importar {totalContacts} contato(s)
              </button>
            </div>
          </>
        )}

        {/* Step: Importing */}
        {step === "importing" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Progress type="circle" percent={99} status="active" />
            <p className="text-sm text-[var(--color-text)]">
              Importando {totalContacts} contatos...
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Isso pode levar alguns segundos
            </p>
          </div>
        )}

        {/* Step: Done */}
        {step === "done" && result && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 justify-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <span className="text-lg font-medium text-[var(--color-text)]">
                Importação concluída
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                <p className="text-2xl font-bold text-green-600">{result.created}</p>
                <p className="text-xs text-green-700">Criados</p>
              </div>
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                <p className="text-2xl font-bold text-yellow-600">{result.skipped}</p>
                <p className="text-xs text-yellow-700">Já existiam</p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-2xl font-bold text-red-600">{result.failed}</p>
                <p className="text-xs text-red-700">Erros</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="max-h-32 overflow-y-auto rounded-lg border border-red-200 bg-red-50 p-3">
                {result.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-600">{err}</p>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={handleClose}
                className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
