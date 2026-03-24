# Design System Extractor - Project Context

## What We're Building

A CLI tool that extracts design tokens from React codebases and generates production-ready token files with AI-powered semantic naming and gap analysis.

**Core Value Proposition:** Transforms weeks of manual design system work into hours. Works whether you're starting from scratch (extraction), have a partial theme (gap analysis), or have a complete theme (monitoring adoption).

**Target Users:** Senior frontend engineers at growth-stage startups (Series A-C) who need to establish or improve design system consistency.

## Architecture Overview

We use a **modular pipeline architecture** with clear separation of concerns:
```
CLI → Orchestrator → [Scanner → Parser → Clusterer → AI Namer → Scorer → Generator] → Output
                  → [Theme Detector → Comparator → Gap Analyzer] → Reports
```

**Design Patterns Used:**
- **Facade Pattern**: Orchestrator simplifies subsystem interactions
- **Strategy Pattern**: Pluggable extractors (ColorExtractor, SpacingExtractor, etc.)
- **Chain of Responsibility**: Confidence scoring with multiple heuristics
- **Adapter Pattern**: AI client wraps Anthropic API
- **Template Method**: Common clustering logic with specific distance calculations

## Three Core Workflows

### 1. Extract (analyze command)
```
Input: Codebase path
  ↓ Scanner: Find React files
  ↓ Parser: Extract design values (colors, spacing, typography)
  ↓ Clusterer: Group similar values
  ↓ AI: Generate semantic names
  ↓ Scorer: Calculate confidence (0-100)
  ↓ Generators: Create DTCG, CSS, JS, Figma formats
Output: design-tokens/ folder
```

### 2. Discovery (discover command)
```
Input: Codebase path
  ↓ Scanner: Find React files + theme files
  ↓ Theme Detector: Parse existing themes (JS objects, CSS vars, Tailwind)
  ↓ Parser: Extract actual usage values
  ↓ Comparator: Match usage vs theme
  ↓ Gap Analyzer: Find missing, unused, similar values
  ↓ Report: Generate actionable recommendations
Output: gap-analysis-report.json
```

### 3. Check (check command - CI integration)
```
Input: Codebase path + baseline
  ↓ Load: .design-system-baseline.json
  ↓ Extract: Current design values
  ↓ Compare: Current vs baseline
  ↓ Detect: New hardcoded values (violations)
Output: Exit 0 (pass) or 1 (fail) for CI
```

## Project Structure
```
design-system-extractor/
├─ CONTEXT.md              # This file - project context for Cursor
├─ src/
│  ├─ cli/                # CLI interface
│  │  ├─ index.ts         # Main entry point (commander setup)
│  │  ├─ commands/
│  │  │  ├─ analyze.ts    # Extract tokens workflow
│  │  │  ├─ discover.ts   # Gap analysis workflow
│  │  │  └─ check.ts      # CI monitoring workflow
│  │  └─ ui/
│  │     ├─ formatters.ts # Output formatting with chalk/boxen
│  │     └─ prompts.ts    # Interactive user prompts
│  │
│  ├─ core/
│  │  ├─ orchestrator.ts  # Main workflow coordinator
│  │  └─ types.ts         # Shared TypeScript interfaces
│  │
│  ├─ scanner/
│  │  ├─ file-scanner.ts     # Find React files (.tsx, .jsx)
│  │  └─ theme-detector.ts   # Detect existing themes
│  │
│  ├─ parser/
│  │  ├─ ast-parser.ts       # Babel AST parsing coordinator
│  │  ├─ theme-parser.ts     # Parse existing theme files
│  │  ├─ extractors/
│  │  │  ├─ color-extractor.ts      # Extract hex, rgb, hsl
│  │  │  ├─ spacing-extractor.ts    # Extract px, rem, em
│  │  │  └─ typography-extractor.ts # Extract font-size, weight
│  │  └─ index.ts
│  │
│  ├─ clustering/
│  │  ├─ color-clusterer.ts     # CIEDE2000 distance-based
│  │  ├─ spacing-clusterer.ts   # Threshold + grid detection
│  │  └─ consolidator.ts        # Merge similar values
│  │
│  ├─ ai/
│  │  ├─ client.ts           # Anthropic API wrapper
│  │  ├─ prompts.ts          # Prompt templates
│  │  ├─ semantic-namer.ts   # Generate semantic names
│  │  └─ validator.ts        # Validate AI responses
│  │
│  ├─ scoring/
│  │  ├─ confidence-scorer.ts  # Calculate 0-100 confidence
│  │  └─ heuristics.ts         # Scoring rules (frequency, consistency)
│  │
│  ├─ comparison/
│  │  ├─ theme-comparator.ts   # Compare usage vs theme
│  │  ├─ gap-analyzer.ts       # Find gaps and violations
│  │  └─ adoption-metrics.ts   # Calculate adoption rates
│  │
│  ├─ generators/
│  │  ├─ dtcg-generator.ts     # W3C DTCG format
│  │  ├─ css-generator.ts      # CSS custom properties
│  │  ├─ js-generator.ts       # JavaScript + TypeScript
│  │  ├─ figma-generator.ts    # Figma Variables format
│  │  └─ report-generator.ts   # Human-readable reports
│  │
│  ├─ storage/
│  │  ├─ cache.ts              # Cache ASTs and AI responses
│  │  └─ baseline-manager.ts   # Manage CI baselines
│  │
│  └─ utils/
│     ├─ logger.ts        # Logging utility
│     ├─ color-utils.ts   # Color manipulation helpers
│     └─ file-utils.ts    # File I/O helpers
│
├─ tests/
│  ├─ unit/              # Unit tests per module
│  ├─ integration/       # Cross-module integration tests
│  └─ fixtures/          # Sample codebases for testing
│
├─ examples/
│  ├─ sample-app/        # Example React app with hardcoded values
│  ├─ sample-theme/      # Example theme.js
│  └─ sample-output/     # Example generated tokens
│
├─ .github/
│  └─ workflows/         # CI examples for users
│
├─ package.json
├─ tsconfig.json
├─ .env.example
└─ README.md
```

