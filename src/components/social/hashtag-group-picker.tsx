/**
 * Arquivo: src/components/social/hashtag-group-picker.tsx
 * Propósito: Picker de grupos de hashtags para inserir no caption do post.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Hash, ChevronDown, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HashtagGroupManager } from "./hashtag-group-manager";
import type { HashtagGroup } from "@/types/modules/social-publisher.types";

type HashtagGroupPickerProps = {
  companyId: string;
  onInsert: (hashtags: string) => void;
};

export function HashtagGroupPicker({ companyId, onInsert }: HashtagGroupPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [groups, setGroups] = useState<HashtagGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchGroups = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/social/hashtag-groups?companyId=${companyId}`);
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInsert = (group: HashtagGroup) => {
    const text = group.hashtags.join(" ");
    onInsert(text);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs gap-1.5"
      >
        <Hash className="h-3.5 w-3.5" />
        Hashtags
        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 w-72 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
          <div className="p-3 border-b border-[var(--color-border)]">
            <p className="text-sm font-medium text-[var(--color-text)]">Grupos de Hashtags</p>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
              Clique para inserir no caption
            </p>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-[var(--color-text-tertiary)]">
                Carregando...
              </div>
            ) : groups.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-sm text-[var(--color-text-tertiary)] mb-2">
                  Nenhum grupo criado
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setIsOpen(false);
                    setIsManagerOpen(true);
                  }}
                  className="text-xs"
                >
                  <Plus className="h-3 w-3" />
                  Criar Grupo
                </Button>
              </div>
            ) : (
              groups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => handleInsert(group)}
                  className="w-full text-left px-3 py-2.5 hover:bg-[var(--color-surface-2)] transition-colors border-b border-[var(--color-border)] last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--color-text)]">
                      {group.name}
                    </span>
                    <span className="text-xs text-[var(--color-text-tertiary)]">
                      {group.hashtags.length} tags
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1 line-clamp-2">
                    {group.hashtags.slice(0, 5).join(" ")}
                    {group.hashtags.length > 5 ? " ..." : ""}
                  </p>
                </button>
              ))
            )}
          </div>

          <div className="p-2 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsManagerOpen(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] transition-colors"
            >
              <Settings className="h-3.5 w-3.5" />
              Gerenciar Grupos
            </button>
          </div>
        </div>
      )}

      <HashtagGroupManager
        companyId={companyId}
        isOpen={isManagerOpen}
        onClose={() => setIsManagerOpen(false)}
        onGroupsChange={() => {
          fetchGroups();
        }}
      />
    </div>
  );
}
