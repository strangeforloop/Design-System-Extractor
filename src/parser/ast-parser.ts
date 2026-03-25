import { readFile } from "node:fs/promises";
import { parse } from "@babel/parser";
import type { File } from "@babel/types";

import type { DesignValue } from "./types.js";
import type { Extractor } from "./extractors/types.js";
import { ColorExtractor } from "./extractors/color-extractor.js";
import { SpacingExtractor } from "./extractors/spacing-extractor.js";
import { TypographyExtractor } from "./extractors/typography-extractor.js";

export type FileProcessingPhase = "read" | "parse" | "extract";

export interface FileProcessingError {
  filePath: string;
  message: string;
  phase: FileProcessingPhase;
}

/**
 * Parses React/TSX source into a Babel `File` AST. Runs registered extractors
 * over files with per-file error isolation.
 */
export class ASTParser {
  private readonly extractors: Extractor[] = [
    new ColorExtractor(),
    new SpacingExtractor(),
    new TypographyExtractor(),
  ];

  private lastExtractionErrors: FileProcessingError[] = [];

  /**
   * Errors from the most recent `extractValues` call (read, parse, or extract).
   */
  getExtractionErrors(): ReadonlyArray<FileProcessingError> {
    return this.lastExtractionErrors;
  }

  private tryParseSource(code: string): { ast: File } | { error: string } {
    try {
      return {
        ast: parse(code, {
          sourceType: "module",
          plugins: ["jsx", "typescript"],
        }) as File,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { error: message };
    }
  }

  /**
   * Parses in-memory source. Returns `null` on syntax errors instead of throwing.
   */
  parseSource(code: string, _filePath: string): File | null {
    const result = this.tryParseSource(code);
    return "ast" in result ? result.ast : null;
  }

  /**
   * Reads a file from disk and parses it. IO errors propagate; syntax errors yield `null`.
   */
  async parseFile(filePath: string): Promise<File | null> {
    const code = await readFile(filePath, "utf8");
    return this.parseSource(code, filePath);
  }

  /**
   * Runs every extractor against the same AST and concatenates results.
   */
  extractAll(ast: File, filePath: string, extractors?: Extractor[]): DesignValue[] {
    const list = extractors ?? this.extractors;
    return list.flatMap((extractor) => extractor.extract(ast, filePath));
  }

  /**
   * Parses each file, runs all extractors, and returns a flattened list.
   * Read/parse/extractor failures are logged, recorded in {@link getExtractionErrors},
   * and do not stop the batch.
   */
  async extractValues(files: string[]): Promise<DesignValue[]> {
    this.lastExtractionErrors = [];
    const values: DesignValue[] = [];

    const record = (filePath: string, message: string, phase: FileProcessingPhase) => {
      this.lastExtractionErrors.push({ filePath, message, phase });
      console.error(`[${phase}] ${filePath}: ${message}`);
    };

    for (const filePath of files) {
      let code: string;
      try {
        code = await readFile(filePath, "utf8");
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        record(filePath, message, "read");
        continue;
      }

      const parsed = this.tryParseSource(code);
      if ("error" in parsed) {
        record(filePath, parsed.error, "parse");
        continue;
      }

      try {
        values.push(...this.extractAll(parsed.ast, filePath));
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        record(filePath, message, "extract");
      }
    }

    if (this.lastExtractionErrors.length > 0) {
      console.error(
        `\nCompleted with ${this.lastExtractionErrors.length} file error(s) (see messages above).`,
      );
    }

    return values;
  }
}