## Key Data Types
```typescript
// ============================================
// Core Value Representation
// ============================================

interface DesignValue {
  type: 'color' | 'spacing' | 'typography';
  value: string;           // '#3B82F6', '16px', '500', etc.
  file: string;            // Absolute path to file
  line: number;            // Line number in file
  context: string;         // CSS property: 'background', 'padding', etc.
  occurrences: number;     // How many times this exact value appears
}

interface UsageLocation {
  file: string;
  line: number;
  context: string;         // CSS property or component context
  snippet: string;         // Code snippet for reference
}

// ============================================
// After Clustering
// ============================================

interface Cluster {
  representative: string;    // Most common value (e.g., '#3B82F6')
  variations: string[];      // Similar values grouped ['#3B82F6', '#3B83F6']
  totalOccurrences: number;  // Sum across all variations
  usedIn: string[];          // File paths
  category: 'color' | 'spacing' | 'typography';
}

// ============================================
// After AI Naming
// ============================================

interface NamedToken {
  name: string;              // Semantic name: 'colors.interactive.primary'
  value: string;             // Actual value: '#3B82F6'
  category: string;          // 'colors', 'spacing', 'typography'
  usageLocations: UsageLocation[];
  aiReasoning: string;       // Why AI chose this name
}

// ============================================
// After Confidence Scoring
// ============================================

interface ScoredToken extends NamedToken {
  confidence: number;        // 0-100
  confidenceLevel: 'high' | 'medium' | 'low';  // high: 85+, medium: 60-84, low: <60
  confidenceReasons: string[];  // Human-readable reasoning
}

// ============================================
// Theme Detection & Comparison
// ============================================

interface Theme {
  colors: Record<string, string>;
  spacing: Record<string, string>;
  typography: Record<string, any>;
  sources: ThemeSource[];    // Where theme was found
}

interface ThemeSource {
  type: 'js-object' | 'css-vars' | 'tailwind' | 'tokens-json';
  file: string;
  content: any;
}

interface ComparisonResult {
  adoption: {
    usingTheme: UsageInstance[];      // Code uses theme values
    notUsingTheme: UsageInstance[];   // Hardcoded violations
  };
  gaps: {
    missingFromTheme: DesignValue[];  // In code, not in theme
    unusedInTheme: ThemeValue[];      // In theme, not in code
    similarValues: SimilarValue[];    // Possible typos
  };
  metrics: {
    adoptionRate: number;      // % of values using theme
    themeUtilization: number;  // % of theme being used
  };
}

interface GapAnalysisReport {
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
```

## Coding Standards

