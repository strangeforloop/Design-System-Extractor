import type { Cluster, DesignValue } from "../core/types.js";
import { logger } from "../utils/logger.js";

export class SpacingClusterer {
  private threshold = 2;
  private minConfidence: number;
  private spacingTokenPattern = /-?\d+(?:\.\d+)?(?:px|rem|em|%)/gi;

  constructor(minConfidence = 85) {
    this.minConfidence = minConfidence;
  }

  cluster(spacingValues: DesignValue[]): Cluster[] {
    logger.debug(
      `Clustering ${spacingValues.length} spacing values with threshold ${this.threshold}px`,
    );

    const normalizedSpacingValues = spacingValues.flatMap((value) =>
      this.expandSpacingValue(value),
    );

    const clusters: Cluster[] = [];

    for (const spacing of normalizedSpacingValues) {
      const px = this.toPx(spacing.value);
      if (px === null) {
        logger.warn(`Skipping non-numeric spacing during clustering: ${spacing.value}`);
        continue;
      }

      let foundCluster = false;
      for (const cluster of clusters) {
        const clusterPx = this.toPx(cluster.representative);
        if (clusterPx === null) {
          continue;
        }
        const distance = Math.abs(px - clusterPx);
        if (distance <= this.threshold) {
          cluster.values.push(spacing);
          foundCluster = true;
          break;
        }
      }

      if (!foundCluster) {
        clusters.push({
          type: "spacing",
          representative: spacing.value,
          values: [spacing],
          confidence: 0,
          metadata: { unit: "px" },
        });
      }
    }

    const scoredClusters = clusters.map((cluster) => {
      const gridPattern = this.detectGridPattern(cluster.values);
      const representative = this.pickRepresentative(cluster.values, gridPattern);
      const confidence = this.calculateConfidence(cluster.values, representative);
      const variations = this.buildVariations(cluster.values, representative);

      return {
        ...cluster,
        representative,
        confidence,
        metadata: {
          unit: "px" as const,
          gridPattern,
          variations,
        },
      };
    });
    const finalClusters = scoredClusters.filter(
      (cluster) => cluster.confidence >= this.minConfidence,
    );

    logger.info(
      `Clustered ${normalizedSpacingValues.length} spacing tokens from ${spacingValues.length} values into ${finalClusters.length} high-confidence clusters (threshold >= ${this.minConfidence}%)`,
    );
    return finalClusters;
  }

  private expandSpacingValue(value: DesignValue): DesignValue[] {
    const matches = value.value.match(this.spacingTokenPattern);
    if (!matches || matches.length === 0) {
      logger.warn(`Skipping non-numeric spacing during clustering: ${value.value}`);
      return [];
    }

    return matches
      .map((token) => this.normalizeToken(token))
      .filter((token): token is string => token !== null)
      .map((token) => ({
        ...value,
        value: token,
      }));
  }

  private normalizeToken(token: string): string | null {
    const px = this.toPx(token);
    if (px === null) {
      return null;
    }

    if (token.trim().endsWith("%")) {
      return `${px}%`;
    }
    return `${px}px`;
  }

  private getOccurrences(value: DesignValue): number {
    return value.occurrences ?? 1;
  }

  private toPx(value: string): number | null {
    const match = value.trim().match(/^(-?\d+(?:\.\d+)?)(px|rem|em|%)?$/i);
    if (!match) {
      return null;
    }

    const n = parseFloat(match[1]);
    const unit = (match[2] ?? "px").toLowerCase();

    if (unit === "rem" || unit === "em") {
      return Math.round(n * 16);
    }
    if (unit === "%") {
      return Math.round(n);
    }
    return Math.round(n);
  }

  private pickRepresentative(
    values: DesignValue[],
    gridPattern: "4px" | "8px" | null,
  ): string {
    if (gridPattern) {
      const pxValues = values
        .map((v) => this.toPx(v.value))
        .filter((n): n is number => n !== null)
        .sort((a, b) => a - b);
      const median = pxValues[Math.floor(pxValues.length / 2)] ?? 0;
      const rounded = Math.round(median);
      logger.debug(
        `Using grid-aligned representative: ${rounded}px (${gridPattern} grid)`,
      );
      return `${rounded}px`;
    }

    return this.mostFrequent(values);
  }

  private detectGridPattern(values: DesignValue[]): "4px" | "8px" | null {
    const pxValues = values
      .map((v) => this.toPx(v.value))
      .filter((n): n is number => n !== null);

    if (pxValues.length === 0) {
      return null;
    }

    const onEightPxGrid = pxValues.every((px) => Math.round(px) % 8 === 0);
    if (onEightPxGrid) {
      logger.debug("Detected 8px grid pattern");
      return "8px";
    }

    const onFourPxGrid = pxValues.every((px) => Math.round(px) % 4 === 0);
    if (onFourPxGrid) {
      logger.debug("Detected 4px grid pattern");
      return "4px";
    }

    logger.debug("No grid pattern detected");
    return null;
  }

  private mostFrequent(values: DesignValue[]): string {
    const frequencyMap = new Map<string, number>();

    values.forEach((v) => {
      const count = frequencyMap.get(v.value) || 0;
      frequencyMap.set(v.value, count + this.getOccurrences(v));
    });

    let maxCount = 0;
    let representative = values[0]?.value ?? "0px";

    frequencyMap.forEach((count, value) => {
      if (count > maxCount) {
        maxCount = count;
        representative = value;
      }
    });

    logger.debug(
      `Using most frequent representative: ${representative} (${maxCount} occurrences)`,
    );
    return representative;
  }

  private calculateConfidence(values: DesignValue[], representative: string): number {
    const total = values.reduce((sum, v) => sum + this.getOccurrences(v), 0);
    if (total === 0) {
      return 0;
    }
    const representativeCount = values
      .filter((v) => v.value === representative)
      .reduce((sum, v) => sum + this.getOccurrences(v), 0);

    return Math.round((representativeCount / total) * 100);
  }

  private buildVariations(
    values: DesignValue[],
    representative: string,
  ): Array<{ value: string; occurrences: number; files: string[] }> {
    const variationMap = new Map<string, { occurrences: number; files: Set<string> }>();

    values
      .filter((v) => v.value !== representative)
      .forEach((v) => {
        const existing = variationMap.get(v.value) || {
          occurrences: 0,
          files: new Set<string>(),
        };
        existing.occurrences += this.getOccurrences(v);
        existing.files.add(v.file);
        variationMap.set(v.value, existing);
      });

    return Array.from(variationMap.entries()).map(([value, data]) => ({
      value,
      occurrences: data.occurrences,
      files: Array.from(data.files),
    }));
  }
}

