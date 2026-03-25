/**
 * A single design value produced by extractors from the AST.
 * Used as the shared output shape for all value-type extractors.
 */
export interface DesignValue {
  type: "color" | "spacing" | "typography";
  value: string;
  file: string;
  line: number;
  context: string;
}