### Naming Conventions
```typescript
// Classes: PascalCase
class ColorExtractor { }
class ThemeComparator { }

// Functions and methods: camelCase
function extractColors() { }
async function parseFile() { }

// Constants: UPPER_SNAKE_CASE
const DEFAULT_THRESHOLD = 10;
const MAX_BATCH_SIZE = 10;

// Interfaces: PascalCase (no 'I' prefix)
interface DesignValue { }
interface Cluster { }

// Files: kebab-case
// color-extractor.ts
// theme-comparator.ts
```

### File Organization Rules

1. **One class per file**: `ColorExtractor.ts` exports only `ColorExtractor`
2. **Index files for clean imports**: Use `src/parser/index.ts` to export all parsers
3. **Types in separate file**: Shared types in `src/core/types.ts`
4. **Tests mirror source**: `src/parser/color-extractor.ts` → `tests/parser/color-extractor.test.ts`

### Error Handling Pattern (CRITICAL)

**ALWAYS use this pattern for operations that might fail:**
```typescript
async function parseFile(filePath: string): Promise<DesignValue[]> {
  try {
    const code = await fs.readFile(filePath, 'utf-8');
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    });
    return extractValues(ast, filePath);
  } catch (error) {
    logger.error(`Failed to parse ${filePath}:`, error.message);
    return []; // Return empty array, don't crash the whole process
  }
}
```

**Key principles:**
- ✅ Log the error with context (filename, operation)
- ✅ Return safe fallback (empty array, null, default value)
- ✅ Continue processing other files
- ❌ Never let one file error crash the entire tool

### Logging Pattern
```typescript
import { logger } from '../utils/logger';

// Use appropriate log levels
logger.debug('Detailed info for debugging');
logger.info('General info (file counts, progress)');
logger.warn('Potential issues but not failures');
logger.error('Actual errors with context');

// Good logging examples
logger.info(`Found ${files.length} React files`);
logger.debug(`Parsing ${filePath}`);
logger.warn(`No colors found in ${filePath}`);
logger.error(`Failed to parse ${filePath}: ${error.message}`);
```

### Testing Pattern

**Every module must have tests in `tests/[module-name]/`:**
```typescript
// tests/parser/color-extractor.test.ts

import { describe, it, expect } from 'vitest';
import { ColorExtractor } from '../../src/parser/extractors/color-extractor';
import { parse } from '@babel/parser';

describe('ColorExtractor', () => {
  const extractor = new ColorExtractor();
  
  it('extracts hex colors from styled-components', () => {
    const code = `
      const Button = styled.button\`
        background: #3B82F6;
      \`;
    `;
    
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    });
    
    const result = extractor.extract(ast, 'test.tsx');
    
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: 'color',
      value: '#3B82F6',
      file: 'test.tsx',
      line: expect.any(Number),
      context: 'background',
      occurrences: 1
    });
  });
  
  it('normalizes RGB to hex', () => {
    const code = `const color = 'rgb(59, 130, 246)';`;
    const ast = parse(code, { sourceType: 'module' });
    const result = extractor.extract(ast, 'test.tsx');
    
    expect(result[0].value).toBe('#3B82F6');
  });
  
  it('ignores non-color strings', () => {
    const code = `const text = "#not-a-color";`;
    const ast = parse(code, { sourceType: 'module' });
    const result = extractor.extract(ast, 'test.tsx');
    
    expect(result).toHaveLength(0);
  });
});
```

**Testing layers:**
1. **Unit tests**: Test individual methods in isolation
2. **Integration tests**: Test modules working together
3. **E2E tests**: Test full CLI commands
4. **Fixtures**: Use real sample code in `tests/fixtures/`

### Module Template

**Use this template for every new module:**
```typescript
// src/[category]/[module-name].ts

import { logger } from '../utils/logger';
import { DesignValue } from '../core/types';

/**
 * [Brief description of what this module does]
 * 
 * Example:
 * ```typescript
 * const scanner = new FileScanner();
 * const files = await scanner.findReactFiles('./src');
 * ```
 */
export class ModuleName {
  private dependency: Dependency;
  
  constructor(config?: Config) {
    this.dependency = new Dependency(config);
    logger.debug('ModuleName initialized');
  }
  
  /**
   * [Method description]
   * @param input - [Parameter description]
   * @returns [Return value description]
   */
  async process(input: Input): Promise<Output> {
    logger.debug('Processing started', { input });
    
    try {
      const result = await this.doWork(input);
      logger.debug('Processing complete', { resultCount: result.length });
      return result;
    } catch (error) {
      logger.error('Processing failed:', error);
      throw error; // Only throw if caller should handle it
    }
  }
  
