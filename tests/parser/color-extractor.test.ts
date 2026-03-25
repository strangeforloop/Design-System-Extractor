import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { ASTParser } from "../../src/parser/ast-parser.js";
import { ColorExtractor } from "../../src/parser/extractors/color-extractor.js";
import type { DesignValue } from "../../src/parser/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "../fixtures/color-extractor");

function extractFixture(filename: string): DesignValue[] {
  const filePath = path.join(fixturesDir, filename);
  const code = readFileSync(filePath, "utf8");
  const parser = new ASTParser();
  const ast = parser.parseSource(code, filePath);
  if (!ast) {
    throw new Error(`Failed to parse fixture: ${filename}`);
  }
  return new ColorExtractor().extract(ast, filePath);
}

describe("ColorExtractor", () => {
  it("extracts from styled-components template", () => {
    const results = extractFixture("styled-button.tsx");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      type: "color",
      value: "#3B82F6",
      context: "background",
    });
  });

  it("extracts from inline style object", () => {
    const results = extractFixture("inline-style.tsx");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      type: "color",
      value: "#111827",
      context: "color",
    });
  });

  it("converts rgb() to hex", () => {
    const results = extractFixture("rgb-background.tsx");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      type: "color",
      value: "#3B82F6",
      context: "background",
    });
  });

  it("ignores non-color strings", () => {
    const results = extractFixture("non-color.tsx");
    expect(results).toEqual([]);
  });

  it("extracts multiple colors from one file", () => {
    const results = extractFixture("multiple-colors.tsx");
    expect(results.length).toBeGreaterThanOrEqual(3);
    const pairs = results.map((r) => ({ value: r.value, context: r.context }));
    expect(pairs).toEqual(
      expect.arrayContaining([
        { value: "#FF0000", context: "background" },
        { value: "#00FF00", context: "color" },
        { value: "#0000FF", context: "borderColor" },
      ]),
    );
  });
});
