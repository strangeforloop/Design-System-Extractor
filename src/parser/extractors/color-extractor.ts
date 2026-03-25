import type { NodePath } from "@babel/traverse";
import type { File } from "@babel/types";
import * as t from "@babel/types";

import { traverse } from "../babel-traverse.js";
import type { DesignValue } from "../types.js";
import type { Extractor } from "./types.js";

const COLOR_OBJECT_KEYS = new Set([
  "color",
  "background",
  "backgroundColor",
  "borderColor",
  "outlineColor",
  "fill",
  "stroke",
  "caretColor",
]);

const CSS_COLOR_DECL =
  /(background(?:-color)?|color|border-color|outline-color|fill|stroke)\s*:\s*(#[0-9a-fA-F]{3,8}\b|rgba?\([^)]+\))/gi;

function lineAtOffset(text: string, startLine: number, offset: number): number {
  let line = startLine;
  const slice = text.slice(0, offset);
  for (const ch of slice) {
    if (ch === "\n") line++;
  }
  return line;
}

function clamp255(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function clampAlpha(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function byteToHex(n: number): string {
  return clamp255(n).toString(16).padStart(2, "0").toUpperCase();
}

/**
 * Parses `rgb()` / `rgba()` into uppercase hex (`#RRGGBB` or `#RRGGBBAA`).
 */
function rgbStringToHex(input: string): string | null {
  const m = input
    .trim()
    .match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (!m) return null;
  const r = parseFloat(m[1]!);
  const g = parseFloat(m[2]!);
  const b = parseFloat(m[3]!);
  const body = `#${byteToHex(r)}${byteToHex(g)}${byteToHex(b)}`;
  if (m[4] !== undefined && m[4] !== "") {
    const a = clampAlpha(parseFloat(m[4]!));
    return `${body}${byteToHex(a * 255)}`;
  }
  return body;
}

/**
 * Normalizes extracted colors to uppercase hex (expands 3-digit hex; converts rgb/rgba).
 */
function normalizeColorValue(raw: string): string {
  const trimmed = raw.trim();
  const fromRgb = rgbStringToHex(trimmed);
  if (fromRgb) return fromRgb;
  if (/^#[0-9a-fA-F]{3}$/i.test(trimmed)) {
    const [, h] = trimmed.match(/^#([0-9a-fA-F]{3})$/i)!;
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`.toUpperCase();
  }
  if (/^#[0-9a-fA-F]{6}$/i.test(trimmed) || /^#[0-9a-fA-F]{8}$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  return trimmed;
}

function extractColorToken(from: string): string | null {
  const hex = from.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/);
  if (hex) return hex[0];
  const trimmed = from.trim();
  if (/^rgba?\(/i.test(trimmed)) {
    const m = trimmed.match(/^rgba?\([^)]+\)/i);
    return m ? m[0] : null;
  }
  return null;
}

function colorsInCssSnippet(snippet: string, baseLine: number): { value: string; line: number; context: string }[] {
  const found: { value: string; line: number; context: string }[] = [];
  CSS_COLOR_DECL.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = CSS_COLOR_DECL.exec(snippet)) !== null) {
    const prop = match[1]!.toLowerCase().replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    const rawValue = match[2]!.trim();
    const token = extractColorToken(rawValue) ?? rawValue.match(/#[0-9a-fA-F]{3,8}\b/)?.[0] ?? null;
    if (!token) continue;
    const line = lineAtOffset(snippet, baseLine, match.index + match[0].indexOf(rawValue));
    found.push({ value: normalizeColorValue(token), line, context: prop });
  }
  return found;
}

function objectKeyName(
  key: t.ObjectProperty["key"],
): string | null {
  if (t.isIdentifier(key)) return key.name;
  if (t.isStringLiteral(key)) return key.value;
  return null;
}

/**
 * Extracts color literals from JSX style objects, object expressions, and
 * CSS-like snippets inside tagged template literals (e.g. styled-components).
 */
export class ColorExtractor implements Extractor {
  extract(ast: File, filePath: string): DesignValue[] {
    const results: DesignValue[] = [];

    traverse(ast, {
      StringLiteral(path: NodePath<t.StringLiteral>) {
        const { node } = path;
        const token = extractColorToken(node.value);
        if (!token) return;

        const parent = path.parent;
        if (t.isObjectProperty(parent) && parent.value === node) {
          const name = objectKeyName(parent.key);
          if (name && COLOR_OBJECT_KEYS.has(name)) {
            results.push({
              type: "color",
              value: normalizeColorValue(token),
              file: filePath,
              line: node.loc?.start.line ?? 0,
              context: name,
            });
          }
          return;
        }

        if (t.isJSXAttribute(parent) && t.isJSXIdentifier(parent.name)) {
          const jsxName = parent.name.name;
          if (COLOR_OBJECT_KEYS.has(jsxName)) {
            results.push({
              type: "color",
              value: normalizeColorValue(token),
              file: filePath,
              line: node.loc?.start.line ?? 0,
              context: jsxName,
            });
          }
        }
      },

      TemplateElement(path: NodePath<t.TemplateElement>) {
        const quasi = path.node.value.raw;
        const startLine = path.node.loc?.start.line ?? 1;
        const fromDecl = colorsInCssSnippet(quasi, startLine);
        for (const item of fromDecl) {
          results.push({
            type: "color",
            value: item.value,
            file: filePath,
            line: item.line,
            context: item.context,
          });
        }
      },
    });

    return results;
  }
}