  private async doWork(input: Input): Promise<Output> {
    // Implementation details
  }
}
```

### Extractor Interface

**All extractors MUST implement this interface:**
```typescript
// src/parser/extractors/types.ts

export interface Extractor {
  extract(ast: AST, filePath: string): DesignValue[];
}
```

This ensures:
- ColorExtractor, SpacingExtractor, TypographyExtractor all have same signature
- Easy to add new extractors (BorderRadiusExtractor, ShadowExtractor)
- ASTParser can loop through extractors uniformly

## CLI Output Standards

### Progress Indicators
```typescript
import ora from 'ora';
import cliProgress from 'cli-progress';

// Use ora for operations (indeterminate)
const spinner = ora('Scanning files...').start();
// ... do work
spinner.succeed('Found 87 files');

// Use cli-progress for file processing (determinate)
const bar = new cliProgress.SingleBar({
  format: 'Parsing [{bar}] {percentage}% | {value}/{total} files',
  barCompleteChar: '█',
  barIncompleteChar: '░',
});

bar.start(files.length, 0);
for (const file of files) {
  await parseFile(file);
  bar.increment();
}
bar.stop();
```

### Output Formatting
```typescript
import chalk from 'chalk';
import boxen from 'boxen';
import Table from 'cli-table3';

// Title boxes
console.log(boxen('Design System Extractor', {
  padding: 1,
  borderColor: 'cyan',
  borderStyle: 'round'
}));

// Color-coded messages
console.log(chalk.green('✓'), 'Success message');
console.log(chalk.yellow('⚠'), 'Warning message');
console.log(chalk.red('✗'), 'Error message');
console.log(chalk.blue('ℹ'), 'Info message');

// Tables for data
const table = new Table({
  head: ['Category', 'Count', 'Confidence'],
  colWidths: [15, 10, 15]
});

table.push(
  ['Colors', '32', chalk.green('89%')],
  ['Spacing', '15', chalk.green('94%')],
  ['Typography', '8', chalk.green('91%')]
);

console.log(table.toString());
```

## Performance & Caching

### What to Cache
```typescript
// ✅ Cache these (expensive operations)
- Parsed ASTs (keyed by file hash)
- AI responses (keyed by cluster hash)
- Color distance calculations
- File metadata (size, hash)

// ❌ Don't cache these (always regenerate)
- Final tokens
- Confidence scores
- Reports
- Output files
```

### Caching Pattern
```typescript
// src/storage/cache.ts

import crypto from 'crypto';

export class Cache {
  private store = new Map<string, CacheEntry>();
  private ttl = 3600000; // 1 hour
  
  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    
    if (!entry) {
      logger.debug('Cache miss:', key);
      return null;
    }
    
    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      logger.debug('Cache expired:', key);
      this.store.delete(key);
      return null;
    }
    
    logger.debug('Cache hit:', key);
    return entry.value as T;
  }
  
  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, {
      value,
      timestamp: Date.now()
    });
    logger.debug('Cache set:', key);
  }
}

// Usage in parser
const cacheKey = `ast:${filePath}:${getFileHash(filePath)}`;
const cachedAST = await cache.get<AST>(cacheKey);

if (cachedAST) {
  return cachedAST;
}

const ast = await parseFile(filePath);
await cache.set(cacheKey, ast);
return ast;
```

### Parallel Processing
```typescript
// Process files in parallel batches
async function parseFiles(files: string[]): Promise<DesignValue[]> {
  const BATCH_SIZE = 10;
  const batches = chunk(files, BATCH_SIZE);
  
  const results = await Promise.all(
    batches.map(batch => 
      Promise.all(batch.map(file => parseFile(file)))
    )
  );
  
  return results.flat(2);
}
```

## AI Integration Details

### Batching Strategy
```typescript
// Process clusters in batches of 10 to optimize API calls
const BATCH_SIZE = 10;
const batches = chunk(clusters, BATCH_SIZE);

for (const batch of batches) {
  const named = await aiClient.generateNames(batch);
  results.push(...named);
  
  // Rate limiting: wait 1s between batches
  await delay(1000);
}
```

### Prompt Structure
```typescript
// src/ai/prompts.ts

