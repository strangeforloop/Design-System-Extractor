import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { ASTParser } from "../../src/parser/ast-parser.js";
import { TypographyExtractor } from "../../src/parser/extractors/typography-extractor.js";
import type { DesignValue } from "../../src/parser/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "../fixtures/typography-extractor");

function extractFixture(filename: string): DesignValue[] {
  const filePath = path.join(fixturesDir, filename);
  const code = readFileSync(filePath, "utf8");
  const parser = new ASTParser();
  const ast = parser.parseSource(code, filePath);
  if (!ast) {
    throw new Error(`Failed to parse fixture: ${filename}`);
  }
  return new TypographyExtractor().extract(ast, filePath);
}

describe("TypographyExtractor", () => {
  it("extracts font-size, font-weight, and line-height from template", () => {
    const results = extractFixture("styled-typography.tsx");
    expect(results.length).toBe(3);
    const byContext = Object.fromEntries(
      results.map((r) => [r.context, r.value]),
    );
    expect(byContext.fontSize).toBe("18px");
    expect(byContext.fontWeight).toBe("600");
    expect(byContext.lineHeight).toBe("24px");
    expect(results.every((r) => r.type === "typography")).toBe(true);
  });

  it("extracts typography from inline style object", () => {
    const results = extractFixture("inline-styles.tsx");
    expect(results.length).toBe(3);
    const byContext = Object.fromEntries(
      results.map((r) => [r.context, r.value]),
    );
    expect(byContext.fontSize).toBe("16px");
    expect(byContext.fontWeight).toBe("500");
    expect(byContext.lineHeight).toBe("32px");
  });

  it("extracts numeric fontWeight", () => {
    const results = extractFixture("numeric-font-weight.tsx");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      type: "typography",
      value: "700",
      context: "fontWeight",
    });
  });

  it("ignores plain strings that are not style values", () => {
    const results = extractFixture("non-typography.tsx");
    expect(results).toEqual([]);
  });
});
