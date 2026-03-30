/**
 * A raw design value extracted from source code before clustering.
 * `occurrences` can be omitted for freshly extracted values and later filled
 * during aggregation/counting stages.
 */
export interface DesignValue {
  type: "color" | "spacing" | "typography";
  value: string;
  file: string;
  line: number;
  context: string;
  occurrences?: number;
}

/**
 * A concrete location where a token/value is used in code.
 * Used to attach file-level traceability to named and scored tokens.
 */
export interface UsageLocation {
  file: string;
  line: number;
  context: string;
  snippet: string;
}

export interface Cluster {
  type: "color" | "spacing" | "typography";
  representative: string;
  values: DesignValue[];
  confidence: number;
  metadata: {
    colorSpace?: "hex" | "rgb" | "oklch";
    labValue?: { L: number; a: number; b: number };
    unit?: "px" | "rem" | "em";
    gridPattern?: "4px" | "8px" | null;
    variations?: Array<{
      value: string;
      occurrences: number;
      files: string[];
    }>;
  };
}

/**
 * A semantically named token produced by the AI naming stage.
 * Used as the canonical token proposal before confidence scoring.
 */
export interface NamedToken {
  name: string;
  value: string;
  category: string;
  usageLocations: UsageLocation[];
  aiReasoning: string;
}

/**
 * A named token enriched with confidence metadata for review workflows.
 * Used to prioritize which generated tokens can be auto-accepted vs. reviewed.
 */
export interface ScoredToken extends NamedToken {
  confidence: number;
  confidenceLevel: "high" | "medium" | "low";
  confidenceReasons: string[];
}

/**
 * A detected or assembled theme model from one or more project sources.
 * Used as the baseline for adoption analysis and gap detection.
 */
export interface Theme {
  colors: Record<string, string>;
  spacing: Record<string, string>;
  typography: Record<string, unknown>;
  sources: ThemeSource[];
}

/**
 * A source artifact that contributed to the detected theme.
 * Used to explain provenance and support debugging of extracted theme values.
 */
export interface ThemeSource {
  type: "js-object" | "css-vars" | "tailwind" | "tokens-json";
  file: string;
  content: unknown;
}

/**
 * A potential duplicate/typo pair where two values are very close.
 * Used during gap analysis to flag likely normalization or naming issues.
 */
export interface SimilarValue {
  value: string;
  similarTo: string;
  similarityScore: number;
  occurrences?: number;
  locations?: UsageLocation[];
}

/**
 * A per-component summary of hardcoded values that bypass the theme.
 * Used to surface highest-impact migration targets.
 */
export interface ComponentViolation {
  component: string;
  count: number;
  values: DesignValue[];
}

/**
 * A value used in code but not currently represented in the theme.
 * Used to propose theme extensions based on real usage.
 */
export interface MissingValue {
  value: string;
  category: "color" | "spacing" | "typography";
  occurrences: number;
  locations: UsageLocation[];
  suggestedTokenName?: string;
}

/**
 * A theme value that appears unused across the scanned codebase.
 * Used to identify cleanup candidates and stale token debt.
 */
export interface UnusedValue {
  tokenName: string;
  value: string;
  category: "color" | "spacing" | "typography";
}

/**
 * An actionable recommendation derived from adoption and gap metrics.
 * Used in final reporting to guide incremental migration work.
 */
export interface Recommendation {
  priority: "high" | "medium" | "low";
  action: string;
  rationale: string;
}

/**
 * A structured result comparing theme usage vs. hardcoded usage.
 * Used immediately after comparison to drive reporting and recommendations.
 */
export interface ComparisonResult {
  adoption: {
    usingTheme: UsageLocation[];
    notUsingTheme: UsageLocation[];
  };
  gaps: {
    missingFromTheme: DesignValue[];
    unusedInTheme: UnusedValue[];
    similarValues: SimilarValue[];
  };
  metrics: {
    adoptionRate: number;
    themeUtilization: number;
  };
}

/**
 * Final gap-analysis report produced at the end of the pipeline.
 * Used for developer-facing output, CI checks, and migration planning.
 */
export interface GapAnalysisReport {
  summary: {
    themeExists: boolean;
    themeSources: string[];
    adoptionRate: number;
    themeUtilization: number;
  };
  goodNews: {
    valuesUsingTheme: number;
    componentsFullyAdopted: string[];
  };
  violations: {
    hardcodedValues: DesignValue[];
    componentsWithViolations: ComponentViolation[];
  };
  gaps: {
    missingFromTheme: MissingValue[];
    unusedThemeValues: UnusedValue[];
    possibleTypos: SimilarValue[];
  };
  recommendations: Recommendation[];
}