export function buildNamingPrompt(clusters: Cluster[]): string {
  return `
You are a design system expert. Generate semantic names for design tokens.

CRITICAL RULES:
- Use semantic naming (purpose/role): "interactive.primary" NOT "blue500"
- Be consistent with naming patterns across all tokens
- Consider usage context when naming
- Use hierarchical structure: category.subcategory.variant

Examples of GOOD names:
✓ colors.interactive.primary (used for buttons, links)
✓ colors.text.body (used for body text)
✓ spacing.component.md (standard component padding)

Examples of BAD names:
✗ colors.blue500 (descriptive, not semantic)
✗ colors.prettyBlue (subjective)
✗ spacing.sixteen (describes value, not purpose)

Tokens to name:
${JSON.stringify(clusters.map(c => ({
  value: c.representative,
  occurrences: c.totalOccurrences,
  usedIn: c.usedIn,
  category: c.category
})), null, 2)}

Return ONLY valid JSON array with this structure:
[
  {
    "value": "#3B82F6",
    "name": "colors.interactive.primary",
    "reasoning": "Used for primary interactive elements (buttons, links) across 12 components"
  }
]

Do not include any markdown formatting or code blocks.
  `.trim();
}
```

## Confidence Scoring Heuristics

### Scoring Rules
```typescript
// Start at 100, apply adjustments

// Frequency heuristic
if (occurrences < 3) score -= 20;        // Low usage
if (occurrences > 10) score += 10;       // High usage

// Consistency heuristic  
const contexts = new Set(locations.map(l => l.context));
if (contexts.size === 1) score += 10;    // Single context (consistent)
if (contexts.size > 5) score -= 15;      // Many contexts (inconsistent)

// Similar values heuristic
const similarCount = findSimilarValues(value, allValues).length;
if (similarCount > 5) score -= 10;       // Many similar = uncertain

// Pattern heuristic
if (isMultipleOf(value, 8)) score += 10; // Follows 8px grid
if (isMultipleOf(value, 4)) score += 5;  // Follows 4px grid

// Categorization
// high: 85-100 → use immediately
// medium: 60-84 → quick review recommended  
// low: 0-59 → needs careful review
```

## Dependencies

### Core Functionality
```json
{
  "@babel/parser": "^7.23.0",      // AST parsing
  "@babel/traverse": "^7.23.0",    // AST traversal
  "@anthropic-ai/sdk": "^0.9.0",   // AI semantic naming
  "color": "^4.2.3",               // Color manipulation
  "color-diff": "^0.2.0",          // CIEDE2000 distance
  "fast-glob": "^3.3.2"            // Fast file finding
}
```

### CLI Interface
```json
{
  "commander": "^11.1.0",    // CLI framework
  "chalk": "^5.3.0",         // Terminal colors
  "ora": "^7.0.1",           // Spinners
  "boxen": "^7.1.1",         // Boxes
  "cli-table3": "^0.6.3",    // Tables
  "cli-progress": "^3.12.0", // Progress bars
  "enquirer": "^2.4.1"       // Interactive prompts
}
```

### Code Quality
```json
{
  "handlebars": "^4.7.8",    // Template engine for report generation
  "prettier": "^3.1.0"       // Code formatting for generated files
}
```

### Development
```json
{
  "typescript": "^5.3.0",
  "tsx": "^4.7.0",           // Run TypeScript directly
  "vitest": "^1.0.0",        // Testing framework
  "@types/node": "^20.10.0",
  "@types/babel__parser": "^7.1.1",
  "@types/babel__traverse": "^7.20.4"
}
```

## Environment Setup

### Environment Variables
```bash
# .env (don't commit this)
ANTHROPIC_API_KEY=sk-ant-...

# Optional
CACHE_DIR=.design-system-cache
DEBUG=true              # Enable verbose logging
LOG_LEVEL=debug         # debug | info | warn | error
```

### .env.example (commit this)
```bash
# Required
ANTHROPIC_API_KEY=your_api_key_here

# Optional
CACHE_DIR=.design-system-cache
DEBUG=false
LOG_LEVEL=info
```

## Common Commands
```bash
# Development
npm run dev analyze ./test-fixtures
npm run dev discover ./test-fixtures  
npm run dev check

# Testing
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # With coverage report
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only

# Build
npm run build              # Compile TypeScript
npm run lint               # ESLint
npm run format             # Prettier
npm run type-check         # TypeScript check without emit

