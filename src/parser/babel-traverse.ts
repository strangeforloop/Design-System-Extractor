import { createRequire } from "node:module";
import type { TraverseOptions } from "@babel/traverse";
import type { Node } from "@babel/types";

const require = createRequire(import.meta.url);

type TraverseFn = (
  parent: Node,
  opts?: TraverseOptions,
  scope?: unknown,
  state?: unknown,
  parentPath?: unknown,
) => void;

/**
 * `@babel/traverse` is CommonJS; under `NodeNext` the default ESM import is not
 * reliably callable. `createRequire` yields the actual traverse function.
 */
export const traverse: TraverseFn = require("@babel/traverse").default;
