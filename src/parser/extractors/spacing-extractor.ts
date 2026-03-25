import type { NodePath } from "@babel/traverse";
import type { File } from "@babel/types";
import * as t from "@babel/types";

import { traverse } from "../babel-traverse.js";
import type { DesignValue } from "../types.js";
import type { Extractor } from "./types.js";

/** Integer + unit; matches user spec (no fractional part in pattern). */
const SPACING_TOKEN = /(\d+)(px|rem|em|%)/g;

const SPACING_OBJECT_KEYS = new Set([
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "margin",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "gap",
  "rowGap",
  "columnGap",
  "width",
  "minWidth",
  "maxWidth",
  "height",
  "minHeight",
  "maxHeight",
]);

const CSS_SPACING_DECL =
  /(padding|margin|gap|row-gap|column-gap|width|min-width|max-width|height|min-height|max-height)\s*:\s*([^;\n]+)/gi;

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

function normalizeSpacingContext(prop: string): string {
  return prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

/**
 * Converts spacing tokens to px for comparison (`1rem` → `16px`, `1em` → `16px`).
 * Percent values stay as `N%` (no layout context for px).
 */
function normalizeSpacingToPx(raw: string): string | null {
  const trimmed = raw.trim();
  SPACING_TOKEN.lastIndex = 0;
  if (!SPACING_TOKEN.test(trimmed)) return null;
  SPACING_TOKEN.lastIndex = 0;
  const normalized = trimmed.replace(
    SPACING_TOKEN,
    (match, num: string, unit: string) => {
      const n = parseInt(num, 10);
      switch (unit.toLowerCase()) {
        case "px":
          return `${n}px`;
        case "rem":
          return `${n * 16}px`;
        case "em":
          return `${n * 16}px`;
        case "%":
          return `${n}%`;
        default:
          return match;
      }
    },
  );
  return normalized;
}

/**
 * Extracts spacing-related values (px, rem, em, %) from style objects and
 * CSS-like template literals; `value` is normalized toward px where possible.
 */
export class SpacingExtractor implements Extractor {
  extract(ast: File, filePath: string): DesignValue[] {
    const results: DesignValue[] = [];

    traverse(ast, {
      StringLiteral(path: NodePath<t.StringLiteral>) {
        const { node } = path;
        const normalized = normalizeSpacingToPx(node.value);
        if (!normalized) return;

        const parent = path.parent;
        if (t.isObjectProperty(parent) && parent.value === node) {
          const name = objectKeyName(parent.key);
          if (!name || !SPACING_OBJECT_KEYS.has(name)) return;
          results.push({
            type: "spacing",
            value: normalized,
            file: filePath,
            line: node.loc?.start.line ?? 0,
            context: name,
          });
        }
      },

      TemplateElement(path: NodePath<t.TemplateElement>) {
        const raw = path.node.value.raw;
        const startLine = path.node.loc?.start.line ?? 1;
        CSS_SPACING_DECL.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = CSS_SPACING_DECL.exec(raw)) !== null) {
          const prop = normalizeSpacingContext(match[1]!.toLowerCase());
          const rawValue = match[2]!.trim();
          const normalized = normalizeSpacingToPx(rawValue);
          if (!normalized) continue;
          const valueOffset = match.index + match[0].indexOf(rawValue);
          const line = lineAtOffset(raw, startLine, valueOffset);
          results.push({
            type: "spacing",
            value: normalized,
            file: filePath,
            line,
            context: prop,
          });
        }
      },
    });

    return results;
  }
}
