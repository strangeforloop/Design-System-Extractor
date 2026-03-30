import Color from "color";
import { diff as colorDiff } from "color-diff";

import type { Cluster, DesignValue } from "../core/types.js";
import { logger } from "../utils/logger.js";

type LabColor = { L: number; a: number; b: number };

export class ColorClusterer {
  private threshold = 10;
  private minConfidence: number;

  constructor(minConfidence = 85) {
    this.minConfidence = minConfidence;
  }

  cluster(colors: DesignValue[]): Cluster[] {
    logger.debug(
      `Clustering ${colors.length} colors with threshold ${this.threshold}`,
    );

    const clusters: Cluster[] = [];

    for (const color of colors) {
      const lab = this.hexToLab(color.value);
      if (!lab) {
        logger.warn(`Skipping non-hex color during clustering: ${color.value}`);
        continue;
      }

      let foundCluster = false;
      for (const cluster of clusters) {
        const clusterLab = this.hexToLab(cluster.representative);
        if (!clusterLab) {
          continue;
        }
        const distance = colorDiff(lab, clusterLab);

        if (distance < this.threshold) {
          cluster.values.push(color);
          foundCluster = true;
          break;
        }
      }

      if (!foundCluster) {
        clusters.push({
          type: "color",
          representative: color.value,
          values: [color],
          confidence: 0,
          metadata: {
            colorSpace: "hex",
            labValue: { L: lab.L, a: lab.a, b: lab.b },
          },
        });
      }
    }

    const scoredClusters = clusters.map((cluster) => {
      const representative = this.pickRepresentative(cluster.values);
      const confidence = this.calculateConfidence(cluster.values, representative);
      const variations = this.buildVariations(cluster.values, representative);
      const repLab = this.hexToLab(representative);

      return {
        ...cluster,
        representative,
        confidence,
        metadata: {
          ...cluster.metadata,
          colorSpace: "hex" as const,
          labValue: repLab
            ? { L: repLab.L, a: repLab.a, b: repLab.b }
            : undefined,
          variations,
        },
      };
    });
    const finalClusters = scoredClusters.filter(
      (cluster) => cluster.confidence >= this.minConfidence,
    );

    logger.info(
      `Clustered ${colors.length} colors into ${finalClusters.length} high-confidence clusters (threshold >= ${this.minConfidence}%)`,
    );
    return finalClusters;
  }

  private hexToLab(hex: string): LabColor | null {
    try {
      const [L, a, b] = Color(hex).lab().array();
      return { L, a, b };
    } catch {
      return null;
    }
  }

  private getOccurrences(value: DesignValue): number {
    return value.occurrences ?? 1;
  }

  private pickRepresentative(values: DesignValue[]): string {
    const frequencyMap = new Map<string, number>();

    values.forEach((v) => {
      const count = frequencyMap.get(v.value) || 0;
      frequencyMap.set(v.value, count + this.getOccurrences(v));
    });

    let maxCount = 0;
    let representative = values[0]?.value ?? "";

    frequencyMap.forEach((count, value) => {
      if (count > maxCount) {
        maxCount = count;
        representative = value;
      }
    });

    logger.debug(
      `Picked representative color: ${representative} (${maxCount} occurrences)`,
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

