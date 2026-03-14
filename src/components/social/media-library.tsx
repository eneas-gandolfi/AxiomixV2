/**
 * Arquivo: src/components/social/media-library.tsx
 * Proposito: Componente de biblioteca de midia com grid, busca e filtros.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import { useState, useRef, type ChangeEvent, type DragEvent } from "react";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    void fetchItems(1, search, fileTypeFilter);
  };

  const handleFileTypeChange = (type: FileTypeFilter) => {
    setFileTypeFilter(type);
    void fetchItems(1, search, type);
  };

  const handlePageChange = (nextPage: number) => {
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

      setFeedback("Arquivo removido.");
      setItems((prev) => prev.filter((item) => item.id !== id));
      setTotal((prev) => prev - 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao deletar arquivo.");
    } finally {
      setDeletingId(null);
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    void handleUpload(event.dataTransfer.files);
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => event.preventDefault();

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <Card accent className="rounded-xl">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-[#FA5E24]" />
                Biblioteca de Mídia
              </CardTitle>
              <CardDescription>
                {total} arquivo(s) · Gerencie e reutilize suas mídias
              </CardDescription>
            </div>
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
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-3 pt-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-tertiary)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
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
                  {type === "all" ? "Todos" : type === "image" ? "Imagens" : "Vídeos"}
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

      {/* Upload area (drag & drop) */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
        multiple
        onChange={(e: ChangeEvent<HTMLInputElement>) => void handleUpload(e.target.files)}
      />

      {/* Feedback */}
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

      {/* Grid de mídias */}
      {items.length === 0 && !isLoading ? (
        <div
          className="rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-16 text-center cursor-pointer hover:border-[#FA5E24]/60 hover:bg-[#FA5E24]/[0.04] transition-all"
          onClick={() => fileInputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={onDragOver}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
        >
          <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-[var(--color-primary-dim)] flex items-center justify-center">
            <Upload className="h-8 w-8 text-[#FA5E24]" />
          </div>
          <p className="text-sm font-medium text-[var(--color-text)] mb-1">
            Sua biblioteca está vazia
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
            const thumbnailSrc = isImage ? item.publicUrl : item.thumbnailUrl;

            return (
              <div
                key={item.id}
                className="relative group rounded-xl border border-[var(--color-border)] overflow-hidden hover:border-[#FA5E24]/50 hover:shadow-card-hover transition-all duration-200 bg-[var(--color-surface)]"
              >
                {/* Thumbnail */}
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

                  {/* Type badge */}
                  {!isImage && (
                    <div className="absolute top-1.5 left-1.5 bg-black/60 text-white px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-0.5">
                      <Video className="h-2.5 w-2.5" />
                      Vídeo
                    </div>
                  )}

                  {/* Dimensions badge */}
                  {item.width && item.height && (
                    <div className="absolute bottom-1.5 left-1.5 bg-black/60 text-white px-1.5 py-0.5 rounded text-[10px] font-mono">
                      {item.width}×{item.height}
                    </div>
                  )}

                  {/* Delete overlay */}
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
                </div>

                {/* Info */}
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

      {/* Paginação */}
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
            Página {page} de {totalPages}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages || isLoading}
          >
            Próxima
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