# CLI (after npm link)
design-system-extractor analyze ./src
design-system-extractor discover ./src
design-system-extractor check
```

## Current Implementation Status

### ✅ Completed
*[Nothing yet - update as you build]*

### 🚧 In Progress
*[Update daily with what you're working on]*

### 📋 TODO
- [ ] Week 1: Core extraction + AI naming
  - [ ] Day 1: File scanner
  - [ ] Day 2: AST parsing + color extraction
  - [ ] Day 3: Spacing + typography extraction
  - [ ] Day 4: Clustering algorithm
  - [ ] Day 5: AI semantic naming
- [ ] Week 2: Discovery + CI
  - [ ] Day 6: Confidence scoring
  - [ ] Day 7: Output generation
  - [ ] Day 8: Theme detection
  - [ ] Day 9: Gap analysis
  - [ ] Day 10: CI integration
  - [ ] Day 11-12: Testing + docs
  - [ ] Day 13: Performance + caching
  - [ ] Day 14: Polish + package

## Design Decisions & Rationale

### Why Threshold-Based Clustering Over K-Means?
- Simpler and more predictable
- No need to pre-specify number of clusters
- Deterministic results (users get same output every time)
- Works well with perceptual distance metrics (CIEDE2000)

### Why CIEDE2000 for Color Distance?
- Perceptually accurate (matches human vision)
- Industry standard for color comparison
- Better than RGB Euclidean distance
- Detects similar colors humans would consider "the same"

### Why Batch AI Calls (10 clusters per request)?
- API rate limits
- Cost optimization
- Consistency (AI sees related tokens together)
- Balance between speed and context

### Why Cache ASTs but Not Final Tokens?
- AST parsing is expensive (2-3x slower than extracting)
- File content rarely changes during development
- Final tokens should always be fresh (might change scoring/naming logic)
- Cached by file hash (invalidates automatically on change)

### Why Multiple Output Formats?
- DTCG: Industry standard, tool interoperability
- CSS: Immediate use in web projects
- JavaScript: TypeScript support, IDE autocomplete
- Figma: Designer handoff, design-code sync

### Why Not Use ESLint/Stylelint?
- They enforce existing rules (we extract and create rules)
- They assume theme exists (we work with or without)
- We do discovery + monitoring (they only monitor)
- We provide AI-powered naming (they don't)

## Notes for Future Development

### Post-MVP Enhancements (Don't Build Now)
- [ ] Web dashboard with shadcn/ui (visual review interface)
- [ ] Full migration automation with codemods (auto-fix violations)
- [ ] Advanced CI (PR comments, auto-fix suggestions)
- [ ] Plugin system for custom extractors
- [ ] Support for Vue/Svelte (different AST parsing)
- [ ] Design system diff (compare versions over time)
- [ ] Integration with Storybook for previews

### Known Limitations (Acknowledge These)
- Only supports React (JSX/TSX)
- Only extracts from code (not Figma designs)
- AI naming requires manual review
- Cache is in-memory (doesn't persist across runs)
- No support for animations/transitions

### When to Ask Claude vs Cursor

**Ask Claude (claude.ai) for:**
- Architecture decisions before coding
- Explaining complex concepts
- Reviewing overall design
- Debugging logic errors
- Algorithm choices and tradeoffs
- Writing documentation

**Use Cursor for:**
- Writing code in your project
- Refactoring existing code
- Auto-completing based on codebase
- Quick fixes and syntax help
- Generating boilerplate
- Finding files/functions

### How to Use This Context

**In every Cursor prompt, reference this file:**
```
@CONTEXT.md Create ColorExtractor following our extractor 
interface pattern. Use the error handling pattern from 
context. Add tests following our testing pattern.
```

**Update this file as you build:**
- Move completed items from TODO to Completed
- Add implementation notes and learnings
- Update architecture if it changes
- Add new patterns you discover

---

## Quick Reference: Key Files
```
CONTEXT.md              # This file - read first
README.md               # User-facing documentation
src/core/types.ts       # All TypeScript interfaces
src/core/orchestrator.ts # Main workflow coordinator
tests/fixtures/         # Sample codebases for testing
.env.example            # Environment variables template
```

---

**Remember:** This is a living document. Update it as you build. Use it in every Cursor prompt with `@CONTEXT.md`.
```

---

**Save this as `CONTEXT.md` at your project root.**

Then for your first Cursor prompt:
```
@CONTEXT.md I've just created this context file for our 
design system extractor project. Please read it and confirm 
you understand:

1. The architecture (modular pipeline)
2. The three core workflows (extract, discover, check)
3. The coding standards (error handling, naming, testing)
4. The data types (DesignValue, Cluster, NamedToken, etc.)

Once confirmed, we'll start Day 1: implementing the file scanner.