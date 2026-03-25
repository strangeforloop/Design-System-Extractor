import path from "node:path";
import { describe, expect, it } from "vitest";

import { FileScanner } from "../../src/scanner/file-scanner.js";

describe("FileScanner", () => {
  const scanner = new FileScanner();

  it("finds .tsx and .jsx files in a directory", async () => {
    const fixtureRoot = path.resolve("tests/fixtures/scanner-project");
    const files = await scanner.findReactFiles(fixtureRoot);
    const normalized = files.map((file: string) => path.relative(fixtureRoot, file)).sort();

    expect(normalized).toEqual(["src/App.tsx", "src/components/Button.jsx"]);
  });

  it("excludes files inside node_modules", async () => {
    const fixtureRoot = path.resolve("tests/fixtures/scanner-project");
    const files = await scanner.findReactFiles(fixtureRoot);
    const normalized = files.map((file: string) => path.relative(fixtureRoot, file));

    expect(
      normalized.some((file: string) => file.startsWith("node_modules/")),
    ).toBe(false);
  });

  it("returns an empty list for an empty directory", async () => {
    const fixtureRoot = path.resolve("tests/fixtures/empty-project");
    const files = await scanner.findReactFiles(fixtureRoot);

    expect(files).toEqual([]);
  });
});
