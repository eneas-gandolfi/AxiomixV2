"use client";

import { useEffect } from "react";

export default function UploadPostPopupClosePage() {
  useEffect(() => {
    const platform = new URLSearchParams(window.location.search).get("platform");

    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        {
          type: "AXIOMIX_UPLOAD_POST_CONNECTED",
          platform,
        },
        window.location.origin
      );
    }

    window.close();

    const fallbackTimeout = window.setTimeout(() => {
      window.location.replace("/settings");
    }, 800);

    return () => window.clearTimeout(fallbackTimeout);
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <p className="text-sm text-muted">Conexao concluida. Fechando janela...</p>
    </main>
  );
}
