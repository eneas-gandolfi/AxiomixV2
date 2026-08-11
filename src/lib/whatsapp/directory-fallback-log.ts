type DirectoryKind = "agents" | "inboxes";

const DIRECTORY_LABEL: Record<DirectoryKind, string> = {
  agents: "fetchAgents",
  inboxes: "fetchInboxes",
};

export function logDirectoryFallback(kind: DirectoryKind, companyId: string, error: unknown) {
  console.warn(`[conversas page] ${DIRECTORY_LABEL[kind]} failed; degrading to empty list`, {
    companyId,
    message: error instanceof Error ? error.message : String(error),
    cause: error instanceof Error ? (error as Error & { cause?: { code?: string } }).cause?.code : undefined,
  });
}
