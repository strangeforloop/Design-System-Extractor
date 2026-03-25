import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { ASTParser } from "../../src/parser/ast-parser.js";
import { SpacingExtractor } from "../../src/parser/extractors/spacing-extractor.js";
import type { DesignValue } from "../../src/parser/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "../fixtures/spacing-extractor");

function extractFixture(filename: string): DesignValue[] {
  const filePath = path.join(fixturesDir, filename);
  const code = readFileSync(filePath, "utf8");
  const parser = new ASTParser();
  const ast = parser.parseSource(code, filePath);
  if (!ast) {
    throw new Error(`Failed to parse fixture: ${filename}`);
  }
  return new SpacingExtractor().extract(ast, filePath);
}

describe("SpacingExtractor", () => {
  it("extracts padding from styled-components template", () => {
    const results = extractFixture("styled-padding.tsx");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      type: "spacing",
      value: "16px",
      context: "padding",
    });
  });

  it("extracts margin from inline style object", () => {
    const results = extractFixture("inline-margin.tsx");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      type: "spacing",
      value: "24px",
      context: "margin",
    });
  });

  it("normalizes rem width to px (16px base)", () => {
    const results = extractFixture("rem-width.tsx");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      type: "spacing",
      value: "32px",
      context: "width",
    });
  });

  it("ignores strings that are not spacing object values", () => {
    const results = extractFixture("non-spacing.tsx");
    expect(results).toEqual([]);
  });

  it("extracts multiple spacing tokens from one file", () => {
    const results = extractFixture("multiple-spacing.tsx");
    expect(results.length).toBeGreaterThanOrEqual(3);
    const pairs = results.map((r) => ({ value: r.value, context: r.context }));
    expect(pairs).toEqual(
      expect.arrayContaining([
        { value: "8px", context: "padding" },
        { value: "16px", context: "margin" },
        { value: "12px", context: "gap" },
        { value: "100%", context: "height" },
      ]),
    );
  });
});
