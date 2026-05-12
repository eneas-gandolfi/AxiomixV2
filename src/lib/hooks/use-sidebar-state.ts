"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "axiomix-sidebar-state";
const listeners = new Set<() => void>();

function getSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored) return stored === "collapsed";
  return window.innerWidth < 1024;
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function notify(): void {
  listeners.forEach((cb) => cb());
}

export function useSidebarState() {
  const collapsed = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => false,
  );

  const toggle = useCallback((value?: boolean) => {
    const next = value !== undefined ? value : !getSnapshot();
    window.localStorage.setItem(STORAGE_KEY, next ? "collapsed" : "expanded");
    notify();
  }, []);

  return [collapsed, toggle] as const;
}
