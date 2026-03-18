/**
 * Arquivo: src/components/social/media-library.tsx
 * Proposito: Componente de biblioteca de midia com grid, busca, upload e limpeza em lote.
 * Autor: AXIOMIX
 * Data: 2026-03-17
 */

"use client";

import { useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from "react";
import {
  Search,
  Upload,
  Trash2,
  Image as ImageIcon,
  Video,
  Filter,
  Loader2,
  X,
  CheckCircle2,
  Play,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { MediaLibraryItem } from "@/types/modules/cloudinary.types";

type MediaLibraryProps = {
  companyId: string;
  initialData: {
    items: MediaLibraryItem[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type FileTypeFilter = "all" | "image" | "video";
type BulkDeleteBlockedReason = "scheduled_post" | "content_demand";
type BulkDeletePayload = {
  error?: string;
  deletedCount?: number;
  blocked?: Array<{
    id: string;
    fileName: string;
    reason: BulkDeleteBlockedReason;
  }>;
  missingCount?: number;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isImageType(fileType: string) {
  return fileType.startsWith("image/");
}

function describeBlockedReason(reason: BulkDeleteBlockedReason) {
  return reason === "content_demand" ? "demanda de conteudo" : "post agendado";
}

function buildBulkDeleteWarning(payload: BulkDeletePayload) {
  const messages: string[] = [];
  const blocked = payload.blocked ?? [];

  if (blocked.length > 0) {
    const preview = blocked
      .slice(0, 3)
      .map((item) => `${item.fileName} (${describeBlockedReason(item.reason)})`)
      .join(", ");
    const remainingCount = blocked.length - Math.min(blocked.length, 3);
    const suffix = remainingCount > 0 ? ` e mais ${remainingCount}` : "";

    messages.push(
      `${blocked.length} arquivo(s) nao puderam ser removidos porque ainda estao em uso${preview ? `: ${preview}${suffix}` : "."}`
    );
  }

  if ((payload.missingCount ?? 0) > 0) {
    messages.push(`${payload.missingCount} arquivo(s) nao foram encontrados na biblioteca.`);
  }

  return messages.join(" ");
}

export function MediaLibrary({ companyId, initialData }: MediaLibraryProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [items, setItems] = useState<MediaLibraryItem[]>(initialData.items);
  const [page, setPage] = useState(initialData.page);
  const [total, setTotal] = useState(initialData.total);
  const [totalPages, setTotalPages] = useState(initialData.totalPages);

  const [search, setSearch] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState<FileTypeFilter>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const fetchItems = async (
    nextPage: number,
    nextSearch: string,
    nextFileType: FileTypeFilter
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        companyId,
        page: String(nextPage),
        pageSize: "24",
      });
      if (nextSearch.trim()) params.set("search", nextSearch.trim());
      if (nextFileType !== "all") params.set("fileType", nextFileType);

      const response = await fetch(`/api/social/media-library?${params.toString()}`);
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Falha ao carregar biblioteca.");
        return;
      }

      setItems(payload.items);
      setPage(payload.page);
      setTotal(payload.total);
      setTotalPages(payload.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar biblioteca.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    resetSelection();
    void fetchItems(1, search, fileTypeFilter);
  };

  const handleFileTypeChange = (type: FileTypeFilter) => {
    resetSelection();
    setFileTypeFilter(type);
    void fetchItems(1, search, type);
  };

  const handlePageChange = (nextPage: number) => {
    resetSelection();
    void fetchItems(nextPage, search, fileTypeFilter);
  };

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    setIsUploading(true);
    setError(null);
    setFeedback(null);

    try {
      const formData = new FormData();
      formData.set("companyId", companyId);
      for (const file of Array.from(fileList)) {
        formData.append("files", file);
      }

      const response = await fetch("/api/social/media-library", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Falha ao enviar arquivos.");
        return;
      }

      resetSelection();
      setFeedback(`${payload.count} arquivo(s) enviado(s) com sucesso!`);
      void fetchItems(1, search, fileTypeFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao enviar arquivos.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch(`/api/social/media-library/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Falha ao deletar arquivo.");
        return;
      }

      resetSelection();
      setFeedback("Arquivo removido do bucket e da biblioteca.");
      const shouldMoveToPreviousPage = items.length === 1 && page > 1;
      void fetchItems(shouldMoveToPreviousPage ? page - 1 : page, search, fileTypeFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao deletar arquivo.");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
      return;
    }

    setSelectedIds(new Set(items.map((item) => item.id)));
  };

  const handleCardSelectionKeyDown = (event: KeyboardEvent<HTMLDivElement>, id: string) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    toggleSelection(id);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) {
      setError("Selecione pelo menos um arquivo para remover.");
      return;
    }

    const confirmed = window.confirm(
      `Remover ${selectedIds.size} arquivo(s) do bucket e da biblioteca? Arquivos em uso em posts ou demandas serao preservados.`
    );

    if (!confirmed) {
      return;
    }

    setIsBulkDeleting(true);
    setError(null);
    setFeedback(null);

    try {
      const ids = Array.from(selectedIds);
      const visibleDeletedCount = items.filter((item) => selectedIds.has(item.id)).length;
      const response = await fetch("/api/social/media-library", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          ids,
        }),
      });
      const payload = (await response.json()) as BulkDeletePayload;

      if (!response.ok) {
        setError(payload.error ?? "Falha ao remover arquivos selecionados.");
        return;
      }

      const deletedCount = payload.deletedCount ?? 0;
      const warningMessage = buildBulkDeleteWarning(payload);

      if (deletedCount > 0) {
        setFeedback(`${deletedCount} arquivo(s) removido(s) do bucket e da biblioteca.`);
        const shouldMoveToPreviousPage = visibleDeletedCount === items.length && page > 1;
        await fetchItems(shouldMoveToPreviousPage ? page - 1 : page, search, fileTypeFilter);
      }

      if (warningMessage) {
        setError(warningMessage);
      } else if (deletedCount === 0) {
        setError("Nenhum arquivo selecionado pode ser removido no momento.");
      }

      resetSelection();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao remover arquivos selecionados.");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    void handleUpload(event.dataTransfer.files);
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => event.preventDefault();

  return (
    <div className="space-y-6">
      <Card accent className="rounded-xl">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-[#FA5E24]" />
                Biblioteca de Midia
              </CardTitle>
              <CardDescription>
                {total} arquivo(s) - controle o que fica salvo no bucket e reutilize suas midias
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {selectionMode ? (
                <>
                  <span className="text-xs font-medium text-[#FA5E24]">
                    {selectedIds.size} selecionado(s)
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAllVisible}
                    disabled={items.length === 0 || isBulkDeleting}
                  >
                    {selectedIds.size === items.length && items.length > 0
                      ? "Desmarcar pagina"
                      : "Selecionar pagina"}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => void handleDeleteSelected()}
                    disabled={selectedIds.size === 0 || isBulkDeleting}
                  >
                    {isBulkDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    {isBulkDeleting ? "Limpando..." : `Apagar (${selectedIds.size})`}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetSelection}
                    disabled={isBulkDeleting}
                  >
                    Cancelar
                  </Button>
                </>
              ) : (
                <>
                  {items.length > 0 && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSelectionMode(true);
                        setSelectedIds(new Set());
                      }}
                      disabled={isUploading}
                    >
                      Selecionar
                    </Button>
                  )}
                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {isUploading ? "Enviando..." : "Upload"}
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-tertiary)]" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleSearch();
                  }
                }}
                placeholder="Buscar por nome..."
                className="w-full h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] pl-9 pr-3 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[#FA5E24] focus:border-transparent transition-all placeholder:text-[var(--color-text-tertiary)]"
              />
            </div>

            <div className="flex gap-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-0.5">
              {(["all", "image", "video"] as FileTypeFilter[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleFileTypeChange(type)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    fileTypeFilter === type
                      ? "bg-[#FA5E24] text-white"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]"
                  }`}
                >
                  {type === "all" ? "Todos" : type === "image" ? "Imagens" : "Videos"}
                </button>
              ))}
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleSearch}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
              Filtrar
            </Button>
          </div>
        </CardHeader>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
        multiple
        onChange={(event: ChangeEvent<HTMLInputElement>) => void handleUpload(event.target.files)}
      />

      {feedback && (
        <div className="rounded-xl bg-[var(--color-success-bg)] border border-[#22C55E]/30 p-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#22C55E] flex-shrink-0" />
          <p className="text-sm text-[var(--color-text)] font-medium">{feedback}</p>
          <button type="button" onClick={() => setFeedback(null)} className="ml-auto">
            <X className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 p-3 flex items-center gap-2">
          <X className="h-4 w-4 text-[var(--color-danger)] flex-shrink-0" />
          <p className="text-sm text-[var(--color-danger)] font-medium">{error}</p>
          <button type="button" onClick={() => setError(null)} className="ml-auto">
            <X className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
          </button>
        </div>
      )}

      {items.length === 0 && !isLoading ? (
        <div
          className="rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-16 text-center cursor-pointer hover:border-[#FA5E24]/60 hover:bg-[#FA5E24]/[0.04] transition-all"
          onClick={() => fileInputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={onDragOver}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              fileInputRef.current?.click();
            }
          }}
        >
          <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-[var(--color-primary-dim)] flex items-center justify-center">
            <Upload className="h-8 w-8 text-[#FA5E24]" />
          </div>
          <p className="text-sm font-medium text-[var(--color-text)] mb-1">
            Sua biblioteca esta vazia
          </p>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Arraste arquivos aqui ou <span className="text-[#FA5E24] font-medium">clique para enviar</span>
          </p>
        </div>
      ) : (
        <div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"
          onDrop={onDrop}
          onDragOver={onDragOver}
        >
          {items.map((item) => {
            const isImage = isImageType(item.fileType);
            const isDeleting = deletingId === item.id;
            const isSelected = selectedIds.has(item.id);
            const thumbnailSrc = isImage ? item.publicUrl : item.thumbnailUrl;

            return (
              <div
                key={item.id}
                className={`relative group rounded-xl border overflow-hidden transition-all duration-200 bg-[var(--color-surface)] ${
                  isSelected
                    ? "border-[#FA5E24] ring-2 ring-[#FA5E24]/20"
                    : "border-[var(--color-border)] hover:border-[#FA5E24]/50 hover:shadow-card-hover"
                } ${selectionMode ? "cursor-pointer" : ""}`}
                onClick={selectionMode ? () => toggleSelection(item.id) : undefined}
                onKeyDown={selectionMode ? (event) => handleCardSelectionKeyDown(event, item.id) : undefined}
                role={selectionMode ? "checkbox" : undefined}
                aria-checked={selectionMode ? isSelected : undefined}
                tabIndex={selectionMode ? 0 : undefined}
              >
                <div className="aspect-square bg-[var(--color-surface-2)] relative overflow-hidden">
                  {thumbnailSrc ? (
                    <img
                      src={thumbnailSrc}
                      alt={item.fileName}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      {isImage ? (
                        <ImageIcon className="h-10 w-10 text-[var(--color-text-tertiary)]" />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-[#FA5E24]/10 flex items-center justify-center">
                          <Play className="h-6 w-6 text-[#FA5E24] ml-0.5" />
                        </div>
                      )}
                    </div>
                  )}

                  {!isImage && (
                    <div className="absolute top-1.5 left-1.5 bg-black/60 text-white px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-0.5">
                      <Video className="h-2.5 w-2.5" />
                      Video
                    </div>
                  )}

                  {item.width && item.height && (
                    <div className="absolute bottom-1.5 left-1.5 bg-black/60 text-white px-1.5 py-0.5 rounded text-[10px] font-mono">
                      {item.width}x{item.height}
                    </div>
                  )}

                  {selectionMode ? (
                    <div className="absolute top-1.5 right-1.5 rounded-full bg-black/55 p-1">
                      <CheckCircle2
                        className={`h-4 w-4 ${isSelected ? "text-[#FA5E24]" : "text-white/60"}`}
                      />
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
                      <button
                        type="button"
                        onClick={() => void handleDelete(item.id)}
                        disabled={isDeleting}
                        className="h-9 w-9 rounded-lg bg-[var(--color-danger)] text-white flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-50"
                        aria-label={`Remover ${item.fileName}`}
                      >
                        {isDeleting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-2">
                  <p className="text-xs font-medium text-[var(--color-text)] truncate" title={item.fileName}>
                    {item.fileName}
                  </p>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-[10px] text-[var(--color-text-tertiary)] font-mono">
                      {formatFileSize(item.fileSize)}
                    </p>
                    <p className="text-[10px] text-[var(--color-text-tertiary)]">
                      {formatDate(item.createdAt)}
                    </p>
                  </div>
                  {item.tags.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {item.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-text-tertiary)]"
                        >
                          <Tag className="h-2 w-2" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1 || isLoading}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <span className="text-sm text-[var(--color-text-secondary)] tabular-nums">
            Pagina {page} de {totalPages}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages || isLoading}
          >
            Proxima
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
