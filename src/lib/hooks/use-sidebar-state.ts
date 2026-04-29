"use client";

import { useCallback, useEffect, useState } from "react";

export function useSidebarState() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("axiomix-sidebar-state");
    if (stored) {
      setCollapsed(stored === "collapsed");
    } else {
      setCollapsed(window.innerWidth < 1024);
    }
  }, []);

  const toggle = useCallback((value?: boolean) => {
    setCollapsed((prev) => {
      const next = value !== undefined ? value : !prev;
      localStorage.setItem(
        "axiomix-sidebar-state",
        next ? "collapsed" : "expanded"
      );
      return next;
    });
  }, []);

  return [collapsed, toggle] as const;
}
