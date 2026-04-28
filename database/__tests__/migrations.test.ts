import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";

const MIGRATIONS_DIR = resolve(__dirname, "../migrations");

function getMigrationNumbers(): number[] {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  return files.map((f) => {
    const match = f.match(/^(\d+)_/);
    return match ? parseInt(match[1], 10) : -1;
  });
}

describe("Database Migrations", () => {
  it("has no duplicate migration numbers", () => {
    const numbers = getMigrationNumbers();
    const seen = new Set<number>();
    const duplicates: number[] = [];

    for (const num of numbers) {
      if (seen.has(num)) duplicates.push(num);
      seen.add(num);
    }

    expect(duplicates).toEqual([]);
  });

  it("all migration files follow NNN_description.sql naming", () => {
    const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql"));

    for (const file of files) {
      expect(file).toMatch(/^\d{3}_[\w]+\.sql$/);
    }
  });
});
