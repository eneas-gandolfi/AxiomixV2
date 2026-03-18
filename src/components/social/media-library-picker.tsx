/**
 * Arquivo: src/components/social/media-library-picker.tsx
 * Propósito: Modal para selecionar midias da biblioteca no wizard do Social Publisher.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Image as ImageIcon,
  Video,
  CheckCircle2,
  X,
  Loader2,
  FolderOpen,
  Play,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MediaLibraryItem } from "@/types/modules/cloudinary.types";

type MediaLibraryPickerProps = {
  companyId: string;
  mode: "single" | "multi";
  fileTypeFilter?: "image" | "video";
  maxSelection?: number;
  open: boolean;
  onClose: () => void;
  onSelect: (items: MediaLibraryItem[]) => void;
};

type FileTypeFilter = "all" | "image" | "video";

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageType(fileType: string) {
  return fileType.startsWith("image/");
}

export function MediaLibraryPicker({
  companyId,
  mode,
  fileTypeFilter: defaultFileType,
  maxSelection,
  open,
  onClose,
  onSelect,
}: MediaLibraryPickerProps) {
  const [items, setItems] = useState<MediaLibraryItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [fileType, setFileType] = useState<FileTypeFilter>(defaultFileType ?? "all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const fetchItems = async (nextPage: number, nextSearch: string, nextFileType: FileTypeFilter) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        companyId,
        page: String(nextPage),
        pageSize: "20",
      });
      if (nextSearch.trim()) params.set("search", nextSearch.trim());
      if (nextFileType !== "all") params.set("fileType", nextFileType);

      const response = await fetch(`/api/social/media-library?${params.toString()}`);
      const payload = await response.json();

      if (response.ok) {
        setItems(payload.items);
        setPage(payload.page);
        setTotalPages(payload.totalPages);
        setTotal(payload.total);
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setSelected(new Set());
      void fetchItems(1, "", defaultFileType ?? "all");
    }
  }, [open, companyId, defaultFileType]);

  const toggleSelection = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (mode === "single") {
          next.clear();
        }
        if (maxSelection && next.size >= maxSelection) {
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const selectedItems = items.filter((item) => selected.has(item.id));
    onSelect(selectedItems);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[85vh] mx-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-[#FA5E24]" />
            <h2 className="text-base font-semibold text-[var(--color-text)]">
              Selecionar da Biblioteca
            </h2>
            <span className="text-xs text-[var(--color-text-tertiary)] ml-1">
              {total} arquivo(s)
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-[var(--color-surface-2)] transition-colors"
          >
            <X className="h-4 w-4 text-[var(--color-text-secondary)]" />
          </button>
        </div>

        {/* Filtros */}
        <div className="flex gap-3 p-4 border-b border-[var(--color-border)]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-tertiary)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void fetchItems(1, search, fileType);
              }}
              placeholder="Buscar..."
              className="w-full h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] pl-9 pr-3 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[#FA5E24] focus:border-transparent placeholder:text-[var(--color-text-tertiary)]"
            />
          </div>
          {!defaultFileType && (
            <div className="flex gap-1 bg-[var(--color-surface-2)] rounded-lg p-0.5">
              {(["all", "image", "video"] as FileTypeFilter[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setFileType(type);
                    void fetchItems(1, search, type);
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    fileType === type
                      ? "bg-[#FA5E24] text-white"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-3)]"
                  }`}
                >
                  {type === "all" ? "Todos" : type === "image" ? "Imagens" : "Vídeos"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[#FA5E24]" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16">
              <FolderOpen className="h-10 w-10 mx-auto mb-3 text-[var(--color-text-tertiary)]" />
              <p className="text-sm text-[var(--color-text-secondary)]">Nenhum arquivo encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
              {items.map((item) => {
                const isImage = isImageType(item.fileType);
                const isSelected = selected.has(item.id);
                const thumbnailSrc = isImage ? item.publicUrl : item.thumbnailUrl;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleSelection(item.id)}
                    className={`relative rounded-xl border overflow-hidden text-left transition-all duration-200 ${
                      isSelected
                        ? "border-2 border-[#FA5E24] ring-2 ring-[#FA5E24]/20"
                        : "border-[var(--color-border)] hover:border-[#FA5E24]/50 hover:shadow-card"
                    }`}
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
                            <ImageIcon className="h-8 w-8 text-[var(--color-text-tertiary)]" />
                          ) : (
                            <Play className="h-8 w-8 text-[var(--color-text-tertiary)]" />
                          )}
                        </div>
                      )}

                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5">
                          <CheckCircle2 className="h-5 w-5 text-[#FA5E24] drop-shadow" />
                        </div>
                      )}

                      {!isImage && (
                        <div className="absolute top-1.5 left-1.5 bg-black/60 text-white px-1 py-0.5 rounded text-[9px] font-medium">
                          <Video className="h-2.5 w-2.5 inline mr-0.5" />
                          Vídeo
                        </div>
                      )}
                    </div>

                    <div className="p-1.5">
                      <p className="text-[10px] font-medium text-[var(--color-text)] truncate">
                        {item.fileName}
                      </p>
                      <p className="text-[9px] text-[var(--color-text-tertiary)] font-mono">
                        {formatFileSize(item.fileSize)}
                        {item.width && item.height ? ` · ${item.width}×${item.height}` : ""}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Paginação + Footer */}
        <div className="flex items-center justify-between p-4 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            {totalPages > 1 && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void fetchItems(page - 1, search, fileType)}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-[var(--color-text-tertiary)] tabular-nums">
                  {page}/{totalPages}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void fetchItems(page + 1, search, fileType)}
                  disabled={page >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--color-text-secondary)]">
              {selected.size} selecionado(s)
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={selected.size === 0}
              onClick={handleConfirm}
            >
              <CheckCircle2 className="h-4 w-4" />
              Confirmar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
