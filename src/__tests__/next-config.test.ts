import { pathToFileURL } from "node:url";
import { describe, expect, test, vi } from "vitest";

const configUrl = pathToFileURL(`${process.cwd()}/next.config.mjs`).href;

async function loadConfig() {
  const module = await import(`${configUrl}?t=${Date.now()}-${Math.random()}`);
  return module.default as { typescript?: { ignoreBuildErrors?: boolean } };
}

describe("next.config", () => {
  test("runs TypeScript checks during normal builds", async () => {
    vi.stubEnv("NEXT_SKIP_DOCKER_TYPECHECK", undefined);

    const config = await loadConfig();

    expect(config.typescript?.ignoreBuildErrors).not.toBe(true);
  });

  test("can skip duplicated TypeScript checks only for Docker image builds", async () => {
    vi.stubEnv("NEXT_SKIP_DOCKER_TYPECHECK", "1");

    const config = await loadConfig();

    expect(config.typescript?.ignoreBuildErrors).toBe(true);
  });
});
