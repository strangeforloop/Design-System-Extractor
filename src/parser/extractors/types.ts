import type { File } from "@babel/types";

import type { DesignValue } from "../types.js";

/**
 * Contract for pluggable extractors. Each implementation targets one kind
 * of token (colors, spacing, typography, etc.) so new extractors can be
 * registered without changing `ASTParser`.
 */
export interface Extractor {
  extract(ast: File, filePath: string): DesignValue[];
}
