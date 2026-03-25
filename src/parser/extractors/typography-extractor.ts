import type { NodePath } from "@babel/traverse";
import type { File } from "@babel/types";
import * as t from "@babel/types";

import { traverse } from "../babel-traverse.js";
import type { DesignValue } from "../types.js";
import type { Extractor } from "./types.js";

const SIZE_TOKEN = /(\d+)(px|rem|em)/g;

const FONT_WEIGHT_DECL = /font-weight\s*:\s*(\d{3})\b/gi;
const FONT_SIZE_DECL = /font-size\s*:\s*([^;\n]+)/gi;
const LINE_HEIGHT_DECL = /line-height\s*:\s*([^;\n]+)/gi;

const TYPO_OBJECT_KEYS_SIZE = new Set(["fontSize", "lineHeight"]);
const TYPO_OBJECT_KEYS_WEIGHT = new Set(["fontWeight"]);

function lineAtOffset(text: string, startLine: number, offset: number): number {
  let line = startLine;
  for (const ch of text.slice(0, offset)) {
    if (ch === "\n") line++;
  }
  return line;
}

function objectKeyName(key: t.ObjectProperty["key"]): string | null {
  if (t.isIdentifier(key)) return key.name;
  if (t.isStringLiteral(key)) return key.value;
  return null;
}

function normalizeSizeToPx(raw: string): string | null {
  const trimmed = raw.trim();
  SIZE_TOKEN.lastIndex = 0;
  if (!SIZE_TOKEN.test(trimmed)) return null;
  SIZE_TOKEN.lastIndex = 0;
  return trimmed.replace(SIZE_TOKEN, (match, num: string, unit: string) => {
    const n = parseInt(num, 10);
    switch (unit.toLowerCase()) {
      case "px":
        return `${n}px`;
      case "rem":
        return `${n * 16}px`;
      case "em":
        return `${n * 16}px`;
      default:
        return match;
    }
  });
}

function extractFontWeightToken(raw: string): string | null {
  const m = raw.trim().match(/^(\d{3})$/);
  return m ? m[1]! : null;
}

function pushSizeResults(
  results: DesignValue[],
  rawValue: string,
  filePath: string,
  line: number,
  context: string,
): void {
  const normalized = normalizeSizeToPx(rawValue);
  if (!normalized) return;
  results.push({
    type: "typography",
    value: normalized,
    file: filePath,
    line,
    context,
  });
}

/**
 * Extracts typography tokens: `font-size`, `line-height` (size units), and
 * `font-weight` (three-digit weights) from objects and template CSS.
 */
export class TypographyExtractor implements Extractor {
  extract(ast: File, filePath: string): DesignValue[] {
    const results: DesignValue[] = [];

    traverse(ast, {
      StringLiteral(path: NodePath<t.StringLiteral>) {
        const { node } = path;
        const parent = path.parent;
        if (!t.isObjectProperty(parent) || parent.value !== node) return;

        const name = objectKeyName(parent.key);
        if (!name) return;

        const line = node.loc?.start.line ?? 0;

        if (TYPO_OBJECT_KEYS_SIZE.has(name)) {
          pushSizeResults(results, node.value, filePath, line, name);
          return;
        }

        if (TYPO_OBJECT_KEYS_WEIGHT.has(name)) {
          const w = extractFontWeightToken(node.value);
          if (!w) return;
          results.push({
            type: "typography",
            value: w,
            file: filePath,
            line,
            context: name,
          });
        }
      },

      NumericLiteral(path: NodePath<t.NumericLiteral>) {
        const { node } = path;
        const parent = path.parent;
        if (!t.isObjectProperty(parent) || parent.value !== node) return;
        const name = objectKeyName(parent.key);
        if (!name || !TYPO_OBJECT_KEYS_WEIGHT.has(name)) return;
        const raw = String(Math.trunc(node.value));
        if (!/^\d{3}$/.test(raw)) return;
        results.push({
          type: "typography",
          value: raw,
          file: filePath,
          line: node.loc?.start.line ?? 0,
          context: name,
        });
      },

      TemplateElement(path: NodePath<t.TemplateElement>) {
        const raw = path.node.value.raw;
        const startLine = path.node.loc?.start.line ?? 1;

        FONT_SIZE_DECL.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = FONT_SIZE_DECL.exec(raw)) !== null) {
          const rawValue = match[1]!.trim();
          const valueOffset = match.index + match[0].indexOf(rawValue);
          const line = lineAtOffset(raw, startLine, valueOffset);
          pushSizeResults(results, rawValue, filePath, line, "fontSize");
        }

        LINE_HEIGHT_DECL.lastIndex = 0;
        while ((match = LINE_HEIGHT_DECL.exec(raw)) !== null) {
          const rawValue = match[1]!.trim();
          const valueOffset = match.index + match[0].indexOf(rawValue);
          const line = lineAtOffset(raw, startLine, valueOffset);
          pushSizeResults(results, rawValue, filePath, line, "lineHeight");
        }

        FONT_WEIGHT_DECL.lastIndex = 0;
        while ((match = FONT_WEIGHT_DECL.exec(raw)) !== null) {
          const rawValue = match[1]!;
          const valueOffset = match.index + match[0].indexOf(rawValue);
          const line = lineAtOffset(raw, startLine, valueOffset);
          results.push({
            type: "typography",
            value: rawValue,
            file: filePath,
            line,
            context: "fontWeight",
          });
        }
      },
    });

    return results;
  }
}
